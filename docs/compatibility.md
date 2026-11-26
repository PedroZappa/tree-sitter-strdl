# Compatibility

This document records the supported Tree-sitter tooling and runtime versions after the parser moved to ABI 15.

## Parser ABI

- Generated parser ABI: **15** (`LANGUAGE_VERSION 15` in `src/parser.c`).
- Tree-sitter runtimes older than 0.25 cannot load ABI 15 parsers.
- Consumers using a runtime older than 0.25 must upgrade or use an older release of this grammar.

This is a compatibility-breaking change for consumers on pre-0.25 runtimes.

## Generator tooling

| Tool                | Requirement                                | Notes                                                          |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Tree-sitter CLI     | `0.27.2`, pinned in `devDependencies`      | Generate artifacts with this exact version.                    |
| Parser ABI target   | ABI 15                                     | CLI 0.27.2 generates ABI 15 by default.                        |
| Generated artifacts | Committed under `src/`                     | Never hand-edit generated files.                               |
| Prettier            | `3.10.1`, pinned in `devDependencies`      | Formatting gate for non-generated JS/JSON/YAML/Markdown files. |
| Ruff                | `0.17.6`, pinned in `requirements-dev.txt` | Formatting and lint gate for Python sources.                   |

Regenerate with:

```sh
tree-sitter generate
```

## Runtime support matrix

| Binding | Declared requirement                                                                  | Validation version                                                             | Result                                                            |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Node.js | peer `tree-sitter: ^0.25.0`                                                           | `tree-sitter` 0.25.1, Node.js 26.8.2 and 26.13.1                               | Passed `npm test` and a clean tracked-source build                |
| Python  | optional extra `tree-sitter~=0.25.0`                                                  | `tree-sitter` 0.25.2 previously; Python 3.15.2 and 3.14.10                     | Passed `test_binding.py` and `make test-python`                   |
| Rust    | dev-dependency `tree-sitter = "0.25.8"`                                               | `cargo`/`rustc` 1.100.0; `cargo test --locked`                                 | Passed load and doc tests; `Cargo.lock` pins dependencies         |
| Go      | `github.com/tree-sitter/go-tree-sitter` v0.25.0 resolved by the temporary test module | Go 1.27.4                                                                      | Passed `go test` in a temporary copy; retained source-only        |
| Swift   | `SwiftTreeSitter` `from: "0.10.0"`                                                    | Swift 6.2.1 and 6.4.3; resolved SwiftTreeSitter 0.25.0 and tree-sitter 0.25.10 | Passed `swift build` and `swift test`; gated by `make test-swift` |
| C       | No Tree-sitter runtime dependency declared                                            | C11 with GCC 16.2.1; CMake 4.5.1                                               | Passed `make build`, CMake build/install, and C symbol check      |

GitHub Actions validates the Node.js binding on Node.js 22 and 24 and the Swift binding on Swift 6.2.1 on pinned Ubuntu 24.04 runners for pull requests and pushes to `main`; see [CI](ci.md).

`~=0.25.0` is used for Python because plain `~=0.25` permits any 0.x release up to 1.0.

## Binding support policy

