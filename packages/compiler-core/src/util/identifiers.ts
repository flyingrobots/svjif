export interface IdentifierOptions {
  /** Prefix to prepend when the generated identifier starts with a digit or other invalid TS start char */
  invalidStartPrefix: string;
  /** Prefix to prepend when the generated identifier collides with a reserved keyword */
  reservedPrefix: string;
  /** Fallback identifier used when the source normalizes to an empty string */
  emptyFallback: string;
}

export const DEFAULT_OPTS: IdentifierOptions = {
  invalidStartPrefix: 'N',
  reservedPrefix: 'Kw',
  emptyFallback: 'Anonymous',
};

/**
 * Stable, explicit list of TypeScript / JavaScript reserved words.
 * This set is intentionally static — additions should be deliberate and reviewed.
 */
export const RESERVED = new Set<string>([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
  'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'return',
  'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof',
  'var', 'void', 'while', 'with', 'yield', 'async', 'await', 'of',
  // TypeScript-specific
  'abstract', 'as', 'asserts', 'any', 'boolean', 'constructor', 'declare', 'get',
  'infer', 'interface', 'is', 'keyof', 'module', 'namespace', 'never', 'number',
  'object', 'override', 'private', 'protected', 'public', 'readonly', 'require',
  'set', 'string', 'symbol', 'undefined', 'unique', 'unknown', 'from', 'global',
  'bigint', 'intrinsic',
  // Contextual keywords added in newer TypeScript / ECMAScript editions
  'satisfies', 'accessor', 'using',
]);

/**
 * Bytewise string comparator (no locale effects).
 */
export function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const IDENT_START_RE = /^[A-Za-z_$]/;
const NON_IDENT_RE = /[^A-Za-z0-9_$]+/g;

/**
 * Convert an arbitrary source string to a valid TypeScript PascalCase identifier.
 *
 * Steps:
 * 1. NFKC normalize
 * 2. Split on runs of non-identifier characters
 * 3. PascalCase each segment and join
 * 4. If result starts with digit/invalid, prepend `opts.invalidStartPrefix`
 * 5. If result is a reserved keyword, prepend `opts.reservedPrefix`
 * 6. If result is empty, use `opts.emptyFallback`
 */
export function toTypeIdentifier(source: string, opts: IdentifierOptions = DEFAULT_OPTS): string {
  // Step 1: NFKC normalize
  const normalized = source.normalize('NFKC');

  // Step 2+3: split on non-ident chars, PascalCase join
  const segments = normalized
    .split(NON_IDENT_RE)
    .filter((s) => s.length > 0)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  let result = segments.join('');

  // Step 6: empty fallback
  if (result.length === 0) {
    return opts.emptyFallback;
  }

  // Step 4: invalid start char
  if (!IDENT_START_RE.test(result)) {
    result = opts.invalidStartPrefix + result;
  }

  // Step 5: reserved keyword
  // RESERVED contains lowercase keywords; result is PascalCase.
  // Check exact-case only — 'Delete' is a valid TypeScript identifier even though 'delete' is not.
  if (RESERVED.has(result)) {
    result = opts.reservedPrefix + result;
  }

  return result;
}

/**
 * Build a stable identifier map from an array of source strings.
 *
 * - Sorts inputs bytewise before processing (deterministic)
 * - Generates unique identifiers; collisions resolved with `__N` suffix (N=2,3,…)
 * - Returns a Map<originalSource, identifier> in input order
 */
export function buildIdentifierMap(
  sources: string[],
  opts: IdentifierOptions = DEFAULT_OPTS,
): Map<string, string> {
  // Precondition: sources must be unique. The output Map is keyed by source string,
  // so duplicate sources cannot be represented — the last one would silently overwrite.
  if (new Set(sources).size !== sources.length) {
    throw new Error('buildIdentifierMap: duplicate source strings are not supported');
  }

  // Sort indices bytewise by source value for deterministic collision resolution.
  const sortedIndices = sources.map((_, i) => i).sort((a, b) => cmpStr(sources[a], sources[b]));

  const used = new Map<string, number>(); // identifier base → count
  const identifiers = new Array<string>(sources.length);

  for (const idx of sortedIndices) {
    const src = sources[idx];
    let ident = toTypeIdentifier(src, opts);
    const count = used.get(ident) ?? 0;
    used.set(ident, count + 1);
    if (count > 0) {
      ident = `${ident}__${count + 1}`;
    }
    identifiers[idx] = ident;
  }

  // Return in original input order
  const result = new Map<string, string>();
  for (let i = 0; i < sources.length; i++) {
    result.set(sources[i], identifiers[i]);
  }
  return result;
}
