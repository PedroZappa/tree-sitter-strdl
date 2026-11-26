# Continuous integration

GitHub Actions validates the grammar in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). The workflow runs for pull requests and pushes to `main`; tag pushes are handled by the separate [publish workflow](../.github/workflows/publish.yml). See the [test strategy](test-strategy.md) for the full test-layer index and extension procedures.

## Triggers and jobs

- **Triggers:** `pull_request` and `push` to `main`.
- **Permissions:** `contents: read` only.
- **Concurrency:** superseded runs on the same ref are cancelled.
- **Matrix:** Node.js 22 and 24 on pinned `ubuntu-24.04` runners.
- **Actions:** pinned to commit SHAs with version comments.

Each matrix job installs Swift.org's documented Ubuntu 24.04 system dependencies, selects Swift 6.2.1, installs the locked Node.js dependencies with `npm ci`, then runs `make ci`.

## What `make ci` runs

`make ci` expands to `verify-all build`:

1. `make check-generated` — regenerates with the pinned Tree-sitter CLI and checks that parser artifacts are unchanged from `HEAD`, including staged changes.
2. `make check-format` — runs Prettier and Ruff formatting checks over non-generated sources; `AGENTS.md`, generated parser files, benchmark fixtures/results, and lockfiles are excluded.
3. `make check-static` — runs Ruff lint rules `E4`, `E7`, `E9`, and `F` and checks the install shell script with `sh -n`.
4. `make check-benchmark-fixtures` — verifies that the [benchmark fixtures](benchmarking.md) match their manifest sizes, hashes, and deterministic generation parameters.
5. `make check-benchmark-baseline` — validates the [committed baseline](benchmarking.md#baseline-results) schema, provenance, environment agreement, fixture/catalog coverage, sample statistics, and memory invariants. It does not enforce a performance threshold.
6. `make reproduce-benchmark-baseline` — rebuilds the baseline from its [committed source reports](benchmarking.md#baseline-results) and requires exact structural equality with the committed artifact.
7. `make check-benchmark-budgets` — validates the [committed budgets](benchmarking.md#performance-budgets) provenance, environment/configuration agreement, fixture/catalog coverage, and observed maxima by recomputation. It does not gate current timings.
8. `make test` — runs all corpus cases, including incomplete-call, incomplete-argument-list, incomplete-expression, and missing-delimiter cases.
9. `make test-incremental` — replays the complete [incremental edit catalog](incremental-equivalence-procedure.md) through the pinned Tree-sitter CLI and requires every incremental tree to equal a fresh parse, including malformed intermediate steps and final sources.
10. `make test-query` — builds the shared C library and runs every CLI query through `--lib-path` instead of the global parser cache. It runs `make test-query-compile` to compile every query in `queries/` and reject negative controls with invalid node and field names, runs `make test-query-execution` to assert every official capture name on grammar-derived roles in the representative fixtures and reject a wrong-capture negative control, and runs `make test-query-registration` to verify metadata registration, packaged query rules, and Python/Rust query exports. It also executes each official query against the committed fixtures, checks that `highlights.scm` emits no duplicate captures for the same source range, and verifies that call identifiers and object keys selected by probe queries receive no locals definition capture.
11. `make test-regressions` — validates the [regression inventory](regression-coverage.md), ensuring every recorded bug still has an existing, wired regression artifact.
12. `make test-node` — runs the Node.js binding tests with the tree-sitter runtime resolved from `package-lock.json`, covering load, generated metadata, CST fields, error recovery, query execution, and incremental/fresh equivalence through the native addon.
13. `make test-node-clean-build` — copies tracked sources to a temporary clean directory, runs `npm ci --offline`, requires the native addon to compile without parser regeneration, and runs `npm test` there.
14. `make test-generated-runtime` — copies only runtime sources and committed generated artifacts into a temporary directory without `grammar.js` or `tree-sitter-cli`, installs the pinned tree-sitter runtime offline, verifies the generated files remain byte-identical, and parses both representative fixtures through the compiled addon.
15. `make test-c` — compiles the public C header and a test program against the generated parser, links the `tree_sitter_strudel()` symbol, and verifies that it returns a non-null language pointer.
16. `make test-python` — builds the CPython extension in a temporary tree with unsupported `-Wl,-z,pack-relative-relocs` linker flags removed for `ld.gold` compatibility, verifies that `language()` returns a `tree_sitter.Language` capsule with a non-null pointer, and loads both official query exports from the built package.
17. `make test-rust` — statically verifies the Rust manifest, dependency declarations, `Cargo.lock`, Cargo include coverage, build script, public API constants, npm exclusion, and crates publish configuration, then runs `cargo test --locked` in a temporary tracked-source copy with an isolated target directory. On Linux, the checker appends GNU `ld.bfd` flags to Cargo compiler and doc-test flags so an ambient `ld.lld` selection cannot break the gate.
18. `make test-swift` — statically verifies the SwiftPM manifest, public C symbol, XCTest load wiring, `tree-sitter.json` enablement, and npm exclusion, then runs `swift build` and `swift test` in a clean tracked-source copy.
19. `make check-version` — verifies that all package metadata agrees on the release version, including npm, Tree-sitter, Cargo, Python, Makefile, CMake, and generated pkg-config metadata.
20. `make test-package` — runs `npm pack --dry-run --json --ignore-scripts`, requires explicit `package.json` allowlist entries for grammar, generated sources, Node bindings, queries, and Tree-sitter metadata, then checks that npm metadata matches the canonical `tree-sitter.json` metadata, validates required files, rejects forbidden artifacts, and compares packed file sizes.
21. `make test-tarball-install` — creates an npm tarball from tracked sources, installs it offline into a clean consumer, verifies the packed file list and installed generated artifacts, requires a freshly compiled native addon, and loads the installed package without parser regeneration.
22. `make build` — builds the static and shared C libraries and the pkg-config metadata.

The pinned versions used by CI come from `package-lock.json` (Tree-sitter CLI `0.27.2`, tree-sitter Node runtime `0.25.1`, Prettier `3.10.1`), `requirements-dev.txt` (Ruff `0.17.6`), and the pinned `setup-swift` action (Swift `6.2.1`).

All `make ci` checks above are correctness gates: a failure produces a nonzero exit status. These gates cover every required Phase 6 test layer, the clean Node.js binding build, the generated parser runtime check, the C binding symbol check, the Python binding capsule check, the Rust binding surface and `cargo test --locked` checks, the Swift binding surface and `swift build`/`swift test` checks, cross-file version consistency, and offline tarball installation into a clean consumer; remaining Phase 7 work, especially Go binding validation and parsing from that tarball installation, is listed in [Not yet covered](#not-yet-covered). Latency and memory observations are outside CI; comparison reports explicitly mark timing deltas and comparability mismatches as [non-gating performance warnings](benchmarking.md#correctness-failures-versus-performance-warnings). A correctness failure is never reported as a performance warning.

## Performance reporting

After the CI gate, the Node 24 matrix leg runs `make performance-report`. It measures fresh latency, incremental latency, and parse-tree memory with the committed defaults, compares them with the [committed baseline and budgets](benchmarking.md#hardware-variance-aware-reporting), and prints a Markdown report in the job log. A different runner or configuration makes the session non-comparable rather than slower; budget exceedances are warnings for investigation. This step never gates the build, while the benchmark harnesses' correctness guards still fail on invalid fixtures or CST mismatches.

## Reproduce locally

From a clean checkout:

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
make ci
```

Alternatively, `make install-dev` performs both dependency installs. `make ci` expects dependencies to be installed first: the Node binding test loads the native addon built by `npm ci`, the incremental equivalence harness uses the pinned Tree-sitter CLI installed there, formatting/static checks use the pinned Prettier and Ruff binaries, and `make test-swift` needs a Swift toolchain and its system libraries on `PATH` (CI selects Swift 6.2.1 on Ubuntu 24.04). `make format` is the local auto-fix command and is deliberately not part of CI.

## Not yet covered

The following checks are required by the project roadmap but are not yet part of `make ci`:

- Go binding build and package-content checks (Phase 7).
- representative Rust parse, query, recovery, and incremental-equivalence tests; the existing gate validates structure and runs the shallow load/doc tests (Phase 7).
- parsing a representative composition from the npm-tarball installation (Phase 7); installation and native addon loading are already gated by `make test-tarball-install`.

Performance budgets and reports are committed or published observations, not gates: `make ci` validates their structure, while `make performance-report` reports comparability and envelope status without failing the build.
