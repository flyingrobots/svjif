# SVJif Compiler Architecture

## Overview

SVJif uses a **clean seam architecture** where the compiler core remains framework-agnostic and integrations (like Wesley) are thin adapter layers.

## Package Responsibilities

### `@svjif/compiler-core`
**Pure domain logic. Zero external framework dependencies.**

- **Types** (`src/types/`): Canonical AST, IR, compiler contracts
- **Errors** (`src/errors/`): Structured error taxonomy
- **Compile** (`src/compile/`): Orchestration, parse, validate, emit phases
- **Canonical** (`src/canonical/`): Normalization, deterministic IDs, stable ordering
- **Util** (`src/util/`): Deterministic JSON serialization, hashing helpers

**Key principle**: No Wesley types, no GraphQL AST leaks beyond parse phase.

### `@svjif/schema-graphql`
**GraphQL SDL → Canonical AST adapter**

- **Directives** (`src/directives/`): Directive definitions, version validation
- **Parse** (`src/parse/`): SDL → GraphQL AST → scene/nodes extraction
- **Transform** (`src/transform/`): GraphQL AST → Canonical AST
- **Errors** (`src/errors/`): GraphQL-specific parse errors

**Key principle**: Exports pure functions that compiler-core can inject. No global state.

### `@svjif/wesley-generator`
**Wesley GeneratorPlugin adapter**

- **SVJifGeneratorPlugin** (`src/SVJifGeneratorPlugin.ts`): Wesley plugin lifecycle
- **Diagnostics adapter** (`src/diagnosticsAdapter.ts`): Maps compiler diagnostics → Wesley evidence

**Key principle**: Thin transport layer. Brain lives in compiler-core.

## Compilation Pipeline

```
Input (SDL or canonical JSON)
  ↓
parseInputToCanonicalAst()
  ↓
Canonical AST
  ↓
normalizeCanonicalAst() [deterministic]
  ↓
validateCanonicalAst() [semantic checks]
  ↓
emitSvjifIr() + emitTypes() + emitSchema()
  ↓
Artifacts (scene.svjif.json, types.ts, etc.)
```

### Phase 1: Parse
- **Input**: SDL string or canonical AST JSON
- **Output**: Canonical AST (validated structure)
- **Errors**: Parse errors, directive errors

### Phase 2: Canonicalization
- **Input**: Canonical AST
- **Output**: Normalized Canonical AST
- **Operations**:
  - Deterministic ID assignment (hash-based)
  - Node sorting (zIndex → parentId → id)
  - Property key ordering (lexicographic)
  - Default value materialization

### Phase 3: Validation
- **Input**: Normalized Canonical AST
- **Output**: Diagnostics (errors/warnings)
- **Checks**:
  - Semantic rules (required props, valid values)
  - Graph integrity (no cycles, valid parent refs)
  - Binding targets exist
  - Style applicability

### Phase 4: Emit
- **Input**: Validated Canonical AST
- **Output**: ArtifactMap
- **Emitters**:
  - `emitSvjifIr()` → scene.svjif.json
  - `emitTypes()` → types.ts
  - `emitSchema()` → scene.svjif.schema.json (optional)

## Determinism

All operations are deterministic:

1. **IDs**: Hash of semantic path (sceneId + typeName + fieldName), never random UUIDs
2. **Ordering**: Stable sort (zIndex asc, parentId asc, id asc)
3. **Serialization**: `stableStringify()` with lexicographic key sort
4. **Hashing**: SHA-256 (abstract behind `hashString()` for future BLAKE3 migration)

## Error Handling

**User errors** → Diagnostics (never throw)
**Internal faults** → Throw `InternalCompilerError`

Error codes:
- `SVJIF_E_*` - Errors (compilation fails)
- `SVJIF_W_*` - Warnings (compilation succeeds unless `failOnWarnings: true`)

See [`docs/ERROR_CODES.md`](./ERROR_CODES.md) for complete taxonomy.

## Testing Strategy

1. **Golden tests**: Valid fixture → expected artifacts (snapshot)
2. **Negative tests**: Invalid fixture → expected error codes
3. **Determinism tests**: Compile twice → identical byte output
4. **Round-trip tests**: Canonical AST → IR → Canonical AST (future)

## Versioning

- **AST version**: `astVersion: "1"` (canonical AST)
- **IR version**: `irVersion: "svjif-ir/1"` (output format)
- **Directive version**: `v: "1"` (GraphQL directives)

All versions are explicit and validated. Unknown versions → hard error.

## Migration Path (v0.1 → v0.2)

Current limitations in v0.1:
- GraphQL directive args use JSON strings for complex props (ugly but pragmatic)
- Single output target (`svjif-ir-v1`)
- No binary packer (`.svjifb` format)

Planned for v0.2:
- Typed input objects for directive args
- Multiple output targets (prove abstraction)
- Binary packer as post-step
- Source maps (IR nodes → SDL line/column)
