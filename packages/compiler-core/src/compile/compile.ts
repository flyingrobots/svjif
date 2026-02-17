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
import { validateCanonicalAst, VALIDATION_RULE_IDS } from './validateAst';
import { emitSvjifIrArtifact, emitReceiptArtifact } from './emitIr';
import { emitTypesArtifact } from './emitTypes';

// TODO: wire these modules as you implement phases
// import { normalizeCanonicalAst } from '../canonical/normalize';

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
    diagnostics.push(...validateCanonicalAst(canonicalAst, options));

    // Hard stop on errors
    const hasErrors = diagnostics.some((d) => d.severity === 'error');
    if (hasErrors) {
      return finalize(false, canonicalAst, artifacts, diagnostics, input.format, started);
    }

    // Phase 4: Emit artifacts
    if (options.emit.irJson && canonicalAst) {
      const irArtifact = emitSvjifIrArtifact(canonicalAst);
      artifacts['scene.svjif.json'] = irArtifact;

      // Determinism receipt
      const irContent = typeof irArtifact.content === 'string' ? irArtifact.content : '';
      artifacts['scene.svjif.json.receipt'] = emitReceiptArtifact(input, irContent, VALIDATION_RULE_IDS);
    }
    if (options.emit.tsTypes && canonicalAst) {
      artifacts['types.ts'] = emitTypesArtifact(canonicalAst);
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

/* ---------------------- Remaining stubs ---------------------- */

// stableStringify is kept imported for potential future use in schema stub
void stableStringify;

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