The aggregate Phase 7 decision retains every existing non-Node binding and deprecates none. Node.js remains the primary npm distribution target; Zig remains disabled. The authoritative evidence and rationale are in the [binding audit](binding-audit.md#aggregate-non-node-binding-decision--decided-2026-11-26).

| Tier                         | Bindings     | Distribution                    | Validation promise                                                                        |
| ---------------------------- | ------------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Primary                      | Node.js      | npm package                     | Full CI gate, clean consumer build, generated-runtime parse, and behavioral binding tests |
| Published and gated          | Python, Rust | PyPI and crates.io release jobs | Registry package builds, declared runtime floors, and `make ci` load/export gates         |
| Gated source integration     | C, Swift     | Repository or source package    | `make ci` build/load gates; no registry artifact published by this repository             |
| Source-only, not first-class | Go           | Repository source               | No CI gate, locked module metadata, or published Go artifact is promised                  |

**Retained** means the integration and its enabling metadata stay in the repository, build or load regressions are fixed, and public-surface changes follow the compatibility policy. **Deprecated** means a documented intent to remove the binding in a future major release; no binding has that status. Source-only and gated-source tiers are support distinctions, not claims that the parser behaves differently.

Promoting Go to a first-class binding requires explicit approval for module metadata, a Go CI leg, and a declared `go-tree-sitter` compatibility floor. Adding a Swift release path, committing `Package.resolved`, or removing any existing integration also requires explicit approval and a breaking-change entry.

## Validation performed

On 2026-11-25:

- `tree-sitter generate` succeeded with CLI 0.27.2 before and after the Phase 3 structured refactor.
- A second regeneration before the refactor produced byte-identical `src/parser.c`, `src/grammar.json`, `src/node-types.json`, and `src/tree_sitter/array.h`.
- `tree-sitter test` passed all 42 current corpus cases with CLI 0.27.2.
- `tree-sitter test` also compiled and executed both official query files successfully.
- `tree-sitter parse test/fixtures/test.strdl test/fixtures/test-local.strdl` completed without `ERROR` or `MISSING` nodes after the refactor.
- `npm test` passed with `tree-sitter` 0.25.1 on Node.js 26.8.2 and, after a clean tracked-source `npm ci --offline` rebuild, on Node.js 26.13.1 (ABI 147). The clean build verified that committed parser artifacts remained byte-identical.

Query commands emitted a parser-directory warning but compiled and executed successfully.

On 2026-11-26, a runtime-only copy containing committed generated artifacts but no `grammar.js`, scripts, tests, or Tree-sitter CLI installed the pinned `tree-sitter` 0.25.1 runtime offline, compiled the native addon, and parsed both representative fixtures without modifying the generated files. This check is wired into `make test-generated-runtime` and `make ci`.

Also on 2026-11-26, the C binding was audited and retained. `make build` produced static and shared libraries; a clean tracked-source CMake build and install produced the shared library, header, pkg-config metadata, and queries; and `make test-c` compiled and linked `tree_sitter_strudel()` against `src/parser.c`, confirming a non-null language pointer. See the [binding audit](binding-audit.md#c-binding--audited-2026-11-26) for evidence, retained-binding rationale, and deferred packaging gaps.

The Go binding was audited on 2026-11-26 as well. Its source and test were inspected, but no Go toolchain is installed in this environment, so the earlier temporary-module `go test` result remains the only execution evidence. The binding is retained as source-only with no committed module metadata or CI gate; see the [Go audit](binding-audit.md#go-binding--audited-2026-11-26).

The Python binding was audited on 2026-11-26. `make test-python` built the extension with Python 3.14.10 and validated the `tree_sitter.Language` capsule plus both official query exports without installing the optional runtime. The earlier `tree-sitter` 0.25.2 / Python 3.15.2 load test remains the runtime-level evidence. See the [Python audit](binding-audit.md#python-binding--audited-2026-11-26).

The Rust binding was audited on 2026-11-26. After approval, crates were fetched, `Cargo.lock` was generated, and `cargo test --locked` passed with Cargo 1.100.0. `make test-rust` now combines structural checks with that locked runtime test; see the [Rust audit](binding-audit.md#rust-binding--audited-2026-11-26).

The Swift binding was audited on 2026-11-26. After toolchain installation and local library compatibility setup, `swift build` and `swift test` passed in a clean tracked-source copy with both Swift 6.4.3 and the CI-pinned Swift 6.2.1. `make test-swift` now combines structural checks with those runtime commands; see the [Swift audit](binding-audit.md#swift-binding--audited-2026-11-26).

Query gates now build the shared C library and pass it to the CLI with `--lib-path`, avoiding the stale global parser cache that caused an intermediate CI failure. Release metadata is aligned at `1.5.0`, and `make check-version` gates that alignment.

The Python binding check removes `-Wl,-z,pack-relative-relocs` from the target interpreter's linker configuration because `ld.gold` rejects that flag; a forced `clang`/`ld.gold` reproduction now builds successfully. On Linux, the Rust gate appends GNU `ld.bfd` flags for Cargo compilation and doc tests; forced `ld.lld` configurations now pass.

## Known limitations

- npm 11 in this environment blocks dependency install scripts for `tree-sitter` and `tree-sitter-cli` by default; the project's own install script still compiled the addon, and the clean build's `npm test` run loaded the runtime successfully.
- The Rust gate needs network access on the first uncached run to fetch crates.io dependencies; subsequent runs use the locked graph and local cache.
- `Package.resolved` is ignored and untracked, so SwiftPM dependency resolution is not reproducibly pinned even though CI pins the Swift toolchain.
- `npm install` emitted script-allowlist warnings, but the pinned local CLI was executable and was used for the final regeneration check.

## Policy

- Pin the CLI version used to generate committed artifacts.
- Raise the minimum supported runtime only after testing bindings against it.
- Document ABI or runtime-floor changes as breaking changes.
- Keep generated artifacts synchronized with `grammar.js` and the pinned CLI.
