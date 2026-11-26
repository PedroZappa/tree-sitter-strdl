# Build and generation

This document owns the procedures for regenerating parser artifacts and building local outputs. The authoritative grammar input is [grammar.js](../grammar.js), the canonical parser metadata is [tree-sitter.json](../tree-sitter.json), and the [Makefile](../Makefile) is the canonical command entry point. See [development environment](development-environment.md) for prerequisites, [compatibility](compatibility.md#generator-tooling) for version pins, and [test strategy](test-strategy.md) for test-layer details.

## Artifact ownership

| Path                                                                                            | Kind                         | Procedure                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `grammar.js`                                                                                    | Authoritative grammar source | Edit directly. Generated files must never become a second source of truth.                                                       |
| `tree-sitter.json`                                                                              | Canonical metadata           | Edit directly for grammar identity, query registration, and binding enablement. `make check-version` validates release metadata. |
| `src/grammar.json`, `src/node-types.json`, `src/parser.c`, `src/tree_sitter/*.h`                | Generated and committed      | Produce with `make generate`; never hand-edit. These six files are checked by `make check-generated`.                            |
| `tree-sitter-strudel.pc`                                                                        | Generated, tracked metadata  | Produced from `bindings/c/tree-sitter-strudel.pc.in` by `make build` and validated by `make check-version`.                      |
| `src/*.o`, `libtree-sitter-strudel.a`, `libtree-sitter-strudel.so`/`.dylib`, `build/`, `*.wasm` | Local build outputs          | Ignored by Git and recreated by the relevant build command.                                                                      |

The grammar currently declares no external scanner, so there is no `src/scanner.c` to generate or include in builds. The generated parser targets ABI 15; consumers on older Tree-sitter runtimes are covered by the [compatibility policy](compatibility.md#parser-abi).

## Prerequisites

Install the pinned toolchain first:

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

`make install-dev` performs both dependency installs. Parser generation specifically requires Tree-sitter CLI `0.27.2` from `devDependencies`; the Makefile prefers `node_modules/.bin/tree-sitter` over an arbitrary system CLI. Other toolchain requirements and platform caveats are documented in the [development environment](development-environment.md).

## Regenerate parser artifacts

After changing `grammar.js`:

```sh
make generate
```

This runs the pinned CLI as `tree-sitter generate`. Review every generated change before continuing:

```sh
git diff -- src/
```

`make generate` produces the committed grammar JSON, node-type inventory, parser source, and Tree-sitter headers under `src/`. It does not build C libraries, compile a Node addon, or run tests.

Validate synchronization with:

```sh
make check-generated
```

The check regenerates the artifacts and requires no difference from `HEAD`. Because it compares against `HEAD`, an intended generated update is reported while it is only staged; commit the generated files together with their grammar change so the clean gate passes. In the working tree, `git diff -- src/` remains the review mechanism before staging.

### After a grammar change

1. Update `grammar.js` and the relevant corpus, query, and documentation files.
2. Run `make generate` and review the `src/` diff.
3. Treat node or field changes as public CST changes under the [breaking-change policy](compatibility.md#breaking-change-policy-for-cst-and-queries).
4. Run `make format`, `make test`, `make test-query`, and `make test-incremental`.
5. Commit grammar, generated artifacts, tests, and documentation together.
6. Run `make ci` when all required binding toolchains are available.

If only queries or metadata change, parser regeneration is unnecessary; use the targeted query, registration, version, and package gates instead.

## Build the C libraries

```sh
make build
```

`make build` is an alias for the default `make all` target. It compiles the generated `src/parser.c` as C11 with position-independent code, then produces:

- `libtree-sitter-strudel.a` — static library.
- `libtree-sitter-strudel.so` on Linux or `libtree-sitter-strudel.dylib` on macOS — shared library with an ABI/version-derived install name.
- `tree-sitter-strudel.pc` — pkg-config metadata generated from the checked-in template.

These outputs are local build artifacts. `make build` does not regenerate parser artifacts and does not build the Node.js addon or WebAssembly parser.

To install the libraries, header, pkg-config metadata, and official queries:

```sh
make install PREFIX=/usr/local
make install DESTDIR="$STAGE_DIR" PREFIX=/usr/local
```

Use matching variables with `make uninstall` to remove an installed copy. The [binding audit](binding-audit.md#c-binding--audited-2026-11-26) records the separately verified CMake source-install path.

## Build the Node.js addon and WebAssembly parser

`npm ci` runs the package `install` script, which uses `node-gyp-build` and `binding.gyp` to compile `bindings/node/binding.cc` with the committed `src/parser.c`. No parser regeneration is involved. Use `make test-node` for the current addon and `make test-node-clean-build` to verify a fresh build from tracked sources; see the [development environment](development-environment.md#tool-selection-and-environment-notes) for stale-addon guidance.

```sh
make wasm       # tree-sitter build --wasm
make playground # npm prestart builds WASM, then opens the playground
```

WASM output is ignored by Git and is not part of `make ci`.

## Clean and rebuild

```sh
make clean
```

`make clean` removes object files, C libraries, the generated pkg-config file, `build/`, and `node_modules/`. It does not remove committed generated sources under `src/`. Because `tree-sitter-strudel.pc` is tracked and `node_modules/` contains the pinned tools, follow a clean with `npm ci` and `make build` (or `make install-dev` for the complete local setup). Treat the target as destructive and deliberate.

## Verify generation and builds

| Command                       | Purpose                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `make check-generated`        | Regenerates and compares committed parser artifacts against `HEAD`.                                                |
| Publish workflow preflight    | Runs `make check-generated` on the exact release tag and blocks every publication job when it fails.               |
| `make build`                  | Compiles and links the C static and shared libraries and pkg-config metadata.                                      |
| `make test-generated-runtime` | Confirms committed generated files parse representative fixtures without `grammar.js` or the CLI.                  |
| `make test-node-clean-build`  | Confirms the Node addon compiles and tests from clean tracked sources without regeneration.                        |
| `make check-version`          | Confirms release-version consistency across npm, Tree-sitter, Cargo, Python, CMake, Make, and pkg-config metadata. |
| `make ci`                     | Runs the full correctness gate, including `make build` as its final step.                                          |

See [CI](ci.md#what-make-ci-runs) for the exact aggregate gate, [test strategy](test-strategy.md#test-layers) for the test inventory, and [testing procedures](testing-procedures.md) for execution workflows and failure diagnosis.
