import { deterministicId } from '@svjif/compiler-core';
import type { CanonicalSceneAst, Node, NodeKind } from '@svjif/compiler-core';
import type { ExtractedScene } from '../parse/extractScene';
import type { ExtractedNode } from '../parse/extractNodes';

/**
 * Maps extracted scene + nodes into a CanonicalSceneAst.
 *
 * ID assignment:
 * - Scene ID: deterministicId('scene', sceneName)
 * - Node ID: explicit @svjif_node(id:...) if provided, else deterministicId('node', sceneName, fieldName)
 *
 * Defaults:
 * - visible defaults to true if not specified
 * - zIndex defaults to fieldOrder + 1 if not specified (1-based, preserving declaration order)
 *
 * Geometry and props are merged: props from JSON arg get x, y, width, height merged in.
 */
export function toCanonicalAst(
  scene: ExtractedScene,
  nodes: ExtractedNode[],
  _filename?: string,
): CanonicalSceneAst {
  const sceneId = deterministicId('scene', scene.typeName);

  const canonicalNodes: Node[] = nodes.map((n) => {
    const id = n.id ?? deterministicId('node', scene.typeName, n.fieldName);

    // Build merged props: start with extracted JSON props, merge in geometry
    const baseProps: Record<string, unknown> = {
      ...(n.props ?? {}),
      x: n.x,
      y: n.y,
    };
    if (n.width !== undefined) baseProps['width'] = n.width;
    if (n.height !== undefined) baseProps['height'] = n.height;

    return {
      id,
      kind: n.kind as NodeKind,
      parentId: n.parent,
      zIndex: n.zIndex ?? n.fieldOrder + 1,
      visible: n.visible ?? true,
      props: baseProps as any,
      sourceRef: n.sourceRef,
    } as Node;
  });

  return {
    kind: 'Scene',
    astVersion: '1',
    scene: {
      id: sceneId,
      name: scene.name ?? scene.typeName,
      width: scene.width,
      height: scene.height,
      units: 'px',
      background: scene.background,
    },
    nodes: canonicalNodes,
    bindings: [],
    animations: [],
    metadata: {
      sourceFormat: 'graphql-sdl',
    },
  };
}
