import { describe, expect, it } from 'vitest';
import { stableStringify } from '../src/util/stableStringify';

describe('stableStringify', () => {
  describe('key sorting', () => {
    it('sorts object keys lexicographically', () => {
      const obj = { z: 1, a: 2, m: 3 };
      expect(stableStringify(obj)).toBe('{"a":2,"m":3,"z":1}');
    });

    it('sorts keys in deeply nested objects', () => {
      const obj = { z: { y: 1, b: 2 }, a: { x: 3, c: 4 } };
      const result = stableStringify(obj);
      const parsed = JSON.parse(result);
      expect(Object.keys(parsed)).toEqual(['a', 'z']);
      expect(Object.keys(parsed.a)).toEqual(['c', 'x']);
      expect(Object.keys(parsed.z)).toEqual(['b', 'y']);
    });

    it('produces identical output for same object regardless of insertion order', () => {
      const a = { c: 3, a: 1, b: 2 };
      const b = { a: 1, b: 2, c: 3 };
      expect(stableStringify(a)).toBe(stableStringify(b));
    });
  });

  describe('circular reference detection', () => {
    it('throws TypeError on circular object', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj['self'] = obj;
      expect(() => stableStringify(obj)).toThrow(TypeError);
      expect(() => stableStringify(obj)).toThrow('circular');
    });

    it('throws TypeError on circular nested object', () => {
      const child: Record<string, unknown> = { x: 1 };
      const parent: Record<string, unknown> = { child };
      child['parent'] = parent;
      expect(() => stableStringify(parent)).toThrow(TypeError);
    });
  });

  describe('undefined, function, symbol handling', () => {
    it('omits undefined values in objects (JSON semantics)', () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = JSON.parse(stableStringify(obj));
      expect(result).toEqual({ a: 1, c: 3 });
      expect('b' in result).toBe(false);
    });

    it('omits function values in objects', () => {
      const obj = { a: 1, fn: () => 42 };
      const result = JSON.parse(stableStringify(obj));
      expect(result).toEqual({ a: 1 });
    });

    it('omits symbol values in objects', () => {
      const obj = { a: 1, sym: Symbol('test') };
      const result = JSON.parse(stableStringify(obj));
      expect(result).toEqual({ a: 1 });
    });

    it('converts undefined to null in arrays (JSON semantics)', () => {
      const arr = [1, undefined, 3];
      const result = JSON.parse(stableStringify(arr));
      expect(result).toEqual([1, null, 3]);
    });

    it('converts function to null in arrays', () => {
      const arr = [1, () => 42, 3];
      const result = JSON.parse(stableStringify(arr));
      expect(result).toEqual([1, null, 3]);
    });

    it('converts symbol to null in arrays', () => {
      const arr = [1, Symbol('x'), 3];
      const result = JSON.parse(stableStringify(arr));
      expect(result).toEqual([1, null, 3]);
    });
  });

  describe('toJSON protocol', () => {
    it('calls toJSON on Date objects', () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      const result = stableStringify({ date });
      expect(result).toBe(`{"date":"2024-01-15T00:00:00.000Z"}`);
    });

    it('calls toJSON on custom objects', () => {
      const obj = {
        name: 'test',
        toJSON() {
          return { serialized: true };
        },
      };
      const result = JSON.parse(stableStringify(obj));
      expect(result).toEqual({ serialized: true });
    });
  });

  describe('BigInt', () => {
    it('throws on BigInt values', () => {
      expect(() => stableStringify({ n: BigInt(42) })).toThrow(TypeError);
      expect(() => stableStringify({ n: BigInt(42) })).toThrow('BigInt');
    });
  });

  describe('primitives and arrays', () => {
    it('handles null at top level', () => {
      expect(stableStringify(null)).toBe('null');
    });

    it('handles string at top level', () => {
      expect(stableStringify('hello')).toBe('"hello"');
    });

    it('handles number at top level', () => {
      expect(stableStringify(42)).toBe('42');
    });

    it('handles boolean at top level', () => {
      expect(stableStringify(true)).toBe('true');
      expect(stableStringify(false)).toBe('false');
    });

    it('preserves array order', () => {
      const arr = [3, 1, 2];
      const result = JSON.parse(stableStringify(arr));
      expect(result).toEqual([3, 1, 2]);
    });

    it('handles empty object', () => {
      expect(stableStringify({})).toBe('{}');
    });

    it('handles empty array', () => {
      expect(stableStringify([])).toBe('[]');
    });
  });

  describe('space option', () => {
    it('formats with numeric space', () => {
      const result = stableStringify({ a: 1 }, { space: 2 });
      expect(result).toBe('{\n  "a": 1\n}');
    });
  });
});
