# Binding audit

This document accumulates the Phase 7 binding audits. It records implementation, build reachability, test coverage, distribution exposure, and the retention decision for each binding. Node.js is the primary distribution target; the other bindings are evaluated separately rather than removed as template residue.

## C binding — audited 2026-11-26

### Implementation and build reachability

| Area              | Evidence                                                                                                                                                                                      | Assessment                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public header     | `bindings/c/tree_sitter/tree-sitter-strudel.h` declares `tree_sitter_strudel()` with a C++ `extern "C"` guard.                                                                                | Conforms to the generated parser symbol and is safe to include from C and C++ consumers.                         |
| Generated symbol  | `src/parser.c` defines `TS_PUBLIC const TSLanguage *tree_sitter_strudel(void)` and sets `LANGUAGE_VERSION 15`.                                                                                | Header and generated implementation agree; ABI matches the documented runtime floor of Tree-sitter 0.25+.        |
| Metadata          | `tree-sitter.json` declares `bindings.c: true`.                                                                                                                                               | C binding is intentionally enabled in the canonical parser configuration.                                        |
| Makefile path     | `make build` compiles `src/parser.c` into static and shared libraries and generates `tree-sitter-strudel.pc`; `make install` deploys the header, libraries, pkg-config metadata, and queries. | Build and install paths exist, are hand-maintained, and are exercised by `make ci`.                              |
| CMake path        | `CMakeLists.txt` builds a shared library, configures pkg-config metadata, and installs header, library, metadata, and queries.                                                                | A clean out-of-source CMake 4.5.1 build and install succeeded in a temporary tracked-source copy.                |
| npm package files | `package.json` `files` includes generated `src/` artifacts and queries but not `bindings/c/`, `CMakeLists.txt`, or the Makefile.                                                              | C consumers use the source repository or CMake/Make install; the C binding is not an npm-installed consumer API. |

### Verification performed

- `make build` compiled `src/parser.c` with GCC 16.2.1 and produced `libtree-sitter-strudel.a`, `libtree-sitter-strudel.so`, and pkg-config metadata.
- `python3 scripts/check_c_binding.py cc` compiled the public header and a test program against `src/parser.c`, linked the generated symbol, and confirmed that `tree_sitter_strudel()` returns a non-null `TSLanguage *`.
- `nm -g --defined-only libtree-sitter-strudel.a` reported `T tree_sitter_strudel`.
- A clean tracked-source copy configured and built with CMake 4.5.1, producing `libtree-sitter-strudel.so.15.1`, and installed the header, shared library, pkg-config file, and both official queries.
- The C check is wired into `make test-c`, `make verify-all`, and `make ci`.

### Decision

