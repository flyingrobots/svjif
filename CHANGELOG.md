# Changelog

## Unreleased

### Dependencies

- Bump `vitest` from `^1.3.0` to `^3.2.4` across all packages; add `esbuild >=0.25.0` override (CVE fix)

### Features

- **`@svjif/compiler-core`**: Semantic validation engine — `validateCanonicalAst()` with two-tier rule registry; Tier 1 (structural: `sceneDimensions`, `nodeKindValid`, `duplicateId`, `danglingRef`, `cycleDetection`) gates Tier 2 (semantic: `requiredProps` per NodeKind); iterative Kahn's cycle detection passes 10k-node chains without stack overflow
- **`@svjif/compiler-core`**: Deterministic IR emitter — `emitSvjifIrArtifact()` replaces stub; two-phase topological sort (Kahn's on `parentId` DAG, tie-broken `zIndex ASC → kind ASC → id ASC` bytewise); strips `sourceRef` and `__typename`
- **`@svjif/compiler-core`**: Determinism certificate — `emitReceiptArtifact()` emits `scene.svjif.json.receipt` alongside IR containing `comparatorVersion`, `inputHash` (SHA-256 of `input.source`), `irHash` (SHA-256 of the emitted IR), `irHashAlg` (`"sha256"`), `irVersion`, and `rulesetFingerprint` (SHA-256 of sorted rule IDs)
- **`@svjif/compiler-core`**: TypeScript type emitter — `emitTypesArtifact()` replaces stub; `TypeEmitter` produces `NodeId` literal union, `SceneRoot` interface, per-kind node interfaces (`RectNode`, `TextNode`, …), and `SceneNode` discriminated union via token-based emission
- **`@svjif/compiler-core`**: Identifier utilities — `toTypeIdentifier()` (NFKC normalize → PascalCase → reserved-keyword guard → invalid-start guard) and `buildIdentifierMap()` (bytewise-sorted collision resolution with `__N` suffix) in `src/util/identifiers.ts`
- **`@svjif/compiler-core`**: All three stubs (`validateStub`, `emitIrStub`, `emitTypesStub`) removed from `compile.ts`; real implementations wired
- **`@svjif/compiler-core`**: Add `SVJIF_E_INPUT_INVALID_JSON` and `SVJIF_E_INPUT_INVALID_SDL` error codes for invalid input (previously misclassified as `E_INTERNAL_INVARIANT`)
- **`@svjif/compiler-core`**: Add `hashString()` and `deterministicId()` hashing utilities in `src/canonical/hashing.ts` with stable SHA-256 contract
- **`@svjif/compiler-core`**: Export `hashString`, `deterministicId`, `HASH_ALGORITHM`, `GraphqlToCanonicalAst`, `ParseInputDeps` from package index
- **`@svjif/compiler-core`**: `compile()` now accepts optional `deps?: ParseInputDeps` second argument for adapter injection
- **`@svjif/compiler-core`**: IR emitter uses `stableStringify`, sorts nodes by `zIndex ASC → kind ASC → id ASC` (bytewise), strips `sourceRef` from output, adds `hashAlgorithm` to compile metadata
- **`@svjif/compiler-core`**: `CompileMetadata` gains optional `hashAlgorithm` field (narrowed to `'sha256'`)
- **`@svjif/schema-graphql`**: Full GraphQL SDL parser pipeline — `parseGraphql`, `extractScene`, `extractNodes`, `toCanonicalAst`
- **`@svjif/schema-graphql`**: `graphqlToCanonicalAst` adapter exported from package root, satisfies `GraphqlToCanonicalAst` interface from compiler-core
- **`@svjif/schema-graphql`**: Null-safe source location policy (`SourceRef` fallback to `<inline>:1:1` when `loc` absent)
- **`@svjif/schema-graphql`**: `SVJIF_W_UNUSED_FIELD` warning only for unknown `svjif_*`-prefixed directives; non-`svjif_` directives silently ignored
- **`@svjif/wesley-generator`**: Imports and injects `graphqlToCanonicalAst` adapter into `compile()`; adds `@svjif/schema-graphql` dependency

### Tests

- **`@svjif/compiler-core`**: 74 new tests across sprint 3 — first batch: `stableStringify` (22), `parseInput` table-driven (9), `determinism` (3) → 36 tests; second batch: `validateAst` (15), `emitTypes` (19), `determinism` +4, `compile.golden` +3 → total 79 tests
- **`@svjif/schema-graphql`**: 42 new tests — `extractScene` (10), `extractNodes` (10), `toCanonicalAst` (14), `e2e.terminal` (8)
- Cycle detection verifies Tier 2 is suppressed when Tier 1 errors present
- 4 rotated input orderings of the same scene produce byte-identical IR (SHA-256 verified)
- Parent-before-child ordering guaranteed in topological emitter output
- Receipt `inputHash` verified against `sha256(input.source)` in golden tests; two compilations of identical input produce byte-identical receipts
- E2E Terminal SDL fixture compiles to IR with identical SHA-256 on two consecutive runs
- Whitespace-reformatted SDL variant produces identical IR hash (determinism guarantee)

### Bug Fixes

- `emitIr`: O(n²) `shift()`+re-sort queue replaced with `qi`-pointer dequeue and batch merge of newly-ready children — O(n log n) for tree-structured graphs
- `schema-graphql/adapter`: diagnostic message now embedded in thrown `Error` when `extractScene` fails; "see diagnostics" was a lie when caller omitted the `diagnostics` array
- `schema-graphql/extractNodes`: `knownSvjifDirs` `Set` was re-allocated inside a nested loop on every call; hoisted to module-level constant
- `schema-graphql/extractNodes`: invalid `props` JSON argument now emits a `W_UNUSED_FIELD` warning instead of silently discarding the value
- `identifiers`: `buildIdentifierMap` now throws immediately on duplicate source strings instead of silently producing a corrupt output `Map`
- `test/determinism`: rotation test loop corrected to produce 4 distinct orderings, matching its description (old loop generated 4 unique rotations but iterated 10 times)
- `emitIr`: `IR_VERSION`, `IR_ARTIFACT_KEY`, `IR_RECEIPT_KEY` exported as named constants; magic string literals removed from `compile.ts` and `emitIr.ts`
- `identifiers`: `RESERVED.has(result.toLowerCase())` removed — PascalCase output like `'Delete'` is a valid TypeScript identifier; only exact-case match is checked
- `parseGraphql`: SDL wrapped in `Source(sdl, filename)` so the returned `DocumentNode` carries filename metadata through to downstream diagnostics
- `test/determinism`: shuffle fixture aligned with `BASE_INPUT` — added `visible: true` to all nodes and `units: 'px'` to scene
- `docs/ERROR_CODES.md`: corrected `Rect` required props example — only `width` and `height` are required; `x` and `y` are optional

- Invalid JSON input no longer emits `SVJIF_E_INTERNAL_INVARIANT`; now correctly emits `SVJIF_E_INPUT_INVALID_JSON`
- Invalid GraphQL SDL input now emits `SVJIF_E_INPUT_INVALID_SDL` instead of `SVJIF_E_INTERNAL_INVARIANT`
- `NaN` scene dimensions now correctly rejected by `sceneDimensions` validation rule
- `E_CYCLE_DETECTED` no longer spuriously triggered when duplicate node IDs are present
- `NodeId` union in emitted TypeScript types is now sorted lexicographically for deterministic output
- `emit.jsonSchema: true` no longer leaves partial artifacts on error — guard runs before any emission
- `metadata.irVersion` now correctly reflects artifact presence rather than `ok` flag

### Documentation

- `docs/ERROR_CODES.md`: Added `SVJIF_E_INPUT_INVALID_JSON` and `SVJIF_E_INPUT_INVALID_SDL` entries
- `docs/ERROR_CODES.md`: Corrected `SVJIF_E_REF_TARGET_NOT_FOUND` — `refKind` detail is `"animation"` only; bindings use `SVJIF_E_BIND_TARGET_NOT_FOUND`

### Post-Sprint-3 PR Feedback (Round 5)

- `schema-graphql/extractNodes`: removed redundant `!== 'svjif_node'` guard — `svjif_node` is already in `KNOWN_SVJIF_DIRS`, so the outer check was dead code
- `schema-graphql/extractNodes`: props JSON that parses successfully but is not an object (e.g. arrays, primitives) now emits `E_DIRECTIVE_ARG_INVALID_TYPE` warning — previously discarded silently
- `schema-graphql/parseGraphql`: extracted `filename ?? '<inline>'` to `effectiveName` const — eliminates triple repetition in the function body
- `errors/codes.ts`: moved `E_FEATURE_NOT_IMPLEMENTED` out of "Emit / runtime" to its own "General / cross-phase" section with a clarifying JSDoc; added `@deprecated` note on `W_BINARY_PACK_NOT_IMPLEMENTED`
- `test/validateAst`: added `validateCanonicalAst(undefined)` test + `NaN`/`Infinity` dimension tests (3 new tests, 19 total)
- `test/emitTypes`: pinned exact expected values for `toTypeIdentifier` loose assertions (`'🚀'` → `'Anonymous'`, `'type'` → `'Type'`); pinned collision winner per bytewise ordering
- `test/stableStringify`: added NaN, Infinity, -Infinity, and top-level-undefined serialization contract tests (4 new tests, 26 total)

### Post-Sprint-3 PR Feedback (Round 4)

- `emitIr`: `normalizeZIndex` now guards against `NaN`/`Infinity` via `Number.isFinite` — previously these values passed through and corrupted the topological sort comparator
- `emitIr`: `emitReceiptArtifact` parameter widened to `ReadonlyArray<string>` to match the readonly `VALIDATION_RULE_IDS` export
- `validateAst`: `VALIDATION_RULE_IDS` exported as `ReadonlyArray<string>` — prevents external mutation of the rule-ID array used in the receipt fingerprint
- `schema-graphql/extractNodes`: invalid `props` JSON now emits `E_DIRECTIVE_ARG_INVALID_TYPE` (not `W_UNUSED_FIELD`) — more precise error classification
- `schema-graphql`: extracted shared `nodeSourceRef` utility into `src/parse/sourceRef.ts` — eliminates verbatim duplication across `extractScene.ts` and `extractNodes.ts`
- `test/validateAst`: renamed misleading "deep spiral with cycle at tip" test description to "complete ring cycle" — the fixture is a fully-cyclic ring, not a spiral
- `test/e2e.terminal`: removed redundant `sha256` assertion from determinism test — string equality already implies hash equality
- `test/determinism`: parent-before-child and tie-breaking fixtures now include `visible: true` on nodes and `units: 'px'` on scene, matching `BASE_INPUT` shape
