import { createHash } from 'node:crypto';

/**
 * The hash algorithm used for all deterministic IDs and content hashes.
 * Single place to swap to BLAKE3 or similar in the future.
 */
export const HASH_ALGORITHM = 'sha256' as const;

/**
 * Computes a lowercase hex SHA-256 hash of the given string.
 */
export function hashString(input: string): string {
  return createHash(HASH_ALGORITHM).update(input, 'utf8').digest('hex');
}

/**
 * Computes a deterministic, stable ID for a scene or node.
 *
 * Contract:
 * - Each part is trimmed of surrounding whitespace before hashing
 * - Parts are joined with '/' as separator
 * - Output is lowercase hex SHA-256
 * - Output is prefixed with a type marker: 'scene_' for scenes, 'node_' for nodes
 *
 * @example
 * deterministicId('node', 'Terminal', 'title') → 'node_<sha256hex of "Terminal/title">'
 * deterministicId('scene', 'Terminal') → 'scene_<sha256hex of "Terminal">'
 */
export function deterministicId(type: 'scene' | 'node', ...parts: string[]): string {
  const joined = parts.map((p) => p.trim()).join('/');
  const hex = hashString(joined);
  return `${type}_${hex}`;
}
