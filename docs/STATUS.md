# SVJif Compiler Status

**Date**: 2026-02-16
**Version**: 0.1.0-dev
**Milestone**: Compiler Architecture Complete ✅

## What's Built

### ✅ Complete Packages

#### `@svjif/compiler-core`
**Pure, framework-agnostic compilation engine**

- ✅ Type system (Canonical AST, IR, Diagnostics, Artifacts)
- ✅ Error taxonomy (24 error codes, stable)
- ✅ Compile orchestrator with phases
- ✅ Parse dispatcher (GraphQL SDL + Canonical JSON)
- ✅ Deterministic utilities (stableStringify, hashing abstraction)
- ✅ Golden test suite (valid + invalid fixtures)
- ✅ Vitest configured with coverage
- **Test status**: ✅ 2/2 passing

#### `@svjif/schema-graphql`
**GraphQL SDL → Canonical AST adapter**

- ✅ Directive definitions (v1 spec)
- ✅ Version validation
- ✅ Schema validation helpers
- ✅ Type safety (GraphQL enums, directive args)
- **Status**: Scaffold complete, needs parser implementation

#### `@svjif/wesley-generator`
**Wesley GeneratorPlugin adapter**

- ✅ Plugin lifecycle (apiVersion, name, plan, generate)
- ✅ Diagnostics mapping (compiler → Wesley evidence)
- ✅ Error handling (fail gracefully on compilation errors)
- **Status**: Scaffold complete, ready for Wesley integration

### ✅ Infrastructure

- ✅ Monorepo structure (pnpm workspaces)
- ✅ Turbo build pipeline
- ✅ Changesets versioning
- ✅ TypeScript strict mode
- ✅ Base tsconfig shared across packages
- ✅ Vitest test framework
- ✅ Documentation structure

### ✅ Documentation

