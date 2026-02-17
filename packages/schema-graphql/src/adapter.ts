import type { CanonicalSceneAst, Diagnostic } from '@svjif/compiler-core';
import type { GraphqlToCanonicalAst } from '@svjif/compiler-core';
import { parseGraphql } from './parse/parseGraphql';
import { extractScene } from './parse/extractScene';
import { extractNodes } from './parse/extractNodes';
import { toCanonicalAst } from './transform/toCanonicalAst';

// Re-export the type so callers can import it from this package
export type { GraphqlToCanonicalAst };

/**
 * Converts a GraphQL SDL string into a CanonicalSceneAst.
 * This is the primary adapter between @svjif/schema-graphql and @svjif/compiler-core.
 *
 * Throws on parse errors. Pushes semantic diagnostics to the provided array.
 */
export const graphqlToCanonicalAst: GraphqlToCanonicalAst = async (args: {
  sdl: string;
  filename?: string;
  diagnostics?: Diagnostic[];
}): Promise<CanonicalSceneAst> => {
  const { sdl, filename, diagnostics = [] } = args;

  // Step 1: Parse SDL into DocumentNode (throws ParseError on syntax errors)
  const doc = parseGraphql(sdl, filename);

  // Step 2: Extract scene definition
  const scene = extractScene(doc, diagnostics, filename);
  if (!scene) {
    const reason =
      diagnostics.length > 0
        ? diagnostics[diagnostics.length - 1].message
        : 'Scene extraction failed';
    throw new Error(reason);
  }

  // Step 3: Extract nodes
  const nodes = extractNodes(scene, diagnostics, filename);

  // Step 4: Transform to canonical AST
  return toCanonicalAst(scene, nodes, filename);
};
