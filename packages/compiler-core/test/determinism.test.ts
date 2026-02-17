import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/compile/compile';
import type { CompilerInput } from '../src/types';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

const BASE_INPUT: CompilerInput = {
  format: 'canonical-ast-json',
  source: JSON.stringify({
    kind: 'Scene',
    astVersion: '1',
    scene: {
      id: 'scene:determinism-test',
      width: 640,
      height: 480,
      units: 'px',
    },
    nodes: [
      {
        id: 'node:bg',
        kind: 'Rect',
        props: { x: 0, y: 0, width: 640, height: 480, fill: '#000000' },
        zIndex: 1,
        visible: true,
      },
      {
        id: 'node:label',
        kind: 'Text',
        props: { x: 10, y: 10, content: 'Hello', color: '#ffffff' },
        zIndex: 2,
        visible: true,
      },
    ],
    metadata: { sourceFormat: 'canonical-ast-json' },
  }),
  filename: 'fixtures/determinism.json',
  options: {
    target: 'svjif-ir-v1',
    emit: { irJson: true, tsTypes: false },
    strict: true,
    failOnWarnings: false,
    canonicalize: true,
  },
};

describe('determinism', () => {
  it('compiling the same canonical JSON twice produces identical IR bytes', async () => {
    const result1 = await compile(BASE_INPUT);
    const result2 = await compile(BASE_INPUT);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    const ir1 = String(result1.artifacts['scene.svjif.json'].content);
    const ir2 = String(result2.artifacts['scene.svjif.json'].content);

    expect(ir1).toBe(ir2);
  });

  it('whitespace/formatting variation in JSON input produces identical IR', async () => {
    const canonical = {
      kind: 'Scene',
      astVersion: '1',
      scene: {
        id: 'scene:whitespace-test',
        width: 400,
        height: 300,
        units: 'px',
      },
      nodes: [
        {
          id: 'node:a',
          kind: 'Rect',
          props: { x: 0, y: 0, width: 400, height: 300, fill: '#ff0000' },
          zIndex: 1,
          visible: true,
        },
      ],
      metadata: { sourceFormat: 'canonical-ast-json' },
    };

    // Compact JSON
    const compact: CompilerInput = {
      ...BASE_INPUT,
      source: JSON.stringify(canonical),
      filename: 'compact.json',
    };

    // Pretty-printed JSON with extra whitespace
    const pretty: CompilerInput = {
      ...BASE_INPUT,
      source: JSON.stringify(canonical, null, 4),
      filename: 'pretty.json',
    };

    const r1 = await compile(compact);
    const r2 = await compile(pretty);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    const ir1 = String(r1.artifacts['scene.svjif.json'].content);
    const ir2 = String(r2.artifacts['scene.svjif.json'].content);

    expect(sha256(ir1)).toBe(sha256(ir2));
  });

  it('node ordering in IR is deterministic (zIndex asc, then id asc)', async () => {
    const withReversedNodes: CompilerInput = {
      ...BASE_INPUT,
      source: JSON.stringify({
        kind: 'Scene',
        astVersion: '1',
        scene: {
          id: 'scene:order-test',
          width: 100,
          height: 100,
          units: 'px',
        },
        // Nodes in reverse zIndex order in the input
        nodes: [
          {
            id: 'node:z3',
            kind: 'Text',
            props: { x: 0, y: 0, content: 'z3', color: '#fff' },
            zIndex: 3,
            visible: true,
          },
          {
            id: 'node:z1',
            kind: 'Rect',
            props: { x: 0, y: 0, width: 100, height: 100, fill: '#000' },
            zIndex: 1,
            visible: true,
          },
          {
            id: 'node:z2',
            kind: 'Rect',
            props: { x: 10, y: 10, width: 50, height: 50, fill: '#ff0000' },
            zIndex: 2,
            visible: true,
          },
        ],
        metadata: { sourceFormat: 'canonical-ast-json' },
      }),
    };

    const result = await compile(withReversedNodes);
    expect(result.ok).toBe(true);

    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));
    expect(ir.nodes.map((n: { id: string }) => n.id)).toEqual(['node:z1', 'node:z2', 'node:z3']);
  });

  it('4 distinct rotated node orderings of the same scene → identical IR hashes', async () => {
    const baseNodes = [
      { id: 'n:a', kind: 'Rect', props: { x: 0, y: 0, width: 10, height: 10, fill: '#f00' }, zIndex: 2, visible: true },
      { id: 'n:b', kind: 'Text', props: { x: 0, y: 0, content: 'B', color: '#fff' }, zIndex: 1, visible: true },
      { id: 'n:c', kind: 'Group', props: { x: 0, y: 0 }, zIndex: 3, visible: true },
      { id: 'n:d', kind: 'Rect', props: { x: 5, y: 5, width: 5, height: 5, fill: '#00f' }, zIndex: 2, visible: true },
    ];

    function makeInput(nodes: typeof baseNodes): CompilerInput {
      return {
        ...BASE_INPUT,
        source: JSON.stringify({
          kind: 'Scene',
          astVersion: '1',
          scene: { id: 'scene:shuffle', width: 100, height: 100, units: 'px' },
          nodes,
          metadata: { sourceFormat: 'canonical-ast-json' },
        }),
      };
    }

    // Generate 4 distinct rotations (seeded.length === 4, so s % 4 yields 4 unique offsets)
    const shuffles: (typeof baseNodes)[] = [];
    const seeded = [...baseNodes];
    for (let s = 0; s < seeded.length; s++) {
      const rotated = [...seeded.slice(s), ...seeded.slice(0, s)];
      shuffles.push(rotated);
    }

    const hashes = new Set<string>();
    for (const shuffle of shuffles) {
      const result = await compile(makeInput(shuffle));
      expect(result.ok).toBe(true);
      const ir = String(result.artifacts['scene.svjif.json'].content);
      hashes.add(sha256(ir));
    }

    expect(hashes.size).toBe(1);
  });

  it('parent-before-child ordering guaranteed in output', async () => {
    const input: CompilerInput = {
      ...BASE_INPUT,
      source: JSON.stringify({
        kind: 'Scene',
        astVersion: '1',
        scene: { id: 'scene:parent-child', width: 100, height: 100 },
        // Child listed before parent in input
        nodes: [
          { id: 'child', kind: 'Rect', props: { x: 0, y: 0, width: 10, height: 10 }, zIndex: 1, parentId: 'parent' },
          { id: 'parent', kind: 'Group', props: { x: 0, y: 0 }, zIndex: 1 },
        ],
        metadata: { sourceFormat: 'canonical-ast-json' },
      }),
    };

    const result = await compile(input);
    expect(result.ok).toBe(true);

    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));
    const ids: string[] = ir.nodes.map((n: { id: string }) => n.id);
    expect(ids.indexOf('parent')).toBeLessThan(ids.indexOf('child'));
  });

  it('tie-breaking: two same-zIndex same-kind nodes sorted by id bytewise', async () => {
    const input: CompilerInput = {
      ...BASE_INPUT,
      source: JSON.stringify({
        kind: 'Scene',
        astVersion: '1',
        scene: { id: 'scene:tiebreak', width: 100, height: 100 },
        // 'n:z' > 'n:a' bytewise, so 'n:a' should come first
        nodes: [
          { id: 'n:z', kind: 'Group', props: {}, zIndex: 1 },
          { id: 'n:a', kind: 'Group', props: {}, zIndex: 1 },
        ],
        metadata: { sourceFormat: 'canonical-ast-json' },
      }),
    };

    const result = await compile(input);
    expect(result.ok).toBe(true);

    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));
    expect(ir.nodes.map((n: { id: string }) => n.id)).toEqual(['n:a', 'n:z']);
  });
});
