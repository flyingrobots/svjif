import {
  getLocation,
  type Source,
  type DocumentNode,
  type ObjectTypeDefinitionNode,
  type DirectiveNode,
  type ArgumentNode,
} from 'graphql';
import { ParseError, SVJifErrorCode } from '@svjif/compiler-core';
import type { Diagnostic, SourceRef } from '@svjif/compiler-core';
import { validateSvjifDirectiveVersion } from '../directives/v1';

export interface ExtractedScene {
  typeName: string;
  v: string;
  width: number;
  height: number;
  name?: string;
  background?: string;
  sourceRef: SourceRef;
  typeNode: ObjectTypeDefinitionNode;
}

/**
 * Returns a SourceRef from a graphql-js AST node's loc, or a fallback.
 * Null-safe: if loc is absent, returns file/<inline>, line 1, col 1.
 */
function nodeSourceRef(
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

function getArgValue(
  directive: DirectiveNode,
  argName: string,
): ArgumentNode | undefined {
  return directive.arguments?.find((a) => a.name.value === argName);
}

function getStringArg(directive: DirectiveNode, argName: string): string | undefined {
  const arg = getArgValue(directive, argName);
  if (!arg) return undefined;
  if (arg.value.kind === 'StringValue') return arg.value.value;
  return undefined;
}

function getIntArg(directive: DirectiveNode, argName: string): number | undefined {
  const arg = getArgValue(directive, argName);
  if (!arg) return undefined;
  if (arg.value.kind === 'IntValue') return parseInt(arg.value.value, 10);
  return undefined;
}

/**
 * Extracts the single @svjif_scene type definition from a DocumentNode.
 * Pushes diagnostics and returns undefined on error.
 */
export function extractScene(
  doc: DocumentNode,
  diagnostics: Diagnostic[],
  filename?: string,
): ExtractedScene | undefined {
  const sceneCandidates: ObjectTypeDefinitionNode[] = [];

  for (const def of doc.definitions) {
    if (def.kind !== 'ObjectTypeDefinition') continue;
    const sceneDir = def.directives?.find((d) => d.name.value === 'svjif_scene');
    if (sceneDir) {
      sceneCandidates.push(def);
    }
  }

  if (sceneCandidates.length === 0) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_SCENE_MISSING,
        'No type with @svjif_scene directive found. Add @svjif_scene(v: "1", width: N, height: N) to exactly one type.',
        { location: { file: filename ?? '<inline>', line: 1, column: 1 } },
      ).toDiagnostic(),
    );
    return undefined;
  }

  if (sceneCandidates.length > 1) {
    const names = sceneCandidates.map((t) => t.name.value).join(', ');
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_SCENE_MULTIPLE,
        `Multiple types with @svjif_scene found: ${names}. Only one scene type is allowed per SDL.`,
        { location: nodeSourceRef(sceneCandidates[1], filename) },
      ).toDiagnostic(),
    );
    return undefined;
  }

  const typeNode = sceneCandidates[0];
  const sceneDir = typeNode.directives!.find((d) => d.name.value === 'svjif_scene')!;
  const sourceRef = nodeSourceRef(typeNode, filename);

  // Validate version
  const v = getStringArg(sceneDir, 'v');
  if (!v) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_DIRECTIVE_ARG_MISSING,
        `@svjif_scene requires argument v: "1"`,
        { location: sourceRef },
      ).toDiagnostic(),
    );
    return undefined;
  }

  const vCheck = validateSvjifDirectiveVersion(v);
  if (!vCheck.ok) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_VERSION_UNSUPPORTED,
        `Unsupported @svjif_scene version: "${v}" (expected "${vCheck.expected}")`,
        { location: sourceRef },
      ).toDiagnostic(),
    );
    return undefined;
  }

  // Validate required numeric args
  const width = getIntArg(sceneDir, 'width');
  const height = getIntArg(sceneDir, 'height');

  if (width === undefined) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_DIRECTIVE_ARG_MISSING,
        `@svjif_scene requires argument: width`,
        { location: sourceRef },
      ).toDiagnostic(),
    );
    return undefined;
  }

  if (height === undefined) {
    diagnostics.push(
      new ParseError(
        SVJifErrorCode.E_DIRECTIVE_ARG_MISSING,
        `@svjif_scene requires argument: height`,
        { location: sourceRef },
      ).toDiagnostic(),
    );
    return undefined;
  }

  const name = getStringArg(sceneDir, 'name');
  const background = getStringArg(sceneDir, 'background');

  return {
    typeName: typeNode.name.value,
    v,
    width,
    height,
    name,
    background,
    sourceRef,
    typeNode,
  };
}
