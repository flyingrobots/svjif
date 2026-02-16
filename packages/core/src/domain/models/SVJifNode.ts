/**
 * SVJif Node Type Definitions
 *
 * Core domain models for SVJif scene graph nodes.
 * Follows hexagonal architecture - pure domain logic, no infrastructure dependencies.
 */

/** RGBA bounds: [x, y, width, height] */
export type Bounds = [number, number, number, number];

/** RGBA color tuple [r, g, b, a] where each value is 0-1 */
export type Color = readonly [number, number, number, number];

/** Hex color string */
export type HexColor = string;

/** Node types */
export type NodeType = 'rect' | 'text' | 'group' | 'image';

/** Fill types */
export type FillType = 'solid' | 'gradient' | 'tokenRef';

/** Layout types */
export type LayoutType = 'flex' | 'absolute';

/** Flex direction */
export type FlexDirection = 'row' | 'column';

/** Solid fill */
export interface SolidFill {
  readonly type: 'solid';
  readonly color: HexColor;
}

/** Token reference fill */
export interface TokenRefFill {
  readonly type: 'tokenRef';
  readonly token: string;
}

/** Fill definition */
export type Fill = SolidFill | TokenRefFill;

/** Paint style */
export interface PaintStyle {
  readonly fill?: Fill;
  readonly stroke?: Fill;
  readonly strokeWidth?: number;
  readonly opacity?: number;
  readonly cornerRadius?: number | readonly [number, number, number, number];
}

/** Flex layout style */
export interface FlexLayoutStyle {
  readonly type: 'flex';
  readonly direction: FlexDirection;
  readonly justifyContent?: 'start' | 'center' | 'end' | 'space-between';
  readonly alignItems?: 'start' | 'center' | 'end';
  readonly gap?: number;
  readonly padding?: readonly [number, number, number, number];
}

/** Absolute layout style */
export interface AbsoluteLayoutStyle {
  readonly type: 'absolute';
  readonly top?: number;
  readonly left?: number;
  readonly right?: number;
  readonly bottom?: number;
}

/** Layout style union */
export type LayoutStyle = FlexLayoutStyle | AbsoluteLayoutStyle;

/** Text style */
export interface TextStyle {
  readonly font: string;
  readonly size: number;
  readonly weight: number;
  readonly color: HexColor;
  readonly lineHeight?: number;
  readonly align?: 'left' | 'center' | 'right';
}

/** Combined node style */
export interface NodeStyle {
  readonly layout?: LayoutStyle;
  readonly paint?: PaintStyle;
  readonly text?: TextStyle;
}

/** Invalidation trigger - what causes this node to need re-layout/re-render */
export type InvalidationTrigger = 'content' | 'children' | 'bounds' | 'style';

/** Base SVJif Node */
export interface SVJifNodeBase {
  /** Unique node identifier */
  readonly id: string;

  /** Node type */
  readonly type: NodeType;

  /** Bounds: [x, y, width, height] */
  readonly bounds: Bounds;

  /** Node styles */
  readonly style: NodeStyle;

  /** Is this node static (never changes after build)? */
  readonly static: boolean;

  /** What triggers invalidation for this node? */
  readonly invalidatesOn?: readonly InvalidationTrigger[];
}

/** Rect node */
export interface RectNode extends SVJifNodeBase {
  readonly type: 'rect';
}

/** Text node */
export interface TextNode extends SVJifNodeBase {
  readonly type: 'text';
  readonly content: string;
}

/** Group node (container) */
export interface GroupNode extends SVJifNodeBase {
  readonly type: 'group';
  readonly children: readonly string[];
}

/** Image node */
export interface ImageNode extends SVJifNodeBase {
  readonly type: 'image';
  readonly src: string;
}

/** Union type of all node types */
export type SVJifNode = RectNode | TextNode | GroupNode | ImageNode;

/** Type guard for rect nodes */
export function isRectNode(node: SVJifNode): node is RectNode {
  return node.type === 'rect';
}

/** Type guard for text nodes */
export function isTextNode(node: SVJifNode): node is TextNode {
  return node.type === 'text';
}

/** Type guard for group nodes */
export function isGroupNode(node: SVJifNode): node is GroupNode {
  return node.type === 'group';
}

/** Type guard for image nodes */
export function isImageNode(node: SVJifNode): node is ImageNode {
  return node.type === 'image';
}