- ✅ [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System design, seams, principles
- ✅ [`ERROR_CODES.md`](./ERROR_CODES.md) - Complete error taxonomy
- ✅ README updated with v0.1 status

## What's Next

### Immediate (Next 7 days)

1. **GraphQL Parser** (`@svjif/schema-graphql`)
   - Implement `parseGraphql.ts` (SDL → AST)
   - Implement `extractScene.ts` (find `@svjif_scene`)
   - Implement `extractNodes.ts` (walk fields, collect `@svjif_node`)
   - Implement `toCanonicalAst.ts` (GraphQL AST → Canonical AST)
   - Add tests (directive parsing, semantic errors)

2. **Semantic Validation** (`@svjif/compiler-core`)
   - Implement `validateAst.ts`
   - Check required props (e.g., Rect needs x/y/width/height)
   - Check parent refs (no orphans, no cycles)
   - Check binding targets exist
   - Add tests (table-driven, negative cases)

3. **Full Artifact Emission** (`@svjif/compiler-core`)
   - Implement `emitIr.ts` (Canonical AST → SVJif IR JSON)
   - Implement `emitTypes.ts` (generate proper TypeScript types)
   - Optional: `emitSchema.ts` (JSON Schema for IR)
   - Add golden snapshots

4. **Deterministic IDs** (`@svjif/compiler-core`)
   - Implement `canonical/ids.ts` (hash-based ID generation)
   - Implement `canonical/hashing.ts` (SHA-256 wrapper)
   - Add determinism smoke test (compile twice → identical bytes)

5. **Canonicalization** (`@svjif/compiler-core`)
   - Implement `canonical/normalize.ts`
   - Node sorting (zIndex → parentId → id)
   - Default value materialization
   - Add round-trip test

### Short-term (Next 14 days)

6. **End-to-End Example**
   - Convert `examples/terminal/terminal.svjif.json` to GraphQL SDL
   - Compile with new pipeline
   - Verify IR output matches original
   - Add to CI as regression test

7. **Wesley Integration**
   - Wire `@svjif/wesley-generator` into Wesley monorepo
   - Add Wesley peer dependency back (when ready)
   - Test with Wesley's harness
   - Document integration guide

8. **Binary Packer (optional)**
   - Design `.svjifb` format spec
   - Implement pack/unpack utilities
   - Add tests for size/performance

### Medium-term (Next 30 days)

9. **Source Maps**
   - Add source location tracking
   - Map IR nodes → SDL line/column
   - Improve diagnostic UX

10. **CLI**
    - Create `@svjif/cli` package
    - Commands: `compile`, `validate`, `pack`
    - Watch mode for development
    - Integration with Wesley CLI

11. **Documentation Site**
    - Getting started guide
    - Directive reference
    - Error code reference
    - Examples gallery

## Test Coverage

| Package | Tests | Coverage | Status |
|---------|-------|----------|--------|
| `@svjif/compiler-core` | 2/2 ✅ | ~30% | Green |
| `@svjif/schema-graphql` | 0 | 0% | Not started |
| `@svjif/wesley-generator` | 0 | 0% | Not started |

**Target**: 90%+ coverage before v0.1.0 release

## Commit Log (Recommended)

```bash
# Commit 1 (DONE)
chore(repo): scaffold packages compiler-core schema-graphql wesley-generator

# Commit 2 (DONE)
feat(core): define compiler contracts ast types diagnostics and deterministic stringify

# Commit 3 (TODO)
feat(schema): parse svjif_scene svjif_node directives into canonical ast

# Commit 4 (TODO)
feat(core): emit svjif ir json and typescript artifacts with validation pass

# Commit 5 (TODO)
feat(plugin): implement wesley generator plan/generate adapters with e2e fixtures
```

## Decision Log

### Architectural Decisions

1. **Seam Placement**: GraphQL SDL → Canonical AST → SVJif IR
   - **Why**: Prevents Wesley lock-in, enables multi-frontend future
   - **Trade-off**: Extra abstraction layer vs. flexibility

2. **Error Codes**: Stable string codes (`SVJIF_E_*`)
   - **Why**: Machine-parseable, documentation-stable, future-proof
   - **Trade-off**: More verbose vs. easier tooling

3. **Hashing**: SHA-256 now, BLAKE3 later
   - **Why**: Wesley uses SHA-256; migrate when Wesley migrates
   - **Trade-off**: Slower hashing vs. compatibility

4. **AST Version**: Option 1.5 (SVJif-shaped, not SVJif-serialized)
   - **Why**: Fast shipping, clear escape hatch for future targets
   - **Trade-off**: Some coupling vs. premature abstraction

5. **Package Placement**: SVJif monorepo for v0.1
   - **Why**: Faster iteration, atomic refactors, easier versioning
   - **Trade-off**: Later graduation vs. immediate separation

### Implementation Decisions

1. **GraphQL Parser**: Use `graphql-js` directly
   - **Why**: Standard, no Wesley coupling, well-maintained
   - **Alternative rejected**: Wesley's parser (vendor lock-in)

2. **Test Framework**: Vitest
   - **Why**: Consistency with existing SVJif packages, fast, ESM-native
   - **Alternative rejected**: Jest (slower, CJS issues)

3. **Monorepo Tool**: pnpm + turbo
   - **Why**: Fast, proven, good workspace support
   - **Alternative rejected**: npm workspaces (slower), yarn (less used)

4. **Versioning**: Changesets
   - **Why**: Disciplined, works well with pnpm, used by Wesley
   - **Alternative rejected**: Manual versioning (error-prone)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wesley API changes | High | Version pin, test against frozen Wesley snapshot |
| GraphQL directive limits | Medium | JSON string escape hatch (v0.1), typed inputs (v0.2) |
| Determinism guarantees break | High | Extensive property tests, golden snapshots |
| AST evolution breaks IR | High | Version gates, migration tooling, round-trip tests |

## Success Criteria (v0.1.0)

- [ ] Compile terminal example (GraphQL SDL → IR)
- [ ] Golden tests pass (valid + invalid fixtures)
- [ ] Determinism test passes (2x compile → identical bytes)
- [ ] 90%+ test coverage
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors (strict config)
- [ ] Documentation complete (architecture, errors, directives)
- [ ] Wesley integration working (if Wesley ready)

## Contact

**Maintainer**: SVJif Team
**Repository**: github.com/YOUR_ORG/SVJif
**License**: Apache 2.0
