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

Retain the C binding. It is a small, source-level integration with a correct public symbol, two working build paths, and explicit installer rules. Removing it would break CMake/Make consumers and contradict the enabled `bindings.c` metadata without providing a distribution benefit, because npm does not publish the C binding anyway. This is a C-specific retention decision; the aggregate non-Node binding decision remains pending until the Swift audit is complete.

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

Retain the Go binding as a source-level, source-only integration. Its metadata explicitly enables it, its source and test are tracked, and a compatible runtime previously passed. Removing it would break source consumers and discard useful validation without solving the packaging gap. This audit does not promote Go to a first-class distributed binding: adding `go.mod`/`go.sum`, wiring a Go CI leg, or disabling the binding would materially change compatibility and requires explicit approval. The aggregate non-Node binding decision remains pending until the Swift audit is complete.

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

## Other bindings

The Swift audit is pending and tracked in the [roadmap](roadmap.md#phase-7--packaging-and-compatibility).