Retain the C binding. It is a small, source-level integration with a correct public symbol, two working build paths, and explicit installer rules. Removing it would break CMake/Make consumers and contradict the enabled `bindings.c` metadata without providing a distribution benefit, because npm does not publish the C binding anyway. This decision is consistent with the [aggregate retention decision](#aggregate-non-node-binding-decision--decided-2026-11-26).

### Known gaps and deferred work

- `make test-c` validates binding compilation, linking, and symbol return, not tree parsing semantics. Parser behavior is covered by the CLI corpus, incremental, and query layers and by Node.js binding tests.
- Phase 7 follow-up aligned Makefile, CMake, Cargo, Python, and pkg-config metadata at `1.5.0`; `make check-version` now gates cross-file alignment. The regenerated `tree-sitter-strudel.pc` includes the project description and URL.
- The CMake custom command can regenerate `src/parser.c` inside the source tree when timestamps require it and discovers an arbitrary `tree-sitter` CLI from `PATH`. CI therefore validates the pinned Makefile generation path instead of invoking CMake.
- `cmake --install --prefix` does not rewrite the configured `prefix` in the generated pkg-config file, because `bindings/c/tree-sitter-strudel.pc.in` uses `CMAKE_INSTALL_PREFIX` at configure time. Configure with the intended installation prefix until release packaging addresses this.

## Go binding — audited 2026-11-26

### Implementation and build reachability

| Area            | Evidence                                                                                                                                                                                                                                               | Assessment                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Public API      | `bindings/go/binding.go` declares `package tree_sitter_strudel`, sets cgo `CFLAGS` to `-std=c11 -fPIC`, includes `../../src/parser.c` with a conditional scanner include, and exposes `Language() unsafe.Pointer` returning `C.tree_sitter_strudel()`. | Standard cgo template shape; the library embeds the generated parser directly and declares no separate Go runtime dependency.         |
| Test source     | `bindings/go/binding_test.go` is an external test package that imports `github.com/tree-sitter/go-tree-sitter` and this module path, then fails if `tree_sitter.NewLanguage(Language())` is nil.                                                       | Shallow load test only; it does not parse, execute queries, cover recovery, or compare incremental and fresh parses.                  |
| Metadata        | `tree-sitter.json` declares `bindings.go: true`; `.gitattributes` marks `bindings/go/*`, `go.mod`, and `go.sum` as generated.                                                                                                                          | The binding is intentionally enabled, but the repository expects module metadata that is not present.                                 |
| Module state    | `git ls-files` finds only `binding.go` and `binding_test.go`; `git log --all` shows no tracked `go.mod` or `go.sum` at any point.                                                                                                                      | `go test` is not reproducible from a normal checkout in module-aware mode; the recorded pass required a temporary synthesized module. |
| ABI declaration | No tracked manifest encodes a `go-tree-sitter` version. The temporary validation module resolved `github.com/tree-sitter/go-tree-sitter` v0.25.0.                                                                                                      | ABI 15 compatibility was demonstrated once but is not declared or enforced by committed metadata.                                     |
| Distribution    | npm `files` excludes non-Node bindings; there is no Go publish job and no tagged Go module release in this repository.                                                                                                                                 | Source-only integration through the repository; there is no packaged Go artifact or downstream consumer check.                        |

### Verification performed

- Inspected both tracked Go files, `tree-sitter.json`, `.gitattributes`, npm package contents, the CI workflow, and Makefile targets.
- Confirmed that only `bindings/go/binding.go` and `bindings/go/binding_test.go` are tracked and that no `go.mod` or `go.sum` exists in the working tree or Git history.
- The [compatibility record](compatibility.md#validation-performed) documents a 2026-11-25 pass of `go test` with Go 1.27.4 and `go-tree-sitter` v0.25.0 in a temporary module-aware copy.
- That execution was not repeated in this audit: no `go` executable is available on `PATH` and no Go toolchain is installed under the usual local locations. Installing one would require explicit approval.
- The C-level check confirms that `tree_sitter_strudel()` links from the generated parser, which is the symbol the cgo wrapper returns, but it does not exercise cgo or `go-tree-sitter`.

### Decision

Retain the Go binding as a source-level, source-only integration. Its metadata explicitly enables it, its source and test are tracked, and a compatible runtime previously passed. Removing it would break source consumers and discard useful validation without solving the packaging gap. This audit does not promote Go to a first-class distributed binding: adding `go.mod`/`go.sum`, wiring a Go CI leg, or disabling the binding would materially change compatibility and requires explicit approval. The [aggregate retention decision](#aggregate-non-node-binding-decision--decided-2026-11-26) records that source-only status.

### Known gaps and deferred work

- Without `go.mod` and `go.sum`, standard Go tooling cannot import or test the binding reproducibly from a checkout.
- The test is a nil-language load check only; parser behavior is covered by other layers, not by Go.
- No committed metadata pins the ABI-compatible `go-tree-sitter` version.
- No Go build or test is wired into `make ci`, and no Go publish job exists.
- Installing a Go toolchain and adding module metadata are deferred pending an explicit compatibility and distribution decision.

## Python binding — audited 2026-11-26

### Implementation and build reachability

| Area        | Evidence                                                                                                                                                                                                                                                      | Assessment                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Public API  | `bindings/python/tree_sitter_strudel/binding.c` declares `tree_sitter_strudel()` and returns a `PyCapsule` named `tree_sitter.Language`; `__init__.py` exposes `language()`, `HIGHLIGHTS_QUERY`, and `LOCALS_QUERY`, with matching entries in `__init__.pyi`. | Correct runtime capsule contract and typed module surface; official queries are exposed as module attributes.                            |
| Build       | `setup.py` builds the `_binding` extension from `binding.c` plus `src/parser.c` and optional `src/scanner.c`, copies `queries/` into the package, and emits an abi3 wheel for CPython 3.10+.                                                                  | Standard setuptools path; the extension imports without installing the optional `tree-sitter` runtime.                                   |
| Packaging   | `pyproject.toml` declares name, AGPL-3.0-only license, `requires-python >=3.10`, and optional `core = tree-sitter~=0.25.0`; `publish.yml` has a PyPI job with `generate: true`.                                                                               | The Python binding has a real distribution path and a declared ABI-compatible runtime floor.                                             |
| Version     | `pyproject.toml`, Makefile, CMake, Cargo, and generated pkg-config metadata now use `1.5.0`, matching `package.json` and `tree-sitter.json`.                                                                                                                  | `make check-version` gates alignment across all package metadata.                                                                        |
| Test source | `bindings/python/tests/test_binding.py` constructs `tree_sitter.Language(tree_sitter_strudel.language())`; `scripts/check_query_registration.py` statically checks module and stub exports.                                                                   | Existing test is a shallow load test; parser, query, recovery, and incremental behavior are covered by other layers, not through Python. |
| npm package | npm `files` excludes non-Node bindings, including `bindings/python/`.                                                                                                                                                                                         | Python consumers use the PyPI package or source checkout, not npm.                                                                       |

### Verification performed

- `python3 scripts/check_python_binding.py` built `_binding.abi3.so` with Python 3.14.10, setuptools 84.2.1, and wheel 0.48.0 in a temporary tree, using `--egg-base` to avoid writing egg metadata into the checkout.
- The checker imported the built package, confirmed `language()` returns a `PyCapsule` named `tree_sitter.Language` with a non-null pointer, and loaded both official query strings through the module attributes.
- `make test-python` was added and wired into `verify-all` and `make ci`.
- A negative control that expected a missing capture in `HIGHLIGHTS_QUERY` failed with `exit=1`.
- The [compatibility record](compatibility.md#validation-performed) documents a prior pass with Python 3.15.2 and `tree-sitter` 0.25.2. That runtime is not installed in this environment, so the current check validates the binding surface without constructing a `tree_sitter.Language` object.
- A CI reproduction with `clang` and `ld.gold` failed because the target Python's `-Wl,-z,pack-relative-relocs` linker flag is unsupported by gold. The checker now strips that flag from `LDSHARED`/`LDFLAGS`; the forced gold reproduction and the normal build both pass.

### Decision

Retain the Python binding as an officially distributed integration. It has a working CPython extension, typed query/API exports, a PyPI publish job, and a declared ABI-compatible runtime extra. Removing it would break an established distribution path and contradict `bindings.python: true`. Deeper behavioral coverage is tracked separately rather than treated as a reason to remove the binding.

### Known gaps and deferred work

- The optional `core` extra means the existing `test_binding.py` does not run unless `tree-sitter` is installed; the new gate checks the extension without that runtime.
- No representative parse, query-execution, recovery, or incremental-equivalence test runs through the Python binding.
- The abi3 wheel target is declared for CPython 3.10+, but only Python 3.14.10 was built locally in this audit.
- `setup.py` currently copies `binding.c` into the built package; harmless but unnecessary package content.

## Rust binding — audited 2026-11-26

### Implementation and build reachability

| Area        | Evidence                                                                                                                                                                                               | Assessment                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Public API  | `bindings/rust/lib.rs` declares `extern "C" fn tree_sitter_strudel()`, exposes `LANGUAGE: LanguageFn`, and embeds `NODE_TYPES`, `HIGHLIGHTS_QUERY`, and `LOCALS_QUERY` from committed files.           | Standard Tree-sitter Rust template shape with typed query exports and no grammar-specific semantic logic.                |
| Build       | `bindings/rust/build.rs` compiles `src/parser.c` with `cc`, adds an optional `src/scanner.c`, sets C11, and emits `tree-sitter-strudel`.                                                               | Conventional build script tied to the committed generated parser.                                                        |
| Manifest    | `Cargo.toml` declares `tree-sitter-language = "0.1"`, `cc = "1.2"`, and dev `tree-sitter = "0.25.8"`; a tracked `Cargo.lock` pins 25 resolved packages; `tree-sitter.json` enables `bindings.rust`.    | Dependencies are reproducibly locked; the dev dependency declares the ABI-compatible runtime floor.                      |
| Packaging   | `Cargo.toml` includes `bindings/rust/*`, `queries/*`, `src/*`, `tree-sitter.json`, and `LICENSE`; the crates publish job has `CARGO_REGISTRY_TOKEN` and `generate: true`.                              | A real crates.io distribution path exists and regenerates parser artifacts during release packaging.                     |
| Version     | `Cargo.toml` and `Cargo.lock` now use `1.5.0`, matching Makefile, CMake, Python, pkg-config, npm, and Tree-sitter metadata.                                                                            | `make check-version` gates alignment across all package metadata.                                                        |
| Test source | Inline `test_can_load_grammar` constructs `tree_sitter::Parser` and calls `set_language(&LANGUAGE.into())`; `scripts/check_query_registration.py` checks Rust query constants and Cargo include rules. | Shallow load test only; parser, query, recovery, and incremental behavior are covered by other layers, not through Rust. |
| npm package | npm `files` includes only Node.js binding artifacts and omits `bindings/rust/`.                                                                                                                        | Rust consumers use crates.io or the source repository, not npm.                                                          |

### Verification performed

- `rustc` and `cargo` 1.100.0 are installed locally.
- In a clean temporary copy of tracked sources, `cargo metadata --offline --no-deps --format-version 1` exited `0`, confirming that Cargo parses the manifest and package identity without fetching dependencies.
- After explicit approval, `cargo fetch` downloaded the missing crates and generated `Cargo.lock`; `cargo test --locked` passed the inline load and doc tests with Rust 1.100.0.
- Added `scripts/check_rust_binding.py` and `make test-rust`, wired into `verify-all` and `make ci`. The checker validates manifest fields, dependency declarations, `Cargo.lock`, Cargo include coverage, build-script wiring, public API constants, language symbol declaration, npm exclusion, crates publish configuration, and a `cargo test --locked` run in a temporary tracked-source copy.
- Negative controls that renamed `LANGUAGE` or removed the loader call in temporary tracked-source copies failed with `exit=1`.
- A forced reproduction in which `ld.lld` was selected for Cargo compilation failed before the fix. The checker now appends GNU `ld.bfd` flags on Linux for both `RUSTFLAGS`/`CARGO_ENCODED_RUSTFLAGS` and `RUSTDOCFLAGS`; the forced `ld.lld` configurations then passed.

### Decision

Retain the Rust binding. It has a working manifest, a locked dependency graph, a standard parser build script, a typed `LanguageFn` API, committed query constants, gated load tests, and a crates.io publish job with parser generation enabled. Removing it would discard an established crate integration and contradict `bindings.rust: true`. Deeper Rust behavior tests remain deferred rather than treated as a reason to remove the binding.

### Known gaps and deferred work

- The first uncached `cargo test --locked` run needs network access to crates.io; CI runners provide that, and `Cargo.lock` pins the resolved graph once fetched.
- The inline Rust test is a nil-language load check only; no representative parse, query-execution, recovery, or incremental-equivalence test runs through Rust.
- Rust releases are not published from ordinary commits; the crates job still triggers only on tags through the controlled publish workflow.

## Swift binding — audited 2026-11-26

### Implementation and build reachability

| Area             | Evidence                                                                                                                                                                                                 | Assessment                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public API       | `bindings/swift/TreeSitterStrudel/strudel.h` declares `tree_sitter_strudel()` behind a C++ `extern "C"` guard.                                                                                           | Matches the generated parser symbol and is safe for C and C++ consumers.                                                                           |
| Package manifest | `Package.swift` declares a `TreeSitterStrudel` library product, compiles `src/parser.c` with optional `src/scanner.c`, copies `queries/`, publishes `bindings/swift` headers, and sets the C11 standard. | Standard SwiftPM template shape; the library target depends on the committed generated parser rather than the grammar source.                      |
| Test source      | `bindings/swift/TreeSitterStrudelTests/TreeSitterStrudelTests.swift` constructs `Parser()` and `Language(language: tree_sitter_strudel())`, then asserts that `setLanguage` does not throw.              | Shallow load test only; it does not parse, execute queries, cover recovery, or compare incremental and fresh parses.                               |
| Test dependency  | `Package.swift` declares test-only `SwiftTreeSitter from: "0.10.0"`. A clean resolution selected SwiftTreeSitter `0.25.0` and tree-sitter `0.25.10`.                                                     | The declared range admits an ABI 15-compatible runtime, but `Package.resolved` is ignored and untracked, so resolution is not reproducibly pinned. |
| Metadata         | `tree-sitter.json` declares `bindings.swift: true`.                                                                                                                                                      | Swift is intentionally enabled in the canonical parser configuration.                                                                              |
| Distribution     | npm `files` excludes `Package.swift`, `bindings/swift/`, and Swift sources; there is no Swift publish job or tagged Swift package release path in this repository.                                       | Swift consumers use the source repository or SwiftPM directly; npm does not publish the Swift product.                                             |

### Verification performed

- Inspected `Package.swift`, the public C header, the XCTest source, `tree-sitter.json`, npm package rules, CI/publish workflows, and checker conventions.
- Installed Swift 6.4.3 with `mise` and prepared local compatibility libraries for this host. In a clean copy of tracked sources, `swift build` completed and `swift test` passed its one load test.
- Added `scripts/check_swift_binding.py` and `make test-swift`, wired into `verify-all` and `make ci`. The checker validates required files, manifest snippets, the public C symbol, XCTest load wiring, `tree-sitter.json` enablement, npm exclusion, and a clean tracked-source `swift build` plus `swift test`.
- Pinned CI to Swift `6.2.1` through `swift-actions/setup-swift` at commit `7ca6abe6b3b0e8b5421b88be48feee39cbf52c6a` (`v2.4.0`). The same checker passed with both Swift 6.2.1 and 6.4.3.
- Temporary negative controls that changed the `SwiftTreeSitter` lower bound, injected `XCTFail` into the load test, or set `bindings.swift` to `false` each failed with `exit=1`.

### Decision

Retain the Swift binding as a source-level SwiftPM integration with a CI-gated load test. Its manifest builds the committed parser, copies the official queries, exposes the correct C symbol, and resolves an ABI 15-compatible SwiftTreeSitter runtime. Removing it would contradict `bindings.swift: true` and discard a working source integration without solving an npm distribution gap that never applied to Swift. This audit does not promote Swift to a first-class published binding; committing `Package.resolved`, adding a Swift release path, or disabling the binding would materially change compatibility and requires explicit approval.

### Known gaps and deferred work

- The XCTest is a load check only; no representative parse, query-execution, recovery, or incremental-equivalence test runs through Swift.
- `Package.resolved` is ignored and untracked. CI pins the Swift toolchain, but dependency resolution may still select a newer compatible SwiftTreeSitter release.
- No Swift publish job exists, and npm packaging intentionally excludes Swift sources.
- On this host, the installed Swift toolchains needed local compatibility symlinks for system libraries. CI pins Ubuntu 24.04, installs Swift.org's documented Ubuntu 24.04 dependencies, and selects Swift 6.2.1 instead.

## Aggregate non-Node binding decision — decided 2026-11-26

### Decision

Retain all five non-Node bindings. None is deprecated and none is removed. Node.js remains the primary npm distribution target, and Zig remains disabled.

| Binding | Support tier                 | Evidence                                                                                      | Commitment                                                                                                                   |
| ------- | ---------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| C       | Gated source integration     | Correct public symbol, Make/CMake install paths, pkg-config metadata, and `make test-c`.      | Build/load regressions are fixed; consumers use a release or pinned source revision, not a registry artifact from this repo. |
| Python  | Published and gated          | abi3 extension, typed query exports, PyPI publish job, runtime extra, and `make test-python`. | Package builds and official query exports are gated; the declared runtime floor is maintained.                               |
| Rust    | Published and gated          | `LanguageFn` API, `Cargo.lock`, query constants, crates.io publish job, and `make test-rust`. | Locked builds and load/doc tests are gated; the crate surface is maintained.                                                 |
| Swift   | Gated source integration     | `Package.swift`, official query resource, correct C symbol, and `make test-swift`.            | SwiftPM build and XCTest load path are gated; consumers use the repository, not a registry artifact from this repo.          |
| Go      | Source-only, not first-class | Tracked cgo wrapper and test; no module metadata, CI gate, or publish job.                    | The source is kept for existing consumers; no reproducible import or published Go artifact is promised.                      |

### Definitions

- **Retained:** the binding files and enabling metadata remain; build or load regressions are fixed; any public-surface change follows the compatibility policy.
- **Published and gated:** retained and distributed through a real registry job, with a build/load check in `make ci`.
- **Gated source integration:** retained and validated in CI, but consumed from the repository or a source package rather than a registry artifact published by this repository.
- **Source-only:** retained for source consumers without a CI gate, locked dependency metadata, or registry distribution promise.
- **Deprecated:** documented intent to remove in a future major release. No binding is deprecated as part of this decision.

### Rationale

All five non-Node bindings expose the generated ABI 15 language symbol, are explicitly enabled in `tree-sitter.json`, and have at least build or load evidence. Four have CI gates and two have real registry publish jobs. Removing any of them would break existing consumers and contradict the canonical metadata without reducing npm package size, because npm already excludes non-Node bindings.

Go has the weakest reachability: it lacks `go.mod`, `go.sum`, a CI gate, and a publish job. Those are promotion gaps, not evidence that the integration is obsolete. Deprecating Go would announce a future removal without offering a replacement path for source consumers. C and Swift are also source-oriented, but both have working build paths and CI gates, so removing them would discard validated functionality.

Reducing the project to a Node.js-only binding would be a compatibility-breaking project-direction change. It would require evidence of consumer harm or unmaintainable upstream incompatibility and explicit approval; neither condition is present.

### Consequences and review triggers

- No source file, binding file, package rule, publish job, or `tree-sitter.json` binding flag is changed by this decision.
- `make ci` continues to gate C, Python, Rust, and Swift; Go remains outside CI and is documented as source-only.
- Promoting Go requires explicit approval for `go.mod`/`go.sum`, a Go toolchain in CI, and a declared `go-tree-sitter` compatibility floor.
- Committing `Package.resolved`, adding a Swift release path, or adding deep behavioral tests remains deferred and separately approvable.
- Any future deprecation or removal requires explicit approval, a changelog/breaking-change entry, and updates to this document, the compatibility policy, and the roadmap.
- Shallow load coverage for Go, Rust, and Swift remains a known gap tracked in the [test strategy](test-strategy.md#current-coverage-and-gaps).
