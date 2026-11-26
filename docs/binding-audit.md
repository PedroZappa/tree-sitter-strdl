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

Retain the C binding. It is a small, source-level integration with a correct public symbol, two working build paths, and explicit installer rules. Removing it would break CMake/Make consumers and contradict the enabled `bindings.c` metadata without providing a distribution benefit, because npm does not publish the C binding anyway. This is a C-specific retention decision; the aggregate non-Node binding decision remains pending until Go, Python, Rust, and Swift audits are complete.

### Known gaps and deferred work

- `make test-c` validates binding compilation, linking, and symbol return, not tree parsing semantics. Parser behavior is covered by the CLI corpus, incremental, and query layers and by Node.js binding tests.
- The Makefile and CMake project version is `1.3.0`, while `package.json` and `tree-sitter.json` are `1.5.0`; the tracked `tree-sitter-strudel.pc` is generated output with an empty description and version `1.3.0`. Version alignment is a separate Phase 7 package-integrity item.
- The CMake custom command can regenerate `src/parser.c` inside the source tree when timestamps require it and discovers an arbitrary `tree-sitter` CLI from `PATH`. CI therefore validates the pinned Makefile generation path instead of invoking CMake.
- `cmake --install --prefix` does not rewrite the configured `prefix` in the generated pkg-config file, because `bindings/c/tree-sitter-strudel.pc.in` uses `CMAKE_INSTALL_PREFIX` at configure time. Configure with the intended installation prefix until release packaging addresses this.

## Other bindings

Audits for Go, Python, Rust, and Swift are pending and tracked in the [roadmap](roadmap.md#phase-7--packaging-and-compatibility).
