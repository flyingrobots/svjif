/* eslint-disable @typescript-eslint/no-explicit-any */
// Replace "any" types with real Wesley types once you wire @wesley/core in package.json.
import { compile, type CompilerInput, type ParseInputDeps } from '@svjif/compiler-core';
import { graphqlToCanonicalAst } from '@svjif/schema-graphql';
// import { GeneratorPlugin } from '@wesley/core';

type WesleyPlanArtifact = { path: string; reason: string };
type WesleyPlan = {
  artifacts: WesleyPlanArtifact[];
  metadata?: Record<string, unknown>;
};

type WesleyGenerateResult = Record<string, string | Uint8Array>;

interface WesleyContextLike {
  logger?: {
    info?: (msg: string, meta?: unknown) => void;
    warn?: (msg: string, meta?: unknown) => void;
    error?: (msg: string, meta?: unknown) => void;
  };
  // Add evidence/hooks fields when integrating with real Wesley runtime.
}

// export class SVJifGeneratorPlugin extends GeneratorPlugin {
export class SVJifGeneratorPlugin {
  get apiVersion(): string {
    return '1';
  }

  get name(): string {
    return 'svjif';
  }

  /**
   * plan() should be cheap and non-compiling where possible.
   * It declares outputs and seeds metadata used by generate().
   */
  async plan(schema: { sdl?: string }, context: WesleyContextLike): Promise<WesleyPlan> {
    const sdl = schema?.sdl ?? '';

    context.logger?.info?.('[svjif] planning artifacts');

    return {
      artifacts: [
        { path: 'scene.svjif.json', reason: 'SVJif IR scene' },
        { path: 'types.ts', reason: 'TypeScript types for scene artifacts' },
      ],
      metadata: {
        inputFormat: 'graphql-sdl',
        sdl,
      },
    };
  }

  /**
   * generate() performs compilation and returns output file map.
   * Throw on compilation failure so Wesley marks generator failed.
   */
  async generate(plan: WesleyPlan, context: WesleyContextLike): Promise<WesleyGenerateResult> {
    context.logger?.info?.('[svjif] generating artifacts');

    const sdl = String(plan.metadata?.sdl ?? '');

    const input: CompilerInput = {
      format: 'graphql-sdl',
      source: sdl,
      filename: 'schema.graphql',
      options: {
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
      },
    };

    const deps: ParseInputDeps = { graphqlToCanonicalAst };
    const result = await compile(input, deps);

    for (const d of result.diagnostics) {
      const line = d.location ? `${d.location.file}:${d.location.line}:${d.location.column}` : 'unknown';
      const msg = `[${d.code}] ${d.message} (${line})`;
      if (d.severity === 'error') context.logger?.error?.(msg, d.details);
      else if (d.severity === 'warning') context.logger?.warn?.(msg, d.details);
      else context.logger?.info?.(msg, d.details);
    }

    if (!result.ok) {
      throw new Error(
        `SVJif generation failed with ${result.diagnostics.filter((d) => d.severity === 'error').length} error(s)`,
      );
    }

    // Convert ArtifactMap -> Wesley expected output
    const out: WesleyGenerateResult = {};
    for (const [path, artifact] of Object.entries(result.artifacts)) {
      // Prefer artifact.path if present; fallback to key.
      const outputPath = artifact.path || path;
      out[outputPath] = artifact.content;
    }

    return out;
  }
}
