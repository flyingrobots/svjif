# Changelog

## Unreleased

### Features

- **`@svjif/compiler-core`**: Add `SVJIF_E_INPUT_INVALID_JSON` error code for invalid JSON input (previously misclassified as `E_INTERNAL_INVARIANT`)
- **`@svjif/compiler-core`**: Add `hashString()` and `deterministicId()` hashing utilities in `src/canonical/hashing.ts` with stable SHA-256 contract
- **`@svjif/compiler-core`**: Export `hashString`, `deterministicId`, `HASH_ALGORITHM`, `GraphqlToCanonicalAst`, `ParseInputDeps` from package index
- **`@svjif/compiler-core`**: `compile()` now accepts optional `deps?: ParseInputDeps` second argument for adapter injection
- **`@svjif/compiler-core`**: IR emitter uses `stableStringify`, sorts nodes by `(zIndex asc, id asc)`, strips `sourceRef` from output, adds `hashAlgorithm` to compile metadata
- **`@svjif/compiler-core`**: `CompileMetadata` gains optional `hashAlgorithm` field
- **`@svjif/schema-graphql`**: Full GraphQL SDL parser pipeline — `parseGraphql`, `extractScene`, `extractNodes`, `toCanonicalAst`
- **`@svjif/schema-graphql`**: `graphqlToCanonicalAst` adapter exported from package root, satisfies `GraphqlToCanonicalAst` interface from compiler-core
- **`@svjif/schema-graphql`**: Null-safe source location policy (`SourceRef` fallback to `<inline>:1:1` when `loc` absent)
- **`@svjif/schema-graphql`**: `SVJIF_W_UNUSED_FIELD` warning only for unknown `svjif_*`-prefixed directives; non-`svjif_` directives silently ignored
- **`@svjif/wesley-generator`**: Imports and injects `graphqlToCanonicalAst` adapter into `compile()`; adds `@svjif/schema-graphql` dependency

### Tests

- **`@svjif/compiler-core`**: 34 new tests — `stableStringify` (22), `parseInput` table-driven (9), `determinism` (3); total 36 tests
- **`@svjif/schema-graphql`**: 42 new tests — `extractScene` (10), `extractNodes` (10), `toCanonicalAst` (14), `e2e.terminal` (8)
- E2E Terminal SDL fixture compiles to IR with identical SHA-256 on two consecutive runs
- Whitespace-reformatted SDL variant produces identical IR hash (determinism guarantee)

### Bug Fixes

- Invalid JSON input no longer emits `SVJIF_E_INTERNAL_INVARIANT`; now correctly emits `SVJIF_E_INPUT_INVALID_JSON`

### Documentation

- `docs/ERROR_CODES.md`: Added `SVJIF_E_INPUT_INVALID_JSON` entry
