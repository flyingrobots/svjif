import type { CanonicalSceneAst, CompilerInput, Diagnostic } from '../types';
import { ParseError, SVJifErrorCode } from '../errors';

/**
 * Optional adapter signature so compiler-core does not hard-couple to schema-graphql internals.
 * Inject this from caller (or wire default in later).
 */
export type GraphqlToCanonicalAst = (args: {
  sdl: string;
  filename?: string;
  diagnostics?: Diagnostic[];
}) => Promise<CanonicalSceneAst> | CanonicalSceneAst;

export interface ParseInputDeps {
  graphqlToCanonicalAst?: GraphqlToCanonicalAst;
}

/**
 * Parse compiler input into CanonicalSceneAst.
 * - graphql-sdl path: delegated via injected adapter
 * - canonical-ast-json path: parsed locally + minimal structural checks
 *
 * Returns `undefined` and appends diagnostics on user-facing parse issues.
 * Throws only for unexpected internal faults.
 */
export async function parseInputToCanonicalAst(
  input: CompilerInput,
  diagnostics: Diagnostic[],
  deps: ParseInputDeps = {},
): Promise<CanonicalSceneAst | undefined> {
  switch (input.format) {
    case 'canonical-ast-json':
      return parseCanonicalAstJson(input, diagnostics);

    case 'graphql-sdl':
      return parseGraphqlSdl(input, diagnostics, deps);

    default: {
      diagnostics.push(
        new ParseError(
          SVJifErrorCode.E_INTERNAL_INVARIANT,
          `Unsupported input format: ${(input as { format?: string }).format ?? 'unknown'}`,
          {
            location: input.filename ? { file: input.filename, line: 1, column: 1 } : undefined,
          },
        ).toDiagnostic(),
      );
      return undefined;
    }
  }
}

async function parseGraphqlSdl(
  input: CompilerInput,
  diagnostics: Diagnostic[],
  deps: ParseInputDeps,
): Promise<CanonicalSceneAst | undefined> {
  if (!input.source.trim()) {
    diagnostics.push(
      new ParseError(SVJifErrorCode.E_INPUT_EMPTY, 'Input source is empty', {
        location: input.filename ? { file: input.filename, line: 1, column: 1 } : undefined,
      }).toDiagnostic(),
    );
    return undefined;
  }

  if (!deps.graphqlToCanonicalAst) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_INTERNAL_INVARIANT,
        'GraphQL parser adapter is not configured (graphqlToCanonicalAst missing)',
        {
          hint: 'Provide parseInput deps.graphqlToCanonicalAst from @svjif/schema-graphql.',
          location: input.filename ? { file: input.filename, line: 1, column: 1 } : undefined,
        },
      ).toDiagnostic(),
    );
    return undefined;
  }

  try {
    const ast = await deps.graphqlToCanonicalAst({
      sdl: input.source,
      filename: input.filename,
      diagnostics,
    });

    const structural = validateCanonicalAstShape(ast, input.filename);
    diagnostics.push(...structural);

    const hasErrors = structural.some((d) => d.severity === 'error');
    return hasErrors ? undefined : ast;
  } catch (cause) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_INTERNAL_INVARIANT,
        'Failed to parse GraphQL SDL into canonical AST',
        {
          cause,
          location: input.filename ? { file: input.filename, line: 1, column: 1 } : undefined,
        },
      ).toDiagnostic(),
    );
    return undefined;
  }
}

function parseCanonicalAstJson(
  input: CompilerInput,
  diagnostics: Diagnostic[],
): CanonicalSceneAst | undefined {
  if (!input.source.trim()) {
    diagnostics.push(
      new ParseError(SVJifErrorCode.E_INPUT_EMPTY, 'Input source is empty', {
        location: input.filename ? { file: input.filename, line: 1, column: 1 } : undefined,
      }).toDiagnostic(),
    );
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.source);
  } catch (cause) {
    diagnostics.push(
      new ParseError(SVJifErrorCode.E_INPUT_INVALID_JSON, 'Invalid JSON for canonical AST input', {
        cause,
        location: input.filename ? { file: input.filename, line: 1, column: 1 } : undefined,
        hint: 'Ensure the input is valid JSON. Check for syntax errors like trailing commas or unquoted keys.',
      }).toDiagnostic(),
    );
    return undefined;
  }

  const structural = validateCanonicalAstShape(parsed, input.filename);
  diagnostics.push(...structural);

  if (structural.some((d) => d.severity === 'error')) {
    return undefined;
  }

  return parsed as CanonicalSceneAst;
}

function validateCanonicalAstShape(
  value: unknown,
  filename?: string,
): Diagnostic[] {
  const out: Diagnostic[] = [];
  const loc = filename ? { file: filename, line: 1, column: 1 } : undefined;

  if (!isRecord(value)) {
    out.push(
      new ParseError(SVJifErrorCode.E_INTERNAL_INVARIANT, 'Canonical AST must be an object', {
        location: loc,
      }).toDiagnostic(),
    );
    return out;
  }

  if (value.kind !== 'Scene') {
    out.push(
      new ParseError(SVJifErrorCode.E_SCENE_MISSING, `Canonical AST kind must be "Scene"`, {
        location: loc,
      }).toDiagnostic(),
    );
  }

  if (value.astVersion !== '1') {
    out.push(
      new ParseError(
        SVJifErrorCode.E_VERSION_UNSUPPORTED,
        `Unsupported astVersion: ${String(value.astVersion)} (expected "1")`,
        { location: loc },
      ).toDiagnostic(),
    );
  }

  if (!isRecord(value.scene)) {
    out.push(
      new ParseError(SVJifErrorCode.E_SCENE_MISSING, 'Canonical AST scene object is missing', {
        location: loc,
      }).toDiagnostic(),
    );
  } else {
    if (typeof value.scene.width !== 'number' || typeof value.scene.height !== 'number') {
      out.push(
        new ParseError(
          SVJifErrorCode.E_SCENE_DIMENSIONS_INVALID,
          'Scene width/height must be numbers',
          { location: loc },
        ).toDiagnostic(),
      );
    }
  }

  if (!Array.isArray(value.nodes)) {
    out.push(
      new ParseError(SVJifErrorCode.E_INTERNAL_INVARIANT, 'Canonical AST nodes must be an array', {
        location: loc,
      }).toDiagnostic(),
    );
  }

  return out;
}

function isRecord(x: unknown): x is Record<string, any> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
