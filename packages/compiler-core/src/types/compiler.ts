import type { CanonicalSceneAst } from './ast';
import type { ArtifactMap } from './artifacts';
import type { Diagnostic } from './diagnostics';

export type InputFormat = 'graphql-sdl' | 'canonical-ast-json';

export interface CompileOptions {
  target: 'svjif-ir-v1';
  emit: {
    irJson?: boolean;
    tsTypes?: boolean;
    jsonSchema?: boolean;
    binaryPack?: boolean;
  };
  strict?: boolean;
  failOnWarnings?: boolean;
  canonicalize?: boolean;
}

export interface CompilerInput {
  format: InputFormat;
  source: string;
  filename?: string;
  options?: CompileOptions;
}

export interface CompileMetadata {
  compilerVersion: string;
  irVersion?: string;
  inputFormat: InputFormat;
  elapsedMs: number;
  hashAlgorithm?: 'sha256';
}

export interface CompileResult {
  ok: boolean;
  ast?: CanonicalSceneAst;
  artifacts: ArtifactMap;
  diagnostics: Diagnostic[];
  metadata: CompileMetadata;
}
