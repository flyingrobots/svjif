import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '@svjif/compiler-core';
import { deterministicId } from '@svjif/compiler-core';
import { parseGraphql } from '../src/parse/parseGraphql';
import { extractScene } from '../src/parse/extractScene';
import { extractNodes } from '../src/parse/extractNodes';
import { toCanonicalAst } from '../src/transform/toCanonicalAst';

function compile(sdl: string, filename = 'test.graphql') {
  const diag: Diagnostic[] = [];
  const doc = parseGraphql(sdl, filename);
  const scene = extractScene(doc, diag, filename);
  if (!scene) throw new Error('scene extraction failed: ' + diag.map((d) => d.message).join(', '));
  const nodes = extractNodes(scene, diag, filename);
  const ast = toCanonicalAst(scene, nodes, filename);
  return { ast, diag };
}

describe('toCanonicalAst', () => {
  it('produces valid CanonicalSceneAst shape', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
        bg: String @svjif_node(kind: Rect, x: 0, y: 0, width: 800, height: 600)
      }
    `);

    expect(ast.kind).toBe('Scene');
    expect(ast.astVersion).toBe('1');
    expect(ast.scene.width).toBe(800);
    expect(ast.scene.height).toBe(600);
    expect(ast.scene.units).toBe('px');
    expect(Array.isArray(ast.nodes)).toBe(true);
    expect(ast.nodes).toHaveLength(1);
  });

  it('scene id uses deterministicId', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) { _: String }
    `);
    const expectedId = deterministicId('scene', 'Terminal');
    expect(ast.scene.id).toBe(expectedId);
    expect(ast.scene.id).toMatch(/^scene_[0-9a-f]{64}$/);
  });

  it('node id uses deterministicId(node, sceneName, fieldName)', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
        bg: String @svjif_node(kind: Rect, x: 0, y: 0)
      }
    `);
    const expectedId = deterministicId('node', 'Terminal', 'bg');
    expect(ast.nodes[0].id).toBe(expectedId);
    expect(ast.nodes[0].id).toMatch(/^node_[0-9a-f]{64}$/);
  });

  it('explicit id overrides deterministicId', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
        bg: String @svjif_node(kind: Rect, x: 0, y: 0, id: "my-custom-id")
      }
    `);
    expect(ast.nodes[0].id).toBe('my-custom-id');
  });

  it('visible defaults to true when not specified', () => {
    const { ast } = compile(`
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0)
      }
    `);
    expect(ast.nodes[0].visible).toBe(true);
  });

  it('explicit visible: false is preserved', () => {
    const { ast } = compile(`
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0, visible: false)
      }
    `);
    expect(ast.nodes[0].visible).toBe(false);
  });

  it('zIndex defaults to fieldOrder + 1 when not specified', () => {
    const { ast } = compile(`
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        first: String @svjif_node(kind: Rect, x: 0, y: 0)
        second: String @svjif_node(kind: Text, x: 10, y: 10)
      }
    `);
    expect(ast.nodes[0].zIndex).toBe(1);
    expect(ast.nodes[1].zIndex).toBe(2);
  });

  it('explicit zIndex overrides field order', () => {
    const { ast } = compile(`
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0, zIndex: 99)
      }
    `);
    expect(ast.nodes[0].zIndex).toBe(99);
  });

  it('props from JSON arg are merged into node props with geometry', () => {
    const { ast } = compile(`
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 5, y: 10, width: 50, height: 30, props: "{\\"fill\\":\\"#ff0000\\"}")
      }
    `);
    const props = ast.nodes[0].props as Record<string, unknown>;
    expect(props['fill']).toBe('#ff0000');
    expect(props['x']).toBe(5);
    expect(props['y']).toBe(10);
    expect(props['width']).toBe(50);
    expect(props['height']).toBe(30);
  });

  it('metadata.sourceFormat is graphql-sdl', () => {
    const { ast } = compile(`
      type S @svjif_scene(v: "1", width: 100, height: 100) { _: String }
    `);
    expect(ast.metadata?.sourceFormat).toBe('graphql-sdl');
  });

  it('scene name uses typeName when not specified in directive', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) { _: String }
    `);
    expect(ast.scene.name).toBe('Terminal');
  });

  it('scene name uses name arg when specified', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600, name: "My Terminal") { _: String }
    `);
    expect(ast.scene.name).toBe('My Terminal');
  });

  it('node sourceRef is attached', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
        bg: String @svjif_node(kind: Rect, x: 0, y: 0)
      }
    `);
    expect(ast.nodes[0].sourceRef).toBeDefined();
    expect(ast.nodes[0].sourceRef?.file).toBe('test.graphql');
  });

  it('snapshot: terminal scene with 3 nodes', () => {
    const { ast } = compile(`
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
        bg: String @svjif_node(kind: Rect, x: 0, y: 0, width: 800, height: 600, props: "{\\"fill\\":\\"#1a1a1a\\"}")
        header: String @svjif_node(kind: Rect, x: 0, y: 0, width: 800, height: 40, props: "{\\"fill\\":\\"#2a2a2a\\"}")
        title: String @svjif_node(kind: Text, x: 20, y: 10, props: "{\\"content\\":\\"Terminal v0.3\\",\\"color\\":\\"#00ff00\\"}")
      }
    `);

    expect(ast.nodes).toHaveLength(3);
    expect(ast.nodes.map((n) => n.kind)).toEqual(['Rect', 'Rect', 'Text']);

    const bgProps = ast.nodes[0].props as Record<string, unknown>;
    expect(bgProps['fill']).toBe('#1a1a1a');

    const titleProps = ast.nodes[2].props as Record<string, unknown>;
    expect(titleProps['content']).toBe('Terminal v0.3');
    expect(titleProps['color']).toBe('#00ff00');
  });
});
