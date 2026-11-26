# Development environment

This document defines the local toolchain, pinned dependencies, and setup steps for working on `tree-sitter-strdl`. It does not duplicate build commands, test procedures, or benchmark workflows: use `make help` and the [Makefile](../Makefile) for commands, [test strategy](test-strategy.md) for test layers, [CI](ci.md) for the automated gate, and [benchmarking](benchmarking.md) for measurement.

## Supported platforms

- macOS and Linux are supported for local development. The [Makefile](../Makefile) explicitly rejects Windows (`Windows is not supported`).
- CI runs `ubuntu-24.04` with Node.js 22 and 24 and Swift 6.2.1 on pull requests and pushes to `main`; see [CI](ci.md#triggers-and-jobs).
- Local validation has also used Node.js 26.8.2 and 26.13.1, Python 3.14 and 3.15, Rust 1.100.0, Swift 6.4.x, GCC 16.2.1, Apple Clang 21, CMake 4.5.1, and GNU Make 3.81. These are observations, not additional support floors.
- Consumer runtime floors and ABI requirements are defined in [compatibility](compatibility.md#parser-abi) and the [runtime support matrix](compatibility.md#runtime-support-matrix).

## Core tools

These tools are needed for the full `make ci` gate. Versions come from `package-lock.json` and `requirements-dev.txt`, not from ad-hoc global installs.

| Tool                  | Pin or requirement                                      | Used for                                                             |
| --------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Node.js and npm       | CI matrix 22 and 24; no `engines` pin in `package.json` | `npm ci`, native addon, CLI tooling, Node.js binding tests           |
| Tree-sitter CLI       | `0.27.2`, pinned in `devDependencies`                   | Parser generation, corpus tests, query and incremental checks        |
| tree-sitter runtime   | `0.25.1` in `package-lock.json`; peer range `^0.25.0`   | Node.js binding tests and installed-package parsing                  |
| Prettier              | `3.10.1`, pinned in `devDependencies`                   | Formatting gate for non-generated sources                            |
| Python 3 with `venv`  | locally validated with 3.14 and 3.15                    | Incremental harness, query/package checks, Python binding build      |
| Ruff                  | `0.17.6`, pinned in `requirements-dev.txt`              | Formatting and lint gate for Python sources                          |
| setuptools and wheel  | `84.2.1` and `0.48.0`, pinned in `requirements-dev.txt` | Python extension build used by the binding check                     |
| C compiler and `make` | C11; GCC 16.2.1 and Apple Clang 21 verified             | C library, shared library for query checks, native addon compilation |

The generated parser artifacts under `src/` are committed. A developer needs the pinned CLI to regenerate and validate them, but consumers do not.

## Binding and platform tools

`make ci` also gates the following bindings. Install only the toolchains needed for the work being done, and keep the dependency pins in `Cargo.lock` and `package-lock.json` unchanged.

- **Rust:** `cargo` and `rustc` at least `1.90` are required by the locked `tree-sitter-language 0.1.9` dependency; `1.100.0` is verified locally. The gate runs `cargo test --locked` in a clean tracked-source copy. Ensure `$HOME/.cargo/bin` is on `PATH` in non-login shells. On Linux, the checker appends GNU `ld.bfd` flags so an ambient `ld.lld` selection cannot break the build.
- **Swift:** Swift 6.2.1 is used in CI; 6.4.x is verified locally. Ubuntu 24.04 requires the system packages listed in [ci.yml](../.github/workflows/ci.yml). On macOS, `swift test` needs XCTest from a full Xcode installation, not only Command Line Tools.
- **Python binding:** uses the same `.venv` as the core tools. The checker strips unsupported `-Wl,-z,pack-relative-relocs` flags for `ld.gold` compatibility; no manual linker configuration is required.
- **Go:** source-only and not part of `make ci`. The recorded evidence used Go 1.27.4 with `go-tree-sitter` 0.25.0 in a temporary module; no Go installation is required for the standard gate.
- **CMake:** optional. CMake 4.5.1 was used to verify the source install path in the C binding audit; `make build` uses the compiler and `make` directly.

## Initial setup

From the repository root:

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

`make install-dev` performs both dependency installs. `npm ci` installs the exact lockfile graph, builds the Node.js native addon, and provides the pinned CLI, runtime, and Prettier binaries. The virtual environment isolates Ruff, setuptools, wheel, and the incremental Python harness; do not install these tools into the global Python environment. Override the Makefile's `PYTHON` variable when a different interpreter is intentional.

Clean-copy gates such as `make test-node-clean-build` and `make test-tarball-install` install from the existing npm cache, so run `npm ci` once before using them offline.

## Verify the setup

```sh
node --version
node_modules/.bin/tree-sitter --version   # 0.27.2
node_modules/.bin/prettier --version      # 3.10.1
.venv/bin/python --version
.venv/bin/ruff --version                  # 0.17.6
make help
```

Then run the gate appropriate for the installed toolchains:

```sh
make ci          # full gate; requires Rust and Swift as well as core tools
make test        # corpus tests
make test-query  # query compilation, execution, and registration
make format      # local auto-fix; deliberately not part of CI
```

`make ci` fails if a gated binding toolchain is missing. Targeted `make` rules can still be used for local work; see [CI](ci.md#what-make-ci-runs) for the exact list of gates.

## Tool selection and environment notes

- The Makefile prefers repository-local binaries (`node_modules/.bin/tree-sitter`, `node_modules/.bin/prettier`, `.venv/bin/ruff`, `.venv/bin/python`) and falls back to `PATH`. Override with variables such as `make TS=tree-sitter ...` or `make PYTHON=python3 ...`.
- Query checks export `TREE_SITTER_LIB_PATH` from the freshly built shared library, avoiding a stale global parser cache.
- If `xcode-select -p` points only to Command Line Tools, Swift's XCTest module cannot be resolved. Switching the active developer directory or accepting the Xcode license requires elevated privileges and explicit approval; do not change it as an implicit setup step.
- A stale compiled Node addon can disagree with regenerated parser artifacts. `make test-node-clean-build` verifies a clean build from tracked sources. With npm 11, avoid `npm rebuild --build-from-source` as a routine fix because it was observed to prune `node_modules/` and `build/`.
- Never hand-edit generated files under `src/`. Regenerate with the pinned CLI and check the diff with `make check-generated`.

## Where to go next

- Commands and variables: `make help` and the [Makefile](../Makefile).
- Generation and artifact consistency: [CI](ci.md#what-make-ci-runs) and [compatibility](compatibility.md#generator-tooling).
- Test layers and how to add cases: [test strategy](test-strategy.md).
- Benchmark fixtures, harnesses, and baselines: [benchmarking](benchmarking.md).
- Project phases and contribution evidence: [roadmap](roadmap.md) and [AGENTS.md](../AGENTS.md).
