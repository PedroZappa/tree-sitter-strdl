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

## Syntax coverage compatibility

The [syntax coverage matrix](syntax-coverage-matrix.md) is the source of truth for the syntax this grammar currently accepts. The [syntax evidence](syntax-evidence.md) records why each construct is in scope. This section defines what syntax consumers can rely on across releases. CST node names, fields, and query captures follow the separate [breaking-change policy](#breaking-change-policy-for-cst-and-queries).

| Matrix status                 | Compatibility meaning                                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implemented                   | Supported syntax. A release that stops accepting it, downgrades it to `Partial` or `Missing`, or materially changes its concrete syntax tree is a breaking syntax change.                                                                   |
| Partial                       | Only the forms explicitly described in the matrix are supported. Other variants of the same JavaScript construct are not guaranteed.                                                                                                        |
| Missing                       | Not supported. Implementing it later is additive coverage, provided existing parses and trees remain unchanged.                                                                                                                             |
| Intentionally opaque/excluded | Accepted only as literal content or deliberately outside this grammar. Mini-notation and embedded DSL bodies remain inside `string` or `template_string` nodes; Strudel API names and runtime conventions are not encoded as grammar rules. |

The grammar targets a Strudel-oriented JavaScript subset, not full ECMAScript compatibility. ES2020+ constructs are added only when relevant evidence exists and the matrix records them as `Implemented`. Unsupported constructs listed in the matrix remain outside the compatibility promise until an evidence-backed change updates the matrix and corpus tests.

Evidence follows the project hierarchy: official Strudel documentation, shipped source and runtime, official examples and tutorials, maintained community examples, then ECMAScript specifications and established JavaScript grammar references. Commented-out or inactive examples do not establish support. General JavaScript syntax that has no Strudel evidence is not promised merely because a runtime might accept it.

Syntax additions are compatible when they accept previously unsupported input without changing existing trees. Narrowing accepted syntax, changing precedence or associativity, or changing the concrete tree for previously valid input is a breaking syntax change. Every supported-syntax change must update the corpus tests, the coverage matrix, and the generated parser artifacts with the pinned CLI.

Error recovery is best-effort for actively edited and malformed input. The stable compatibility contract applies to valid source using constructs recorded as `Implemented`. Malformed-input trees may improve or change without being treated as a syntax compatibility break.

Mini-notation remains opaque string content. This grammar exposes the surrounding JavaScript call and literal structure only; it does not parse pattern semantics, and no Strudel API function name is hardcoded into grammar rules.

## Breaking-change policy for CST and queries

The public compatibility surface consists of:

- named node types and field names in [`src/node-types.json`](../src/node-types.json), as explained in [grammar architecture](grammar-architecture.md);
- the concrete tree shape of valid, supported syntax, including parent/child relationships, field assignments, precedence, and associativity;
- official query files, their registration keys and binding constants, and the capture names and meanings documented in [highlight captures](highlight-captures.md) and [locals captures](locals-captures.md).

Anonymous tokens are part of the concrete tree but have no project-specific node name. Hidden grammar rules, local helper functions, named precedence identifiers, probe queries under `test/query/`, and editor-specific capture-priority behavior are implementation details. Changes to them are not breaking when the public surface above is unchanged. Error-recovery trees for malformed input are best-effort and are not part of this stability promise.

Version numbering follows `MAJOR.MINOR.PATCH`:

- **Patch:** fixes, documentation changes, tests, and query refinements that do not change the CST or capture behavior for valid, supported syntax.
- **Minor:** additive coverage that accepts new source without changing existing trees, a new named node type or field used only by newly supported syntax, a new capture name, or a new official query/registration that does not alter existing consumers.
- **Major:** renaming or removing a named node type or field; changing the parent, field, precedence, or associativity of previously valid syntax; narrowing supported syntax; adding a node or field to previously valid trees; renaming or removing a capture; changing a capture's syntactic meaning; changing an official query registration key or binding constant; reintroducing Strudel API-name-specific captures; or raising the ABI/runtime floor.

A major change requires explicit approval, a major version bump, release notes describing the migration, updates to the authoritative API documents and roadmap, and regenerated parser artifacts. Corpus cases, query assertions, and registration checks must be updated in the same change. Additive changes must demonstrate that previously valid parses remain unchanged.

Consumers should pin an exact grammar version and treat `node-types.json`, the grammar architecture document, the capture references, and registry metadata as the compatibility contract. Runtime and ABI compatibility are defined in [Parser ABI](#parser-abi); syntax status compatibility is defined in [Syntax coverage compatibility](#syntax-coverage-compatibility).

## Package compatibility expectations

The npm package is the primary distribution artifact. Its file contract is the `files` allowlist in `package.json`, and `make test-package` checks that allowlist for explicit grammar, generated-source, Node-binding, query, and Tree-sitter-metadata entries before checking the actual `npm pack --dry-run --json --ignore-scripts` output against that contract. At version `1.5.0`, the packed artifact contains 18 files: license and README, `binding.gyp`, Node binding sources and its test, `grammar.js`, `package.json`, both official queries, the committed generated parser artifacts and headers, and `tree-sitter.json`.

Consumers can expect:

- Committed generated parser artifacts are included, so normal installation does not require `tree-sitter-cli`, regenerating the parser, or hand-editing `src/`.
- The package installs the Node.js native addon from source through its `install` script unless a compatible prebuilt binary is supplied. No `prebuilds/` directory or WASM artifact is tracked in this repository; therefore current releases do not promise a prebuilt addon or a WebAssembly parser.
- The addon still requires a compatible Node.js ABI and a Tree-sitter runtime of `0.25` or newer. CI validates Node.js 22 and 24; local validation also covers Node.js 26.13.1. The runtime floor and ABI are part of the compatibility contract, not properties of the npm version alone.
- `tree-sitter` is an optional peer dependency. Consumers that use the JavaScript API must provide it; the package does not bundle the runtime.
- `package-lock.json` is not published. Published dependency ranges are resolved by the consumer's package manager; `node-addon-api` and `node-gyp-build` are runtime dependencies.
- The npm package contains no C, Go, Python, Rust, or Swift binding. Those integrations are distributed or consumed through the channels defined in the [binding support policy](#binding-support-policy).
- `grammar.js` and the two official query files are packaged for editor/tooling consumers. Their presence is intentional, but consumers should prefer the committed generated artifacts at runtime.
- Version `1.5.0` is aligned across the npm and Tree-sitter metadata and checked by `make check-version`. `make test-package` additionally requires the npm description, version, license, author, repository, scope, and file types to match the canonical `tree-sitter.json` metadata; official query registrations are checked separately by `make test-query-registration`. A version alone does not imply a different runtime floor; ABI and runtime compatibility are defined at the top of this document.
- `make test-tarball-install` packs tracked sources into a real npm tarball, installs it offline into a clean consumer without `tree-sitter-cli`, verifies that every packed file survives installation with unchanged generated artifacts, requires a freshly compiled native addon, and loads the installed package.

This section describes the expected package contract. Separate roadmap items cover parsing from an installed package and final publication-content validation; those checks are not implied by this documentation.

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

## Runtime compatibility verification

On 2026-11-26, the committed generated parser was exercised through every currently gated runtime path. `make test-generated-runtime`, `make test-node`, `make test-node-clean-build`, `make test-c`, `make test-python`, `make test-rust`, and `make test-swift` all exited `0`; no grammar regeneration or generated-artifact modification was required.

| Surface                    | Runtime evidence in this verification                                                                                                       | Result                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Committed generated parser | Node.js 26.13.1 with locked `tree-sitter` 0.25.1; two representative fixtures parsed without `grammar.js` or the Tree-sitter CLI            | Passed; generated files remained byte-identical                             |
| Node.js binding            | Node.js 26.13.1 with locked `tree-sitter` 0.25.1; direct tests plus a clean tracked-source addon build                                      | Passed all binding tests and the clean build                                |
| C                          | C11 with GCC 16.2.1; ABI 15 `tree_sitter_strudel()` symbol linked and loaded                                                                | Passed; C has no separate runtime dependency                                |
| Python                     | Python 3.14.10 extension build, language capsule validation, and official query export check                                                | Passed; this path does not import the optional Python `tree-sitter` runtime |
| Rust                       | Cargo 1.100.0 with `Cargo.lock` resolving `tree-sitter` 0.25.10; locked load and doc tests                                                  | Passed                                                                      |
| Swift                      | Swift 6.4.3 and the CI-pinned Swift 6.2.1, resolving `SwiftTreeSitter` 0.25.0 and `tree-sitter` 0.25.10; SwiftPM build and XCTest load test | Passed on both toolchains                                                   |

Go remains source-only: its earlier Go 1.27.4 / `go-tree-sitter` v0.25.0 temporary-module test is retained as evidence, but no Go gate or module metadata exists in this repository. The exact minimum `tree-sitter` 0.25.0 runtime is not separately installed in this environment; the tested paths use 0.25.1 or newer runtimes and the documented ABI 15 floor. GitHub Actions continues to validate the primary Node.js path on Node.js 22 and 24 and Swift on 6.2.1 using pinned Ubuntu 24.04 runners.

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
