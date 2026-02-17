import type {
  CanonicalSceneAst,
  CompileOptions,
  CompileResult,
  CompilerInput,
  Diagnostic,
  ArtifactMap,
} from '../types';

import {
  SVJifErrorCode,
  InternalCompilerError,
} from '../errors';

import { parseInputToCanonicalAst, type ParseInputDeps } from './parseInput';
import { stableStringify } from '../util/stableStringify';
import { HASH_ALGORITHM } from '../canonical/hashing';

// TODO: wire these modules as you implement phases
// import { normalizeCanonicalAst } from '../canonical/normalize';
// import { validateCanonicalAst } from './validateAst';
// import { emitSvjifIrArtifact } from './emitIr';
// import { emitTypesArtifact } from './emitTypes';

const DEFAULT_OPTIONS: CompileOptions = {
  target: 'svjif-ir-v1',
  emit: {
    irJson: true,
    tsTypes: true,
    jsonSchema: false,
    binaryPack: false,
  },
  strict: true,
  failOnWarnings: false,
  deterministicIds: true,
  canonicalize: true,
};

const COMPILER_VERSION = '0.1.0-dev';

export async function compile(input: CompilerInput, deps?: ParseInputDeps): Promise<CompileResult> {
  const started = Date.now();
  const options = mergeOptions(DEFAULT_OPTIONS, input.options);
  const diagnostics: Diagnostic[] = [];
  const artifacts: ArtifactMap = {};

  try {
    // Phase 1: Parse -> Canonical AST
    const ast = await parseInputToCanonicalAst(input, diagnostics, deps);

    // Phase 2: Canonicalization
    // TODO: if (options.canonicalize) ast = normalizeCanonicalAst(ast, options)
    const canonicalAst = ast;

    // Phase 3: Semantic validation
    // TODO: diagnostics.push(...validateCanonicalAst(canonicalAst, options))
    diagnostics.push(...validateStub(canonicalAst));

    // Hard stop on errors
    const hasErrors = diagnostics.some((d) => d.severity === 'error');
    if (hasErrors) {
      return finalize(false, canonicalAst, artifacts, diagnostics, input.format, started);
    }

    // Phase 4: Emit artifacts
    // TODO: replace stubs with real emitters
    if (options.emit.irJson) {
      artifacts['scene.svjif.json'] = emitIrStub(canonicalAst);
    }
    if (options.emit.tsTypes) {
      artifacts['types.ts'] = emitTypesStub(canonicalAst);
    }
    if (options.emit.jsonSchema) {
      artifacts['scene.svjif.schema.json'] = emitSchemaStub();
    }
    if (options.emit.binaryPack) {
      // TODO: implement pack step later
      diagnostics.push({
        code: SVJifErrorCode.W_BINARY_PACK_NOT_IMPLEMENTED,
        severity: 'warning',
        message: 'binaryPack requested but not implemented yet',
      });
    }

    if (options.failOnWarnings && diagnostics.some((d) => d.severity === 'warning')) {
      return finalize(false, canonicalAst, artifacts, diagnostics, input.format, started);
    }

    return finalize(true, canonicalAst, artifacts, diagnostics, input.format, started);
  } catch (cause) {
    const err = new InternalCompilerError('Unhandled compiler failure', {
      cause,
      details: { format: input.format, filename: input.filename },
    });

    diagnostics.push(err.toDiagnostic());
    return finalize(false, undefined, artifacts, diagnostics, input.format, started);
  }
}

function finalize(
  ok: boolean,
  ast: CanonicalSceneAst | undefined,
  artifacts: ArtifactMap,
  diagnostics: Diagnostic[],
  inputFormat: CompilerInput['format'],
  started: number,
): CompileResult {
  return {
    ok,
    ast,
    artifacts,
    diagnostics,
    metadata: {
      compilerVersion: COMPILER_VERSION,
      irVersion: ok ? 'svjif-ir/1' : undefined,
      inputFormat,
      elapsedMs: Date.now() - started,
      hashAlgorithm: HASH_ALGORITHM,
    },
  };
}

function mergeOptions(base: CompileOptions, partial?: CompileOptions): CompileOptions {
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    emit: {
      ...base.emit,
      ...(partial.emit ?? {}),
    },
  };
}

/* ---------------------- STUBS (replace incrementally) ---------------------- */

function validateStub(ast: CanonicalSceneAst | undefined): Diagnostic[] {
  if (!ast) return [];
  const out: Diagnostic[] = [];
  if (ast.scene.width <= 0 || ast.scene.height <= 0) {
    out.push({
      code: SVJifErrorCode.E_SCENE_DIMENSIONS_INVALID,
      severity: 'error',
      message: 'Scene width/height must be > 0',
    });
  }
  return out;
}

function emitIrStub(ast: CanonicalSceneAst | undefined) {
  // Sort nodes deterministically: ascending zIndex, then ascending id
  const rawNodes = ast?.nodes ?? [];
  const sortedNodes = [...rawNodes]
    .sort((a, b) => {
      const zA = a.zIndex ?? 0;
      const zB = b.zIndex ?? 0;
      if (zA !== zB) return zA - zB;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    // Strip sourceRef from IR output: it contains source locations that vary with whitespace
    .map(({ sourceRef: _sourceRef, ...node }) => node);

  const content = stableStringify(
    {
      irVersion: 'svjif-ir/1',
      scene: ast?.scene ?? null,
      nodes: sortedNodes,
      bindings: ast?.bindings ?? [],
      animations: ast?.animations ?? [],
    },
    { space: 2 },
  );

  return {
    path: 'scene.svjif.json',
    content,
    mediaType: 'application/json',
    encoding: 'utf8' as const,
  };
}

function emitTypesStub(_ast: CanonicalSceneAst | undefined) {
  const content = `// Auto-generated by @svjif/compiler-core
export interface SceneRoot {
  id: string;
  width: number;
  height: number;
}
`;
  return {
    path: 'types.ts',
    content,
    mediaType: 'text/plain',
    encoding: 'utf8' as const,
  };
}

function emitSchemaStub() {
  const content = JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'SVJif Scene IR v1',
      type: 'object',
    },
    null,
    2,
  );
  return {
    path: 'scene.svjif.schema.json',
    content,
    mediaType: 'application/json',
    encoding: 'utf8' as const,
  };
}
