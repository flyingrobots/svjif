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
import { HASH_ALGORITHM } from '../canonical/hashing';
import { validateCanonicalAst, VALIDATION_RULE_IDS } from './validateAst';
import { emitSvjifIrArtifact, emitReceiptArtifact, IR_ARTIFACT_KEY, IR_RECEIPT_KEY, IR_VERSION } from './emitIr';
import { emitTypesArtifact } from './emitTypes';

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
  canonicalize: true,
};

const COMPILER_VERSION = '0.1.0-dev';

export async function compile(input: CompilerInput, deps?: ParseInputDeps): Promise<CompileResult> {
  const started = Date.now();
  const options = mergeOptions(DEFAULT_OPTIONS, input.options);
  const diagnostics: Diagnostic[] = [];
  const artifacts: ArtifactMap = {};

  try {
    // Phase 1: Parse → Canonical AST
    const canonicalAst = await parseInputToCanonicalAst(input, diagnostics, deps);

    // Phase 2: Semantic validation
    diagnostics.push(...validateCanonicalAst(canonicalAst, options));

    // Hard stop on errors
    const hasErrors = diagnostics.some((d) => d.severity === 'error');
    if (hasErrors) {
      return finalize(false, canonicalAst, artifacts, diagnostics, input.format, started);
    }

    // Phase 3: Emit artifacts
    // Reject unsupported features before any artifacts are written
    if (options.emit.jsonSchema) {
      diagnostics.push({
        code: SVJifErrorCode.E_FEATURE_NOT_IMPLEMENTED,
        severity: 'error',
        message: 'emit.jsonSchema is not yet implemented. Remove jsonSchema: true from emit options.',
        details: { feature: 'jsonSchema' },
      });
      return finalize(false, canonicalAst, artifacts, diagnostics, input.format, started);
    }
    if (options.emit.irJson && canonicalAst) {
      const irArtifact = emitSvjifIrArtifact(canonicalAst);
      artifacts[IR_ARTIFACT_KEY] = irArtifact;

      artifacts[IR_RECEIPT_KEY] = emitReceiptArtifact(input, irArtifact.content as string, VALIDATION_RULE_IDS);
    }
    if (options.emit.tsTypes && canonicalAst) {
      artifacts['types.ts'] = emitTypesArtifact(canonicalAst);
    }
    if (options.emit.binaryPack) {
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
      irVersion: IR_ARTIFACT_KEY in artifacts ? IR_VERSION : undefined,
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
