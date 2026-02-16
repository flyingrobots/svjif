import {
  GraphQLEnumType,
  GraphQLDirective,
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLBoolean,
  DirectiveLocation,
  type GraphQLNamedType,
} from 'graphql';

export const SVJIF_DIRECTIVE_VERSION = '1' as const;

export const SVJifNodeKindEnum = new GraphQLEnumType({
  name: 'SVJifNodeKind',
  values: {
    Rect: { value: 'Rect' },
    Text: { value: 'Text' },
    Image: { value: 'Image' },
    Group: { value: 'Group' },
    Line: { value: 'Line' },
    Ellipse: { value: 'Ellipse' },
    Path: { value: 'Path' },
  },
});

export const svjifSceneDirective = new GraphQLDirective({
  name: 'svjif_scene',
  locations: [DirectiveLocation.OBJECT],
  args: {
    v: { type: new GraphQLNonNull(GraphQLString) },
    width: { type: new GraphQLNonNull(GraphQLInt) },
    height: { type: new GraphQLNonNull(GraphQLInt) },
    name: { type: GraphQLString },
    background: { type: GraphQLString },
  },
});

export const svjifNodeDirective = new GraphQLDirective({
  name: 'svjif_node',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    kind: { type: new GraphQLNonNull(SVJifNodeKindEnum) },
    id: { type: GraphQLString },
    parent: { type: GraphQLString },
    x: { type: GraphQLFloat },
    y: { type: GraphQLFloat },
    width: { type: GraphQLFloat },
    height: { type: GraphQLFloat },
    zIndex: { type: GraphQLInt },
    visible: { type: GraphQLBoolean },
    props: { type: GraphQLString }, // JSON string payload for extensibility
  },
});

export const svjifBindDirective = new GraphQLDirective({
  name: 'svjif_bind',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    targetProp: { type: new GraphQLNonNull(GraphQLString) },
    expr: { type: new GraphQLNonNull(GraphQLString) },
    when: { type: GraphQLString },
  },
});

export const svjifStyleDirective = new GraphQLDirective({
  name: 'svjif_style',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    shadow: { type: GraphQLString }, // JSON string
    blendMode: { type: GraphQLString },
  },
});

export const SVJIF_V1_DIRECTIVES: readonly GraphQLDirective[] = [
  svjifSceneDirective,
  svjifNodeDirective,
  svjifBindDirective,
  svjifStyleDirective,
];

/**
 * Quick runtime guard used by parse/transform steps.
 * You can replace with richer schema-walk validation later.
 */
export function validateSvjifDirectiveVersion(version: string): { ok: boolean; expected: string } {
  return { ok: version === SVJIF_DIRECTIVE_VERSION, expected: SVJIF_DIRECTIVE_VERSION };
}

/**
 * Checks if schema has the directives we rely on.
 * Strict mode should fail if any required directive is missing.
 */
export function hasRequiredSvjifDirectives(schema: GraphQLSchema): {
  ok: boolean;
  missing: string[];
} {
  const names = new Set(schema.getDirectives().map((d) => d.name));
  const required = ['svjif_scene', 'svjif_node'];
  const missing = required.filter((n) => !names.has(n));
  return { ok: missing.length === 0, missing };
}

/**
 * Optional utility for validating node kind values in transforms.
 */
export function isSvjifNodeKind(value: unknown): value is
  | 'Rect'
  | 'Text'
  | 'Image'
  | 'Group'
  | 'Line'
  | 'Ellipse'
  | 'Path' {
  return (
    value === 'Rect' ||
    value === 'Text' ||
    value === 'Image' ||
    value === 'Group' ||
    value === 'Line' ||
    value === 'Ellipse' ||
    value === 'Path'
  );
}

/**
 * Convenience helper for plugin/packages that build a schema programmatically.
 * If you parse SDL, you'll usually merge these directives with buildSchema/buildASTSchema.
 */
export function withSvjifDirectives(baseSchemaConfig: {
  query: GraphQLObjectType;
  mutation?: GraphQLObjectType;
  subscription?: GraphQLObjectType;
  types?: readonly GraphQLNamedType[];
}): GraphQLSchema {
  return new GraphQLSchema({
    ...baseSchemaConfig,
    directives: [...SVJIF_V1_DIRECTIVES],
  });
}
