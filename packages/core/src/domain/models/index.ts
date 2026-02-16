/**
 * Domain Models
 *
 * Pure domain types with no external dependencies.
 */

export type {
  Bounds,
  Color,
  HexColor,
  NodeType,
  FillType,
  LayoutType,
  FlexDirection,
  SolidFill,
  TokenRefFill,
  Fill,
  PaintStyle,
  FlexLayoutStyle,
  AbsoluteLayoutStyle,
  LayoutStyle,
  TextStyle,
  NodeStyle,
  InvalidationTrigger,
  SVJifNodeBase,
  RectNode,
  TextNode,
  GroupNode,
  ImageNode,
  SVJifNode,
} from './SVJifNode.js';

export { isRectNode, isTextNode, isGroupNode, isImageNode } from './SVJifNode.js';

export type {
  SVJifVersion,
  Units,
  Origin,
  SVJifMeta,
  SVJifCanvas,
  SVJifTokens,
  HitRegion,
  SVJifInteraction,
  SVJifScene,
} from './SVJifScene.js';

export { isSVJifScene } from './SVJifScene.js';
