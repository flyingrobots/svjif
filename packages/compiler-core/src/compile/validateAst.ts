import type { CanonicalSceneAst, NodeKind } from '../types/ast';
import type { CompileOptions } from '../types/compiler';
import type { Diagnostic } from '../types/diagnostics';
import { SVJifErrorCode } from '../errors/codes';

const VALID_NODE_KINDS = new Set<string>([
  'Rect',
  'Text',
  'Image',
  'Group',
  'Line',
  'Ellipse',
  'Path',
] satisfies NodeKind[]);

const REQUIRED_PROPS: Partial<Record<NodeKind, string[]>> = {
  Rect: ['width', 'height'],
  Text: ['content'],
  Image: ['src'],
  Ellipse: ['rx', 'ry'],
  Line: ['x2', 'y2'],
  Path: ['d'],
};

// Exported for use in receipt fingerprint
export const VALIDATION_RULE_IDS = [
  'sceneDimensions',
  'nodeKindValid',
  'duplicateId',
  'danglingRef',
  'cycleDetection',
  'requiredProps',
];

export function validateCanonicalAst(
  ast: CanonicalSceneAst | undefined,
  _options?: CompileOptions,
): Diagnostic[] {
  if (!ast) return [];

  const diagnostics: Diagnostic[] = [];

  // ── Tier 1: Structural ────────────────────────────────────────────────────

  // 1. sceneDimensions
  if (ast.scene.width <= 0 || ast.scene.height <= 0) {
    diagnostics.push({
      code: SVJifErrorCode.E_SCENE_DIMENSIONS_INVALID,
      severity: 'error',
      message: `Scene width/height must be > 0 (got width=${ast.scene.width}, height=${ast.scene.height})`,
    });
  }

  // 2. nodeKindValid
  for (const node of ast.nodes) {
    if (!VALID_NODE_KINDS.has(node.kind)) {
      diagnostics.push({
        code: SVJifErrorCode.E_NODE_KIND_INVALID,
        severity: 'error',
        message: `Unknown node kind "${node.kind}" on node "${node.id}"`,
        details: { nodeId: node.id, kind: node.kind },
      });
    }
  }

  // 3. duplicateId
  const idSet = new Set<string>();
  for (const node of ast.nodes) {
    if (idSet.has(node.id)) {
      diagnostics.push({
        code: SVJifErrorCode.E_NODE_DUPLICATE_ID,
        severity: 'error',
        message: `Duplicate node id "${node.id}"`,
        details: { nodeId: node.id },
      });
    }
    idSet.add(node.id);
  }

  // Build id set for reference checks (use deduplicated set from above)
  const nodeIds = idSet;

  // 4. danglingRef — parentId, binding.targetNodeId, animation.targetNodeId
  for (const node of ast.nodes) {
    if (node.parentId !== undefined && !nodeIds.has(node.parentId)) {
      diagnostics.push({
        code: SVJifErrorCode.E_PARENT_NOT_FOUND,
        severity: 'error',
        message: `Node "${node.id}" has parentId "${node.parentId}" which does not exist`,
        details: { nodeId: node.id, parentId: node.parentId },
      });
    }
  }
  for (const binding of ast.bindings ?? []) {
    if (!nodeIds.has(binding.targetNodeId)) {
      diagnostics.push({
        code: SVJifErrorCode.E_BIND_TARGET_NOT_FOUND,
        severity: 'error',
        message: `Binding "${binding.id}" references non-existent node "${binding.targetNodeId}"`,
        details: { bindingId: binding.id, targetNodeId: binding.targetNodeId },
      });
    }
  }
  for (const anim of ast.animations ?? []) {
    if (!nodeIds.has(anim.targetNodeId)) {
      diagnostics.push({
        code: SVJifErrorCode.E_REF_TARGET_NOT_FOUND,
        severity: 'error',
        message: `Animation "${anim.id}" references non-existent node "${anim.targetNodeId}"`,
        details: { refKind: 'animation', animationId: anim.id, targetNodeId: anim.targetNodeId },
      });
    }
  }

  // 5. cycleDetection — iterative Kahn's on parentId DAG
  const cycleIds = detectCycles(ast);
  for (const nodeId of cycleIds) {
    diagnostics.push({
      code: SVJifErrorCode.E_CYCLE_DETECTED,
      severity: 'error',
      message: `Cycle detected involving node "${nodeId}"`,
      details: { nodeId },
    });
  }

  // ── Tier 2: Semantic (only if Tier 1 clean) ───────────────────────────────
  const tier1HasErrors = diagnostics.some((d) => d.severity === 'error');
  if (tier1HasErrors) {
    return diagnostics;
  }

  // 6. requiredProps
  for (const node of ast.nodes) {
    const required = REQUIRED_PROPS[node.kind as NodeKind];
    if (!required) continue;
    for (const prop of required) {
      if (!(prop in node.props) || node.props[prop] === undefined || node.props[prop] === null) {
        diagnostics.push({
          code: SVJifErrorCode.E_PROP_REQUIRED_MISSING,
          severity: 'error',
          message: `Node "${node.id}" (kind=${node.kind}) is missing required prop "${prop}"`,
          details: { nodeId: node.id, kind: node.kind, prop },
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Iterative Kahn's algorithm on the parentId DAG.
 * Returns the IDs of nodes that are part of a cycle (i.e., were never processed).
 */
function detectCycles(ast: CanonicalSceneAst): string[] {
  // inDegree[id] = number of children pointing to this node as parent
  // Actually: we do Kahn's on the parent→child direction.
  // edge: parentId → childId
  // in-degree of a node = number of parents it has (0 or 1 for a tree, but we handle multi-parent)

  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>(); // parent → children

  for (const node of ast.nodes) {
    if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
    if (!children.has(node.id)) children.set(node.id, []);
  }

  for (const node of ast.nodes) {
    if (node.parentId !== undefined && inDegree.has(node.parentId)) {
      // node.id has parentId as a parent; in-degree of node.id += 1
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
      const ch = children.get(node.parentId) ?? [];
      ch.push(node.id);
      children.set(node.parentId, ch);
    }
  }

  // Start with nodes that have no parents
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let processed = 0;
  let qi = 0;
  while (qi < queue.length) {
    const id = queue[qi++];
    processed++;
    for (const child of children.get(id) ?? []) {
      const newDeg = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  // Any node not processed is in a cycle
  if (processed === ast.nodes.length) return [];

  const cycleNodes: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg > 0) cycleNodes.push(id);
  }
  return cycleNodes;
}
