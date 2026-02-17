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
    deterministicIds: true,
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

    expect(sha256(ir1)).toBe(sha256(ir2));
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
            props: { x: 10, y: 10, width: 50, height: 50, fill: '#red' },
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
});
