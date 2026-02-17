import { describe, expect, it } from 'vitest';
import {
  toTypeIdentifier,
  buildIdentifierMap,
  DEFAULT_OPTS,
} from '../src/util/identifiers';
import { TypeEmitter } from '../src/compile/emitTypes';
import type { CanonicalSceneAst } from '../src/types/ast';

function makeAst(partial: Partial<CanonicalSceneAst> = {}): CanonicalSceneAst {
  return {
    kind: 'Scene',
    astVersion: '1',
    scene: { id: 'scene:test', width: 800, height: 600 },
    nodes: [],
    ...partial,
  };
}

describe('toTypeIdentifier', () => {
  it('plain ASCII identifier → PascalCase', () => {
    expect(toTypeIdentifier('header')).toBe('Header');
    expect(toTypeIdentifier('my-component')).toBe('MyComponent');
    expect(toTypeIdentifier('hello_world')).toBe('Hello_world');
  });

  it('emoji and unicode → valid TS identifier via NFKC normalization', () => {
    // Emoji has no NFKC ident chars → empty → fallback
    const result = toTypeIdentifier('🚀');
    expect(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('unicode letters → included in identifier', () => {
    // NFKC normalized unicode letters are valid ident chars after split
    // "café" → "Café" as a segment
    const result = toTypeIdentifier('café');
    expect(result.length).toBeGreaterThan(0);
  });

  it('reserved keyword "type" → prefixed', () => {
    const result = toTypeIdentifier('type');
    expect(result).not.toBe('type');
    expect(result.length).toBeGreaterThan(0);
  });

  it('reserved keyword "null" → prefixed', () => {
    const result = toTypeIdentifier('null');
    expect(result).not.toBe('null');
    expect(result.length).toBeGreaterThan(0);
  });

  it('identifier starting with digit → invalid-start prefix applied', () => {
    const result = toTypeIdentifier('123abc');
    expect(/^[A-Za-z_$]/.test(result)).toBe(true);
  });

  it('empty string → emptyFallback', () => {
    expect(toTypeIdentifier('')).toBe(DEFAULT_OPTS.emptyFallback);
  });

  it('empty string with custom fallback', () => {
    expect(toTypeIdentifier('', { ...DEFAULT_OPTS, emptyFallback: 'Empty' })).toBe('Empty');
  });

  it('string of only separators → emptyFallback', () => {
    expect(toTypeIdentifier('---')).toBe(DEFAULT_OPTS.emptyFallback);
  });
});

describe('buildIdentifierMap', () => {
  it('unique sources → each gets its toTypeIdentifier result', () => {
    const map = buildIdentifierMap(['header', 'footer']);
    expect(map.get('header')).toBe('Header');
    expect(map.get('footer')).toBe('Footer');
  });

  it('two sources normalizing to same identifier → __2 suffix', () => {
    // 'foo-bar' → ['foo','bar'] → 'FooBar'
    // 'fooBar' → ['fooBar'] → 'FooBar'   (both produce the same PascalCase)
    const map = buildIdentifierMap(['foo-bar', 'fooBar']);
    const values = [...map.values()];
    expect(values).toContain('FooBar');
    expect(values.some((v) => v.startsWith('FooBar__'))).toBe(true);
  });

  it('collision: sources that both normalize to same identifier', () => {
    // 'foo-bar' → 'FooBar', 'foo bar' → 'FooBar' (both split on separator)
    const map = buildIdentifierMap(['foo-bar', 'foo bar']);
    const values = [...map.values()];
    expect(values.some((v) => v === 'FooBar')).toBe(true);
    expect(values.some((v) => v.startsWith('FooBar__'))).toBe(true);
  });

  it('respects bytewise sort for collision resolution (not locale sort)', () => {
    // 'Z' < 'a' bytewise (uppercase comes first in ASCII)
    // 'Z-item' normalizes to 'ZItem', 'z-item' normalizes to 'ZItem'
    // Bytewise: 'Z-item' < 'z-item', so 'Z-item' should get 'ZItem' (no suffix)
    const map = buildIdentifierMap(['z-item', 'Z-item']);
    // Sorted bytewise: 'Z-item' < 'z-item'
    expect(map.get('Z-item')).toBe('ZItem');
    expect(map.get('z-item')).toBe('ZItem__2');
  });

  it('empty source → emptyFallback used', () => {
    const map = buildIdentifierMap(['']);
    expect(map.get('')).toBe(DEFAULT_OPTS.emptyFallback);
  });
});

describe('TypeEmitter', () => {
  it('generated output contains NodeId, SceneRoot, per-kind interface, SceneNode union', () => {
    const ast = makeAst({
      nodes: [
        { id: 'header', kind: 'Rect', props: { width: 800, height: 40 }, zIndex: 1 },
        { id: 'title', kind: 'Text', props: { content: 'Hello' }, zIndex: 2 },
      ],
    });

    const output = new TypeEmitter(ast).emit();

    expect(output).toContain('export type NodeId =');
    expect(output).toContain('"header"');
    expect(output).toContain('"title"');
    expect(output).toContain('export interface SceneRoot');
    expect(output).toContain('export interface RectNode');
    expect(output).toContain('export interface TextNode');
    expect(output).toContain('export type SceneNode =');
    expect(output).toContain('RectNode');
    expect(output).toContain('TextNode');
  });

  it('empty nodes → NodeId = never and SceneNode = never', () => {
    const ast = makeAst({ nodes: [] });
    const output = new TypeEmitter(ast).emit();
    expect(output).toContain('export type NodeId = never');
    expect(output).toContain('export type SceneNode = never');
  });

  it('each kind present produces its own interface', () => {
    const ast = makeAst({
      nodes: [
        { id: 'n1', kind: 'Ellipse', props: { rx: 5, ry: 5 } },
        { id: 'n2', kind: 'Line', props: { x2: 10, y2: 10 } },
        { id: 'n3', kind: 'Path', props: { d: 'M0 0' } },
      ],
    });
    const output = new TypeEmitter(ast).emit();
    expect(output).toContain('export interface EllipseNode');
    expect(output).toContain('export interface LineNode');
    expect(output).toContain('export interface PathNode');
  });

  it('SceneRoot always present with required fields', () => {
    const ast = makeAst();
    const output = new TypeEmitter(ast).emit();
    expect(output).toContain('width: number;');
    expect(output).toContain('height: number;');
    expect(output).toContain('id: string;');
  });

  it('output starts with auto-generated comment', () => {
    const ast = makeAst();
    const output = new TypeEmitter(ast).emit();
    expect(output.startsWith('// Auto-generated by @svjif/compiler-core')).toBe(true);
  });
});
