import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compile } from '@svjif/compiler-core';
import { graphqlToCanonicalAst } from '../src/index';
import type { CompilerInput, ParseInputDeps } from '@svjif/compiler-core';

const TERMINAL_SDL = `
type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
  bg: String @svjif_node(kind: Rect, x: 0, y: 0, width: 800, height: 600, props: "{\\"fill\\":\\"#1a1a1a\\"}")
  header: String @svjif_node(kind: Rect, x: 0, y: 0, width: 800, height: 40, props: "{\\"fill\\":\\"#2a2a2a\\"}")
  title: String @svjif_node(kind: Text, x: 20, y: 10, props: "{\\"content\\":\\"Terminal v0.3\\",\\"color\\":\\"#00ff00\\"}")
}
`;

// Whitespace variant: same semantics, different formatting
const TERMINAL_SDL_WHITESPACE = `

  type   Terminal   @svjif_scene( v:  "1" ,  width:  800 ,  height:  600  )  {
    bg :   String   @svjif_node(  kind:  Rect ,  x:  0 ,  y:  0  ,  width:  800  ,  height:  600  ,  props:  "{\\"fill\\":\\"#1a1a1a\\"}"  )
    header   :  String  @svjif_node(  kind:  Rect  ,  x:  0,  y:  0  ,  width:  800  ,  height:  40  ,  props:  "{\\"fill\\":\\"#2a2a2a\\"}"  )
    title  :  String  @svjif_node(  kind:  Text  ,  x:  20  ,  y:  10  ,  props:  "{\\"content\\":\\"Terminal v0.3\\",\\"color\\":\\"#00ff00\\"}"  )
  }

`;

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

const DEPS: ParseInputDeps = { graphqlToCanonicalAst };

function makeInput(sdl: string, filename = 'terminal.graphql'): CompilerInput {
  return {
    format: 'graphql-sdl',
    source: sdl,
    filename,
    options: {
      target: 'svjif-ir-v1',
      emit: { irJson: true, tsTypes: true },
      strict: true,
      failOnWarnings: false,
      canonicalize: true,
    },
  };
}

describe('e2e: Terminal SDL fixture', () => {
  it('compiles without errors', async () => {
    const result = await compile(makeInput(TERMINAL_SDL), DEPS);
    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
  });

  it('IR nodes match expected kinds', async () => {
    const result = await compile(makeInput(TERMINAL_SDL), DEPS);

    expect(result.ok).toBe(true);
    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));

    expect(ir.irVersion).toBe('svjif-ir/1');
    expect(ir.nodes).toHaveLength(3);

    const kinds = ir.nodes.map((n: { kind: string }) => n.kind);
    expect(kinds).toContain('Rect');
    expect(kinds).toContain('Text');
  });

  it('IR nodes have correct props', async () => {
    const result = await compile(makeInput(TERMINAL_SDL), DEPS);

    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));

    const bgNode = ir.nodes.find((n: any) => n.props?.fill === '#1a1a1a');
    expect(bgNode).toBeDefined();
    expect(bgNode.kind).toBe('Rect');

    const titleNode = ir.nodes.find((n: any) => n.props?.content === 'Terminal v0.3');
    expect(titleNode).toBeDefined();
    expect(titleNode.kind).toBe('Text');
    expect(titleNode.props.color).toBe('#00ff00');
  });

  it('compiles to identical IR bytes on two consecutive runs (determinism)', async () => {
    const r1 = await compile(makeInput(TERMINAL_SDL, 'run1.graphql'), DEPS);
    const r2 = await compile(makeInput(TERMINAL_SDL, 'run1.graphql'), DEPS);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    const ir1 = String(r1.artifacts['scene.svjif.json'].content);
    const ir2 = String(r2.artifacts['scene.svjif.json'].content);

    expect(ir1).toBe(ir2);
  });

  it('whitespace variant produces identical IR hash', async () => {
    const r1 = await compile(makeInput(TERMINAL_SDL, 'canonical.graphql'), DEPS);
    const r2 = await compile(makeInput(TERMINAL_SDL_WHITESPACE, 'canonical.graphql'), DEPS);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    const ir1 = String(r1.artifacts['scene.svjif.json'].content);
    const ir2 = String(r2.artifacts['scene.svjif.json'].content);

    expect(sha256(ir1)).toBe(sha256(ir2));
  });

  it('IR has scene with correct dimensions', async () => {
    const result = await compile(makeInput(TERMINAL_SDL), DEPS);

    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));
    expect(ir.scene.width).toBe(800);
    expect(ir.scene.height).toBe(600);
    expect(ir.scene.units).toBe('px');
  });

  it('metadata contains hashAlgorithm', async () => {
    const result = await compile(makeInput(TERMINAL_SDL), DEPS);
    expect(result.metadata.hashAlgorithm).toBe('sha256');
  });

  it('nodes are sorted by zIndex in the IR output', async () => {
    const result = await compile(makeInput(TERMINAL_SDL), DEPS);

    const ir = JSON.parse(String(result.artifacts['scene.svjif.json'].content));
    const zIndices = ir.nodes.map((n: { zIndex: number }) => n.zIndex);
    expect(zIndices).toEqual([...zIndices].sort((a: number, b: number) => a - b));
  });
});
