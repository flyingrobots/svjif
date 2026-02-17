import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('emoji → no NFKC ident chars → emptyFallback ("Anonymous")', () => {
    // Emoji decomposes to no identifier chars under NFKC → empty segments → fallback
    expect(toTypeIdentifier('🚀')).toBe('Anonymous');
  });

  it('non-ASCII char acts as separator ("café" → "Caf" — é is not in [A-Za-z0-9_$])', () => {
    // 'é' (U+00E9) is not in the ident char set, so it splits "café" → segments ["caf"] → "Caf"
    expect(toTypeIdentifier('café')).toBe('Caf');
  });

  it('reserved keyword "type" → PascalCase "Type" (exact-case RESERVED check; "Type" is not reserved)', () => {
    // After the exact-case fix, "type" → PascalCase "Type"; RESERVED only contains lowercase "type"
    expect(toTypeIdentifier('type')).toBe('Type');
  });

  it('reserved keyword "null" → PascalCase "Null" (exact-case RESERVED check; "Null" is not reserved)', () => {
    expect(toTypeIdentifier('null')).toBe('Null');
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

  it('two sources normalizing to same identifier → earlier bytewise wins unsuffixed', () => {
    // 'foo-bar' → 'FooBar'; 'fooBar' → 'FooBar'
    // Bytewise: '-' (0x2D) < 'B' (0x42), so 'foo-bar' < 'fooBar' → 'foo-bar' wins unsuffixed
    const map = buildIdentifierMap(['foo-bar', 'fooBar']);
    expect(map.get('foo-bar')).toBe('FooBar');
    expect(map.get('fooBar')).toBe('FooBar__2');
  });

  it('collision: space-separated vs dash-separated — space wins bytewise', () => {
    // 'foo bar' → 'FooBar'; 'foo-bar' → 'FooBar'
    // Bytewise: ' ' (0x20) < '-' (0x2D), so 'foo bar' < 'foo-bar' → 'foo bar' wins unsuffixed
    const map = buildIdentifierMap(['foo-bar', 'foo bar']);
    expect(map.get('foo bar')).toBe('FooBar');
    expect(map.get('foo-bar')).toBe('FooBar__2');
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

  it('emitted TypeScript passes tsc --noEmit (C3 success gate)', () => {
    const ast = makeAst({
      nodes: [
        // 'type' is a reserved keyword — identifier guard must fire
        { id: 'type', kind: 'Rect', props: { width: 10, height: 10 }, zIndex: 1 },
        // emoji-only id — NFKC normalization + emptyFallback must fire
        { id: '🚀', kind: 'Text', props: { content: 'hi' }, zIndex: 2 },
        // Normal ids
        { id: 'header', kind: 'Group', props: {}, zIndex: 3 },
        { id: 'bg', kind: 'Ellipse', props: { rx: 5, ry: 5 }, zIndex: 1 },
      ],
    });

    const output = new TypeEmitter(ast).emit();

    const dir = mkdtempSync(join(tmpdir(), 'svjif-types-'));
    const file = join(dir, 'types.ts');
    try {
      writeFileSync(file, output, 'utf8');
      // Run tsc against the generated file in isolation (no imports, no tsconfig needed)
      execSync(
        `node_modules/.bin/tsc --noEmit --strict --target ES2022 --skipLibCheck ${file}`,
        { cwd: join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (e: any) {
      throw new Error(
        `Generated types failed tsc --noEmit:\n${e.stdout ?? ''}\n${e.stderr ?? ''}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
