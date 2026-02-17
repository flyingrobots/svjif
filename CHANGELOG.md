# Changelog

## Unreleased

### Features

- **`@svjif/compiler-core`**: Semantic validation engine — `validateCanonicalAst()` with two-tier rule registry; Tier 1 (structural: `sceneDimensions`, `nodeKindValid`, `duplicateId`, `danglingRef`, `cycleDetection`) gates Tier 2 (semantic: `requiredProps` per NodeKind); iterative Kahn's cycle detection passes 10k-node chains without stack overflow
- **`@svjif/compiler-core`**: Deterministic IR emitter — `emitSvjifIrArtifact()` replaces stub; two-phase topological sort (Kahn's on `parentId` DAG, tie-broken `zIndex ASC → kind ASC → id ASC` bytewise); strips `sourceRef` and `__typename`
- **`@svjif/compiler-core`**: Determinism certificate — `emitReceiptArtifact()` emits `scene.svjif.json.receipt` alongside IR containing `comparatorVersion`, `inputHash` (SHA-256 of `input.source`), `irVersion`, and `rulesetFingerprint` (SHA-256 of sorted rule IDs)
- **`@svjif/compiler-core`**: TypeScript type emitter — `emitTypesArtifact()` replaces stub; `TypeEmitter` produces `NodeId` literal union, `SceneRoot` interface, per-kind node interfaces (`RectNode`, `TextNode`, …), and `SceneNode` discriminated union via token-based emission
- **`@svjif/compiler-core`**: Identifier utilities — `toTypeIdentifier()` (NFKC normalize → PascalCase → reserved-keyword guard → invalid-start guard) and `buildIdentifierMap()` (bytewise-sorted collision resolution with `__N` suffix) in `src/util/identifiers.ts`
- **`@svjif/compiler-core`**: All three stubs (`validateStub`, `emitIrStub`, `emitTypesStub`) removed from `compile.ts`; real implementations wired

### Features

- **`@svjif/compiler-core`**: Add `SVJIF_E_INPUT_INVALID_JSON` and `SVJIF_E_INPUT_INVALID_SDL` error codes for invalid input (previously misclassified as `E_INTERNAL_INVARIANT`)
- **`@svjif/compiler-core`**: Add `hashString()` and `deterministicId()` hashing utilities in `src/canonical/hashing.ts` with stable SHA-256 contract
- **`@svjif/compiler-core`**: Export `hashString`, `deterministicId`, `HASH_ALGORITHM`, `GraphqlToCanonicalAst`, `ParseInputDeps` from package index
- **`@svjif/compiler-core`**: `compile()` now accepts optional `deps?: ParseInputDeps` second argument for adapter injection
- **`@svjif/compiler-core`**: IR emitter uses `stableStringify`, sorts nodes by `(zIndex asc, id asc)`, strips `sourceRef` from output, adds `hashAlgorithm` to compile metadata
- **`@svjif/compiler-core`**: `CompileMetadata` gains optional `hashAlgorithm` field (narrowed to `'sha256'`)
- **`@svjif/schema-graphql`**: Full GraphQL SDL parser pipeline — `parseGraphql`, `extractScene`, `extractNodes`, `toCanonicalAst`
- **`@svjif/schema-graphql`**: `graphqlToCanonicalAst` adapter exported from package root, satisfies `GraphqlToCanonicalAst` interface from compiler-core
- **`@svjif/schema-graphql`**: Null-safe source location policy (`SourceRef` fallback to `<inline>:1:1` when `loc` absent)
- **`@svjif/schema-graphql`**: `SVJIF_W_UNUSED_FIELD` warning only for unknown `svjif_*`-prefixed directives; non-`svjif_` directives silently ignored
- **`@svjif/wesley-generator`**: Imports and injects `graphqlToCanonicalAst` adapter into `compile()`; adds `@svjif/schema-graphql` dependency

### Tests

- **`@svjif/compiler-core`**: 40 new tests across 2 new test files and 2 extended files — `validateAst` (15), `emitTypes` (19), `determinism` +4, `compile.golden` +3; total 76 tests (up from 36)
- **`@svjif/compiler-core`**: 34 new tests — `stableStringify` (22), `parseInput` table-driven (9), `determinism` (3); total 36 tests
- **`@svjif/schema-graphql`**: 42 new tests — `extractScene` (10), `extractNodes` (10), `toCanonicalAst` (14), `e2e.terminal` (8)
- Cycle detection verifies Tier 2 is suppressed when Tier 1 errors present
- 4 rotated input orderings of the same scene produce byte-identical IR (SHA-256 verified)
- Parent-before-child ordering guaranteed in topological emitter output
- Receipt `inputHash` verified against `sha256(input.source)` in golden tests; two compilations of identical input produce byte-identical receipts
- E2E Terminal SDL fixture compiles to IR with identical SHA-256 on two consecutive runs
- Whitespace-reformatted SDL variant produces identical IR hash (determinism guarantee)

### Bug Fixes

- Invalid JSON input no longer emits `SVJIF_E_INTERNAL_INVARIANT`; now correctly emits `SVJIF_E_INPUT_INVALID_JSON`
- Invalid GraphQL SDL input now emits `SVJIF_E_INPUT_INVALID_SDL` instead of `SVJIF_E_INTERNAL_INVARIANT`
- `NaN` scene dimensions now correctly rejected by `sceneDimensions` validation rule
- `E_CYCLE_DETECTED` no longer spuriously triggered when duplicate node IDs are present
- `NodeId` union in emitted TypeScript types is now sorted lexicographically for deterministic output
- `emit.jsonSchema: true` no longer leaves partial artifacts on error — guard runs before any emission
- `metadata.irVersion` now correctly reflects artifact presence rather than `ok` flag

### Documentation

- `docs/ERROR_CODES.md`: Added `SVJIF_E_INPUT_INVALID_JSON` and `SVJIF_E_INPUT_INVALID_SDL` entries
