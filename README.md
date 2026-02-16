# SVJif

**Scene Vector Jraphics interface format**

Pronounced: **"Scene Vector Jif"** (/siːn ˈvɛktər dʒɪf/)

Deterministic GPU scene IR for interactive vector UI.

> Unlike legacy SVG weirdness, SVJif uses a sane Euclidean coordinate space:
> - explicit origin
> - explicit units
> - explicit transforms
> - deterministic layout + draw

## Status: v0.1.0-dev 🚧

**Compiler architecture complete.** Now implementing:
- GraphQL → Canonical AST parser
- Semantic validation
- Full artifact emission

## What is SVJif?

SVJif is the **canonical intermediate representation** for GPU-native vector UI rendering. It's not a replacement for SVG or the browser DOM—it's the universal compile target for high-performance GPU rendering.

**Think LLVM IR, but for UI.**

## What is GPVue?

**GPVue** is the developer-facing Vue SDK that compiles Vue components to SVJif for deterministic GPU rendering.

**Positioning:** GPVue compiles Vue components to SVJif for deterministic GPU rendering.

At runtime: no CSS parser, no cascade—only deterministic subtree relayout and GPU draw.

## Architecture

```
GPVue / GPReact / GPSvelte / GPFigma
              ↓
       SVJif IR (universal format)
              ↓
    ┌─────────┼─────────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓         ↓
  WebGL    WebGPU     Metal    Vulkan     wgpu
 (browser) (browser)  (Apple)  (native)   (Rust)
```

**SVJif is the compile target. Renderers are swappable.**

Like LLVM IR → multiple backends, or WASM → multiple runtimes.

## Architecture

```
Vue/Figma/SVG
       ↓
  SVJif Compiler (build time)
       ↓
   SVJif IR (.svjif.json)
       ↓
   Pack (.svjif.bin)
       ↓
  WebGL Runtime (GPU rendering)
```

## Key Principles

1. **Deterministic** - Same IR in, same pixels out
2. **Build-time CSS** - No runtime parsing or cascade
3. **Runtime layout VM** - Only recompute dirty subtrees
4. **GPU-native** - Direct shader rendering
5. **Fail loud** - Unsupported features are compile errors

## Project Status

🚧 **v0.1 in development** - Terminal rendering proof of concept

## Repository Structure

```
SVJif/
  packages/
    # SVJif Core (universal IR)
    core/              # @svjif/core - IR types, validation
    compiler/          # @svjif/compiler - Base compiler infra
    cli/               # @svjif/cli - Command-line tools

    # SVJif Runtimes (swappable backends)
    runtime-webgl/     # @svjif/runtime-webgl - WebGL (browser)
    runtime-webgpu/    # @svjif/runtime-webgpu - WebGPU (modern browser)
    runtime-metal/     # @svjif/runtime-metal - Metal (Apple native)
    runtime-wgpu/      # @svjif/runtime-wgpu - wgpu (Rust)
    runtime-vulkan/    # @svjif/runtime-vulkan - Vulkan (cross-platform)

    # Front-end SDKs (compile to SVJif)
    gpvue/             # @gpvue/vue - Vue → SVJif
    gpreact/           # @gpreact/react - React → SVJif (future)
    gpsvelte/          # @gpsvelte/svelte - Svelte → SVJif (future)

  schemas/
    svjif.v0.1.json    # SVJif IR JSON Schema
  examples/
    gpvue-terminal/    # GPVue cloth terminal demo
  docs/
    spec.md            # SVJif specification
    runtime-api.md     # Runtime interface contract
```

## Runtime Abstraction

All SVJif runtimes implement the same interface:

```typescript
interface SVJifRuntime {
  load(scene: SVJifScene): Promise<void>;
  render(): void;
  updateNode(id: string, updates: Partial<SVJifNode>): void;
  hitTest(x: number, y: number): HitResult | null;
  dispose(): void;
}
```

**Same IR. Same API. Different GPU backend.**

Choose your runtime:
- **Browser?** → `@svjif/runtime-webgl` or `@svjif/runtime-webgpu`
- **Native app?** → `@svjif/runtime-metal` (macOS/iOS) or `@svjif/runtime-vulkan`
- **Rust?** → `@svjif/runtime-wgpu`

## Supported CSS Subset (v0.1)

**Layout:** `display`, `flex-*`, `width`, `height`, `padding`, `margin`, `gap`, `position`
**Paint:** `background-color`, `color`, `border`, `border-radius`, `opacity`
**Text:** `font-family`, `font-size`, `font-weight`, `line-height`, `text-align`

See [docs/css-subset.md](docs/css-subset.md) for full details.

## Quick Start (coming soon)

### For Vue Developers (GPVue)

```bash
# Install GPVue
npm install @gpvue/vue

# Write your Vue component
# Terminal.vue - renders on GPU!

# Build to SVJif
npx gpvue build Terminal.vue

# Run
npx gpvue serve --gpu
```

### For Format/Tooling Developers (SVJif Core)

```bash
# Install SVJif tools
npm install -g @svjif/cli

# Validate SVJif IR
svjif validate terminal.svjif.json

# Pack for production
svjif pack terminal.svjif.json -o terminal.svjif.bin

# Build your own compiler targeting SVJif
import { SVJifScene } from '@svjif/core';
```

## Development Principles

- **Apache 2.0 License** - Open and permissive
- **Hexagonal Architecture** - Domain/Application/Infrastructure layers
- **TypeScript** - Strict mode, full type safety
- **H-H-H-HOLY SHIT ESLint** - Maximum strictness (eslint:all + @typescript-eslint/all)
- **Test is the Spec** - Tests define behavior, 90%+ coverage required

## Project Structure

```
@svjif/core
  src/
    domain/          # Pure domain logic (models, business rules)
      models/        # SVJifNode, SVJifScene types
      ports/         # Interfaces for external dependencies
    application/     # Use cases and application services
      usecases/      # Business workflows
      services/      # Application logic
    infrastructure/  # External adapters (I/O, frameworks)
      adapters/      # Concrete implementations
```

## License

Apache 2.0

## Contributing

SVJif is in early development. Watch this space.
