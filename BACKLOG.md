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

---

## Post-Sprint 3 PR Feedback (Round 2)

### ESLint — add no-new-in-loops rule for Set/Map allocations
**Source**: PR #1 review retrospective

`new Set([...])` was allocated inside a nested loop in `extractNodes.ts` on every directive of
every field. A custom ESLint rule (or `no-restricted-syntax` selector) that flags `new Set(` /
`new Map(` inside loop bodies would catch this class of issue automatically during development.

---

### `DiagnosticsError` — attach diagnostics array to thrown Errors
**Source**: PR #1 review retrospective

When `adapter.ts` throws on `extractScene` failure, the thrown `Error` said "see diagnostics"
but the diagnostics were in a local array invisible to the caller. Introduce a `DiagnosticsError`
class in `@svjif/compiler-core` that carries a `diagnostics: Diagnostic[]` field. Any throw site
that has collected diagnostics should use this class so callers can always inspect the reason.

---

### `buildIdentifierMap` — property-based tests (fast-check)
**Source**: PR #1 review retrospective

A latent bug in `buildIdentifierMap` for duplicate source strings was discovered during code
review — the output `Map` silently overwrote earlier entries. Property-based testing with
`fast-check` (arbitrary string arrays, including duplicates) would have caught this. Extend the
existing `fast-check` backlog item (#4) or add a dedicated suite for `identifiers.ts`.

---

### `extractNodes` — add test: `W_UNUSED_FIELD` emitted for malformed `props` JSON
**Source**: PR #1 review retrospective

`extractNodes.ts` now emits `W_UNUSED_FIELD` when the `props` directive argument contains
invalid JSON. Add a test in `extractNodes.test.ts` asserting that a field with `props: "bad json"`
produces exactly one `W_UNUSED_FIELD` warning with the expected message.

---

### `identifiers` — add test: `buildIdentifierMap` throws on duplicate sources
**Source**: PR #1 review retrospective

`buildIdentifierMap` now throws `Error('buildIdentifierMap: duplicate source strings are not
supported')` when given duplicate inputs. Add a unit test asserting this throw, and a
complementary test that unique inputs with the same `toTypeIdentifier` result (collision)
still produce the correct `__N`-suffixed output.

---

## Post-Sprint 3 PR Feedback (Round 3)

### `compiler-core` — extract a `constants.ts` barrel for all artifact path strings
**Source**: PR #1 review retrospective

`'scene.svjif.json'`, `'scene.svjif.json.receipt'`, and `'svjif-ir/1'` were used as string
literals in multiple files before being extracted as named constants in round 3. A single
`src/constants.ts` barrel (or equivalent) for all artifact paths, IR version strings, and other
shared literals would prevent this class of issue from recurring across future sprints.

---

### CI — add markdownlint for CHANGELOG and docs validation
**Source**: PR #1 review retrospective

The CHANGELOG had duplicate `### Features` and `### Tests` headings, a missing `kind ASC`
tie-breaker in a sort order description, and descending test count bullets — all caught in code
review, not CI. Add `markdownlint` (with `MD024` for duplicate headings) to the CI pipeline and
enforce it on `CHANGELOG.md` and `docs/`. Consider a custom rule or script to detect
contradictory/descending test count totals.

---

### `CONTRIBUTING.md` — document the artifact path constants convention
**Source**: PR #1 review retrospective

Add a `CONTRIBUTING.md` section (or expand an existing one) that states: "Never use string
literals for artifact paths, IR versions, or other shared protocol strings. Import and use the
exported constants from `src/constants.ts` (or the relevant module). Inline string literals that
duplicate a constant will be rejected in code review."

---

### `buildIdentifierMap` — resolve API contract: `Map<string,string>` vs `string[]`
**Source**: PR #1 review retrospective (raised in rounds 2 and 3)

CodeRabbit flagged in two consecutive reviews that `Map<string,string>` collapses duplicate
source strings and suggested returning `string[]` (parallel to input) instead. The current
implementation throws on duplicates as a guard. Decide the definitive API contract in a focused
PR: either keep `Map<string,string>` with the throw guard (and document it clearly), or change
the return type to `string[]` and update all callers and tests accordingly.

---

### `schema-graphql/extractNodes` — runtime type validation for directive argument values
**Source**: PR #1 review retrospective (raised in rounds 2–5, deferred)

`getDirectiveArgValue` returns `string | number | boolean | undefined`, but the call sites at
lines 102–109 in `extractNodes.ts` cast results with `as number | undefined`, `as boolean | undefined`,
etc., without any runtime type assertion. If a user writes `@svjif_node(x: "oops")`, the string
`"oops"` silently passes through as a `number` at the type level, corrupting geometry downstream.

Fix: replace the unsafe `as` casts with runtime type guards that emit `E_DIRECTIVE_ARG_INVALID_TYPE`
when the actual value type doesn't match the expected type (e.g. `typeof val === 'number'` for
numeric args). Only `kind` (enum string) and `props` (special JSON parse) need special treatment.

---

### `schema-graphql` e2e — add explicit tie-breaking assertion for same-zIndex nodes
**Source**: PR #1 review retrospective (rounds 3–5)

The Terminal SDL e2e test (`e2e.terminal.test.ts`) verifies that nodes are sorted by `zIndex`
in the IR output but does not verify the within-zIndex tie-breaker: `kind ASC → id ASC` (bytewise).
The Terminal fixture has three nodes all at `zIndex: 0` (none specified), so the output order is
entirely determined by the tie-breaker. Add an assertion that pins the exact node order
(e.g. `expect(ir.nodes.map(n => n.id)).toEqual(['expected', 'order', 'here'])`) to verify
the tie-breaking contract end-to-end.

---

### `compiler-core/types/compiler.ts` — clarify receipt auto-emission coupling
**Source**: PR #1 review round 5

`emit.irJson: true` silently co-emits the receipt artifact with no public API knob to disable it.
Add a JSDoc comment on the `irJson` field explaining that the receipt is always co-emitted when
`irJson` is enabled. Alternatively, expose a `receipt?: boolean` field in the emit options
(defaulting to `true` when `irJson` is enabled) to make the coupling explicit in the public API.

---
