import { describe, expect, it } from 'vitest';
import { SVJifErrorCode } from '@svjif/compiler-core';
import type { Diagnostic } from '@svjif/compiler-core';
import { parseGraphql } from '../src/parse/parseGraphql';
import { extractScene } from '../src/parse/extractScene';
import { extractNodes } from '../src/parse/extractNodes';

function parseAndExtract(sdl: string, diag: Diagnostic[] = []) {
  const doc = parseGraphql(sdl, 'test.graphql');
  const scene = extractScene(doc, diag, 'test.graphql');
  if (!scene) return { scene: undefined, nodes: [] };
  const nodes = extractNodes(scene, diag, 'test.graphql');
  return { scene, nodes };
}

describe('extractNodes (table-driven)', () => {
  it('extracts @svjif_node fields with geometry', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type Terminal @svjif_scene(v: "1", width: 800, height: 600) {
        bg: String @svjif_node(kind: Rect, x: 0, y: 0, width: 800, height: 600)
      }
    `,
      diag,
    );

    expect(diag.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(nodes).toHaveLength(1);
    const bg = nodes[0];
    expect(bg.fieldName).toBe('bg');
    expect(bg.kind).toBe('Rect');
    expect(bg.x).toBe(0);
    expect(bg.y).toBe(0);
    expect(bg.width).toBe(800);
    expect(bg.height).toBe(600);
  });

  it('extracts all valid node kinds', () => {
    for (const kind of ['Rect', 'Text', 'Image', 'Group', 'Line', 'Ellipse', 'Path']) {
      const diag: Diagnostic[] = [];
      const { nodes } = parseAndExtract(
        `type S @svjif_scene(v: "1", width: 100, height: 100) {
          n: String @svjif_node(kind: ${kind}, x: 0, y: 0)
        }`,
        diag,
      );
      expect(diag.filter((d) => d.severity === 'error')).toHaveLength(0);
      expect(nodes[0].kind).toBe(kind);
    }
  });

  it('invalid kind → SVJIF_E_NODE_KIND_INVALID and field is skipped', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: InvalidKind, x: 0, y: 0)
      }
    `,
      diag,
    );

    expect(nodes).toHaveLength(0);
    expect(diag.map((d) => d.code)).toContain(SVJifErrorCode.E_NODE_KIND_INVALID);
  });

  it('fields without @svjif_node are ignored', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        withNode: String @svjif_node(kind: Rect, x: 0, y: 0)
        withoutNode: String
      }
    `,
      diag,
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].fieldName).toBe('withNode');
  });

  it('non-svjif_ directives are silently ignored (no warning)', () => {
    const diag: Diagnostic[] = [];
    parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0) @deprecated(reason: "old")
      }
    `,
      diag,
    );

    // @deprecated is not svjif_, so no warning
    const warnings = diag.filter((d) => d.severity === 'warning');
    expect(warnings).toHaveLength(0);
  });

  it('unknown svjif_* directive emits SVJIF_W_UNUSED_FIELD warning', () => {
    const diag: Diagnostic[] = [];
    parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0) @svjif_unknown_future_directive
      }
    `,
      diag,
    );

    const warnings = diag.filter((d) => d.severity === 'warning');
    expect(warnings.map((w) => w.code)).toContain(SVJifErrorCode.W_UNUSED_FIELD);
  });

  it('parses props JSON arg into object', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0, props: "{\\"fill\\":\\"#ff0000\\"}")
      }
    `,
      diag,
    );

    expect(diag.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(nodes[0].props).toEqual({ fill: '#ff0000' });
  });

  it('preserves field order as fieldOrder property', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        first: String @svjif_node(kind: Rect, x: 0, y: 0)
        second: String @svjif_node(kind: Text, x: 10, y: 10)
        third: String @svjif_node(kind: Rect, x: 20, y: 20)
      }
    `,
      diag,
    );

    expect(nodes.map((n) => n.fieldName)).toEqual(['first', 'second', 'third']);
    expect(nodes.map((n) => n.fieldOrder)).toEqual([0, 1, 2]);
  });

  it('extracts optional zIndex, visible, parent, id args', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect, x: 0, y: 0, zIndex: 5, visible: false, parent: "group1", id: "custom-id")
      }
    `,
      diag,
    );

    expect(nodes[0].zIndex).toBe(5);
    expect(nodes[0].visible).toBe(false);
    expect(nodes[0].parent).toBe('group1');
    expect(nodes[0].id).toBe('custom-id');
  });

  it('x and y default to 0 when not provided', () => {
    const diag: Diagnostic[] = [];
    const { nodes } = parseAndExtract(
      `
      type S @svjif_scene(v: "1", width: 100, height: 100) {
        n: String @svjif_node(kind: Rect)
      }
    `,
      diag,
    );

    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
  });
});
