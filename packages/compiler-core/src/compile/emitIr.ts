import type { CanonicalSceneAst } from '../types/ast';
import type { CompilerInput } from '../types/compiler';
import type { Artifact } from '../types/artifacts';
import { stableStringify } from '../util/stableStringify';
import { hashString } from '../canonical/hashing';

export const COMPARATOR_VERSION = '1' as const;

/**
 * Phase 1: Topological sort by parentId DAG.
 * Phase 2: Tie-breaking at each step by (zIndex ASC, kind ASC, id ASC).
 *
 * Nodes without parentId are roots and enter the ready queue first.
 * sourceRef and __typename are stripped.
 */
export function emitSvjifIrArtifact(ast: CanonicalSceneAst): Artifact {
  const sorted = topoSort(ast);

  const content = stableStringify(
    {
      irVersion: 'svjif-ir/1',
      scene: ast.scene,
      nodes: sorted,
      bindings: ast.bindings ?? [],
      animations: ast.animations ?? [],
    },
    { space: 2 },
  );

  return {
    path: 'scene.svjif.json',
    content,
    mediaType: 'application/json',
    encoding: 'utf8',
  };
}

export function emitReceiptArtifact(
  input: CompilerInput,
  irContent: string,
  ruleIds: string[],
): Artifact {
  const inputHash = hashString(input.source);
  const rulesetFingerprint = hashString([...ruleIds].sort().join('\n'));

  const content = stableStringify(
    {
      comparatorVersion: COMPARATOR_VERSION,
      inputHash,
      irVersion: 'svjif-ir/1',
      rulesetFingerprint,
    },
    { space: 2 },
  );

  // irContent is accepted as a parameter but the receipt doesn't hash the IR itself —
  // the spec only calls for input hash + ruleset fingerprint. We keep the param
  // for future use (e.g. irHash) without using it now.
  void irContent;

  return {
    path: 'scene.svjif.json.receipt',
    content,
    mediaType: 'application/json',
    encoding: 'utf8',
  };
}

// ─── Internals ───────────────────────────────────────────────────────────────

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizeZIndex(z: number | undefined): number {
  return z ?? 0;
}

type SanitizedNode = Omit<CanonicalSceneAst['nodes'][number], 'sourceRef' | '__typename'>;

function sanitize(node: CanonicalSceneAst['nodes'][number]): SanitizedNode {
  const { sourceRef: _s, ...rest } = node as any;
  const { __typename: _t, ...clean } = rest as any;
  return clean as SanitizedNode;
}

function topoSort(ast: CanonicalSceneAst): SanitizedNode[] {
  const nodes = ast.nodes;
  if (nodes.length === 0) return [];

  // Build adjacency: parent → [children]
  const children = new Map<string, CanonicalSceneAst['nodes'][number][]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    if (!children.has(node.id)) children.set(node.id, []);
    if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
  }

  for (const node of nodes) {
    if (node.parentId !== undefined && children.has(node.parentId)) {
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
      children.get(node.parentId)!.push(node);
    }
  }

  // Initial ready queue: root nodes (in-degree 0), sorted by tie-breaker
  const ready: CanonicalSceneAst['nodes'][number][] = [];
  for (const node of nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      ready.push(node);
    }
  }
  sortReady(ready);

  const result: SanitizedNode[] = [];

  while (ready.length > 0) {
    const node = ready.shift()!;
    result.push(sanitize(node));

    // Sort children by tie-breaker before pushing
    const ch = [...(children.get(node.id) ?? [])];
    sortReady(ch);

    for (const child of ch) {
      const newDeg = (inDegree.get(child.id) ?? 0) - 1;
      inDegree.set(child.id, newDeg);
      if (newDeg === 0) {
        // Insert into ready in sorted position
        ready.push(child);
        sortReady(ready);
      }
    }
  }

  // Any nodes with remaining in-degree > 0 are in cycles — append sorted by tie-breaker
  const remaining: CanonicalSceneAst['nodes'][number][] = [];
  for (const node of nodes) {
    if ((inDegree.get(node.id) ?? 0) > 0) {
      remaining.push(node);
    }
  }
  sortReady(remaining);
  for (const node of remaining) {
    result.push(sanitize(node));
  }

  return result;
}

function sortReady(arr: CanonicalSceneAst['nodes'][number][]): void {
  arr.sort((a, b) => {
    const zDiff = normalizeZIndex(a.zIndex) - normalizeZIndex(b.zIndex);
    if (zDiff !== 0) return zDiff;
    const kindCmp = cmpStr(a.kind, b.kind);
    if (kindCmp !== 0) return kindCmp;
    return cmpStr(a.id, b.id);
  });
}
