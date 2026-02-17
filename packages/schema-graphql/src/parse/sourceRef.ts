import { getLocation, type Source } from 'graphql';
import type { SourceRef } from '@svjif/compiler-core';

/**
 * Returns a SourceRef from a graphql-js AST node's loc, or a fallback.
 * Null-safe: if loc is absent, returns file/<inline>, line 1, col 1.
 */
export function nodeSourceRef(
  node: { loc?: { start: number; source: Source } },
  filename?: string,
): SourceRef {
  if (node.loc) {
    const { line, column } = getLocation(node.loc.source, node.loc.start);
    return {
      file: filename ?? node.loc.source.name ?? '<inline>',
      line,
      column,
    };
  }
  return { file: filename ?? '<inline>', line: 1, column: 1 };
}
