# SVJif Backlog

Items that are scoped, not urgent, and not yet scheduled for a sprint.
Each item links to its corresponding GitHub issue for discussion and tracking.

---

## Compiler Core

### `buildIdentifierMap` — add `deduplicate` option
**Issue**: [#2](https://github.com/flyingrobots/svjif/issues/2)

`buildIdentifierMap(sources, opts)` currently accepts duplicate source strings but the
`Map<string, string>` return type can only hold one value per key, making the behaviour on
duplicates implicit. Add a `deduplicate?: boolean` option that, when `false` (default),
documents and tests the per-occurrence uniqueness guarantee explicitly.

---

### `emitReceiptArtifact` — move to artifact builder method
**Issue**: [#3](https://github.com/flyingrobots/svjif/issues/3)

`emitReceiptArtifact(input, irContent, ruleIds)` receives the IR content as a raw string,
creating an implicit coupling between caller and callee on string type correctness. Consider
an `ArtifactBuilder` class or builder pattern so IR content never crosses a function boundary
as an untyped string — the builder holds the IR artifact and computes the receipt internally.

---

### `validateAst` — property-based fuzz tests (fast-check)
**Issue**: [#4](https://github.com/flyingrobots/svjif/issues/4)

Add fuzz coverage via `fast-check` for:
- `detectCycles`: arbitrary DAGs with random parent assignments including cycles, duplicate IDs, and disconnected subgraphs
- `sceneDimensions`: numeric edge cases (`NaN`, `Infinity`, `-0`, `Number.MIN_VALUE`)
- `requiredProps`: randomly missing props across all NodeKinds

Target package: `@svjif/compiler-core`. Add `fast-check` as a dev dependency.

---

### `emitTypes` test — CI-gated TSC typecheck
**Issue**: [#5](https://github.com/flyingrobots/svjif/issues/5)

`emitTypes.test.ts` shells out to `node_modules/.bin/tsc` with a hardcoded path that breaks
under PNP or hoisted workspace setups. Fix by resolving via `require.resolve('typescript/bin/tsc')`
and gate the slow typecheck behind `process.env.CI || process.env.TSC_GATE` so local runs stay fast.

---

### `emitTypes` test — Group-kind zero-props interface
**Issue**: [#6](https://github.com/flyingrobots/svjif/issues/6)

No test asserts that a scene containing only `Group` nodes emits a valid `GroupNode` interface
with an empty `props` block. This is an edge case in `TypeEmitter.emitKindInterface` where
`KIND_PROP_TYPES[kind]` returns an empty array. Add a dedicated test.

---

## Schema GraphQL

### `parseInput.ts` — surface `E_INPUT_INVALID_SDL` source location to diagnostics
**Issue**: [#7](https://github.com/flyingrobots/svjif/issues/7)

When `parseGraphql` throws a `ParseError` with `E_INPUT_INVALID_SDL`, `parseInput.ts` currently
catches it and converts to a diagnostic but loses the GraphQL source location (`line`, `column`)
from the original `ParseError`. Propagate the location into `Diagnostic.details` so callers can
report precise SDL error positions to users.
