export interface CanonicalSceneAst {
  kind: 'Scene';
  astVersion: '1';
  scene: Scene;
  nodes: Node[];
  bindings?: Binding[];
  animations?: Animation[];
  metadata?: AstMetadata;
}

export interface Scene {
  id: string;
  name?: string;
  width: number;
  height: number;
  units?: 'px';
  background?: string;
}

export type NodeKind = 'Rect' | 'Text' | 'Image' | 'Group' | 'Line' | 'Ellipse' | 'Path';

export interface SourceRef {
  file: string;
  line: number;
  column: number;
}

export interface StyleProps {
  shadow?: {
    x?: number;
    y?: number;
    blur?: number;
    color?: string;
  };
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface CommonGeometry {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number; // 0..1
}

export type Primitive = string | number | boolean | null;
export type PropValue = Primitive | Primitive[] | Record<string, Primitive>;

export interface NodeBase {
  id: string;
  kind: NodeKind;
  parentId?: string;
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  props: Record<string, PropValue>;
  style?: StyleProps;
  sourceRef?: SourceRef;
}

export interface RectProps extends CommonGeometry {
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface TextProps extends CommonGeometry {
  content: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | 'normal' | 'bold';
  lineHeight?: number;
  letterSpacing?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

export interface ImageProps extends CommonGeometry {
  src: string;
  fit?: 'cover' | 'contain' | 'fill';
  alt?: string;
}

export interface GroupProps extends CommonGeometry {}

export interface LineProps extends CommonGeometry {
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
}

export interface EllipseProps extends CommonGeometry {
  rx: number;
  ry: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface PathProps extends CommonGeometry {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type Node =
  | (NodeBase & { kind: 'Rect'; props: RectProps })
  | (NodeBase & { kind: 'Text'; props: TextProps })
  | (NodeBase & { kind: 'Image'; props: ImageProps })
  | (NodeBase & { kind: 'Group'; props: GroupProps })
  | (NodeBase & { kind: 'Line'; props: LineProps })
  | (NodeBase & { kind: 'Ellipse'; props: EllipseProps })
  | (NodeBase & { kind: 'Path'; props: PathProps });

export interface Binding {
  id: string;
  targetNodeId: string;
  targetProp: string;
  expression: string;
  when?: string;
}

export interface Animation {
  id: string;
  targetNodeId: string;
  property: string;
  keyframes: Array<{ t: number; value: Primitive }>;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loop?: boolean;
}

export interface AstMetadata {
  sourceFormat: 'graphql-sdl' | 'canonical-ast-json';
  sourceHash?: string;
  tags?: string[];
}
