import { parse, GraphQLError, type DocumentNode } from 'graphql';
import { ParseError, SVJifErrorCode } from '@svjif/compiler-core';

/**
 * Parse a GraphQL SDL string into a DocumentNode.
 * Wraps graphql-js parse errors into a typed ParseError.
 */
export function parseGraphql(sdl: string, filename?: string): DocumentNode {
  try {
    return parse(sdl);
  } catch (cause) {
    const location =
      cause instanceof GraphQLError && cause.locations?.[0]
        ? {
            file: filename ?? '<inline>',
            line: cause.locations[0].line,
            column: cause.locations[0].column,
          }
        : { file: filename ?? '<inline>', line: 1, column: 1 };

    throw new ParseError(
      SVJifErrorCode.E_INTERNAL_INVARIANT,
      `GraphQL SDL parse error: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause, location },
    );
  }
}
