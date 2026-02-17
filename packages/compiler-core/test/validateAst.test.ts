import { describe, expect, it } from 'vitest';
import { validateCanonicalAst } from '../src/compile/validateAst';
import { SVJifErrorCode } from '../src/errors';
import type { CanonicalSceneAst } from '../src/types/ast';

function makeScene(overrides: Partial<CanonicalSceneAst['scene']> = {}): CanonicalSceneAst['scene'] {
  return { id: 'scene:test', width: 800, height: 600, ...overrides };
}

function makeAst(partial: Partial<CanonicalSceneAst> = {}): CanonicalSceneAst {
  return {
    kind: 'Scene',
    astVersion: '1',
    scene: makeScene(),
    nodes: [],
    ...partial,
  };
}

describe('validateCanonicalAst', () => {
  it('valid scene with no nodes → 0 diagnostics', () => {
    const ast = makeAst();
    expect(validateCanonicalAst(ast)).toHaveLength(0);
  });

  it('width=0 → E_SCENE_DIMENSIONS_INVALID', () => {
    const ast = makeAst({ scene: makeScene({ width: 0 }) });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_SCENE_DIMENSIONS_INVALID)).toBe(true);
  });

  it('height=-1 → E_SCENE_DIMENSIONS_INVALID', () => {
    const ast = makeAst({ scene: makeScene({ height: -1 }) });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_SCENE_DIMENSIONS_INVALID)).toBe(true);
  });

  it('unknown node kind → E_NODE_KIND_INVALID', () => {
    const ast = makeAst({
      nodes: [{ id: 'n1', kind: 'Widget' as any, props: {} }],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_NODE_KIND_INVALID)).toBe(true);
  });

  it('duplicate node IDs → E_NODE_DUPLICATE_ID', () => {
    const ast = makeAst({
      nodes: [
        { id: 'n1', kind: 'Rect', props: { width: 10, height: 10 } },
        { id: 'n1', kind: 'Rect', props: { width: 20, height: 20 } },
      ],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_NODE_DUPLICATE_ID)).toBe(true);
  });

  it('parentId pointing to nonexistent node → E_PARENT_NOT_FOUND', () => {
    const ast = makeAst({
      nodes: [{ id: 'n1', kind: 'Rect', props: { width: 10, height: 10 }, parentId: 'ghost' }],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_PARENT_NOT_FOUND)).toBe(true);
  });

  it('binding with bad targetNodeId → E_BIND_TARGET_NOT_FOUND', () => {
    const ast = makeAst({
      nodes: [],
      bindings: [
        { id: 'b1', targetNodeId: 'nobody', targetProp: 'x', expression: '0' },
      ],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_BIND_TARGET_NOT_FOUND)).toBe(true);
  });

  it('cycle A→B→A → E_CYCLE_DETECTED', () => {
    const ast = makeAst({
      nodes: [
        { id: 'A', kind: 'Group', props: {}, parentId: 'B' },
        { id: 'B', kind: 'Group', props: {}, parentId: 'A' },
      ],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_CYCLE_DETECTED)).toBe(true);
  });

  it('cycle suppresses Tier 2 requiredProps', () => {
    // Nodes in a cycle AND missing required props — only cycle should be reported
    const ast = makeAst({
      nodes: [
        // Rect without width/height, but in a cycle
        { id: 'A', kind: 'Rect', props: {}, parentId: 'B' },
        { id: 'B', kind: 'Group', props: {}, parentId: 'A' },
      ],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_CYCLE_DETECTED)).toBe(true);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_PROP_REQUIRED_MISSING)).toBe(false);
  });

  it('Rect missing width → E_PROP_REQUIRED_MISSING', () => {
    const ast = makeAst({
      nodes: [{ id: 'n1', kind: 'Rect', props: { height: 10 } }],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_PROP_REQUIRED_MISSING && (d.details as any)?.prop === 'width')).toBe(true);
  });

  it('Text missing content → E_PROP_REQUIRED_MISSING', () => {
    const ast = makeAst({
      nodes: [{ id: 'n1', kind: 'Text', props: {} }],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_PROP_REQUIRED_MISSING)).toBe(true);
  });

  it('Image missing src → E_PROP_REQUIRED_MISSING', () => {
    const ast = makeAst({
      nodes: [{ id: 'n1', kind: 'Image', props: {} }],
    });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_PROP_REQUIRED_MISSING)).toBe(true);
  });

  it('valid Rect with all required props → 0 errors', () => {
    const ast = makeAst({
      nodes: [{ id: 'n1', kind: 'Rect', props: { width: 10, height: 10 } }],
    });
    expect(validateCanonicalAst(ast)).toHaveLength(0);
  });

  it('deep spiral (10k nodes, linear chain) — no stack overflow', () => {
    const nodes: CanonicalSceneAst['nodes'] = [];
    for (let i = 0; i < 10_000; i++) {
      nodes.push({
        id: `n${i}`,
        kind: 'Group',
        props: {},
        parentId: i > 0 ? `n${i - 1}` : undefined,
      });
    }
    const ast = makeAst({ nodes });
    // Linear chain — no cycle
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_CYCLE_DETECTED)).toBe(false);
  });

  it('deep spiral with cycle at tip — E_CYCLE_DETECTED', () => {
    const nodes: CanonicalSceneAst['nodes'] = [];
    for (let i = 0; i < 10_000; i++) {
      nodes.push({
        id: `n${i}`,
        kind: 'Group',
        props: {},
        parentId: i > 0 ? `n${i - 1}` : `n${9999}`, // n0 points back to n9999
      });
    }
    const ast = makeAst({ nodes });
    const diags = validateCanonicalAst(ast);
    expect(diags.some((d) => d.code === SVJifErrorCode.E_CYCLE_DETECTED)).toBe(true);
  });
});
