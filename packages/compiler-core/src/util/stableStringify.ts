/**
 * Deterministic JSON serialization:
 * - object keys sorted lexicographically
 * - array order preserved
 * - no mutation of source values
 * - throws on circular structures
 * - omits undefined/function/symbol in objects (JSON semantics)
 * - converts unsupported array values to null (JSON semantics)
 *
 * NOTE:
 * - BigInt throws (matching JSON.stringify behavior)
 * - Dates are serialized via toJSON if present
 */

export interface StableStringifyOptions {
  space?: number | string;
}

export function stableStringify(value: unknown, options: StableStringifyOptions = {}): string {
  const seen = new WeakSet<object>();
  const normalized = normalize(value, seen);
  return JSON.stringify(normalized, null, options.space);
}

function normalize(value: unknown, seen: WeakSet<object>): unknown {
  // Primitives
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  // undefined/function/symbol at root => JSON.stringify(undefined) returns undefined.
  // We normalize root undefined/function/symbol to null to keep return type string stable.
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return null;
  }

  if (typeof value === 'bigint') {
    throw new TypeError('Do not know how to serialize a BigInt');
  }

  // Dates and objects with toJSON
  if (hasToJSON(value)) {
    return normalize(value.toJSON(), seen);
  }

  // Arrays
  if (Array.isArray(value)) {
    const arr = new Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
      const v = value[i];
      // JSON arrays: undefined/function/symbol -> null
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
        arr[i] = null;
      } else {
        arr[i] = normalize(v, seen);
      }
    }
    return arr;
  }

  // Objects
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    if (seen.has(obj)) {
      throw new TypeError('Converting circular structure to JSON');
    }
    seen.add(obj);

    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    for (const key of keys) {
      const v = obj[key];
      // JSON object semantics: omit undefined/function/symbol
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
        continue;
      }
      out[key] = normalize(v, seen);
    }

    seen.delete(obj);
    return out;
  }

  // Fallback (should not hit)
  return value;
}

function hasToJSON(value: unknown): value is { toJSON: () => unknown } {
  return typeof value === 'object' && value !== null && typeof (value as any).toJSON === 'function';
}
