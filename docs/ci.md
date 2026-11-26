# Continuous integration

GitHub Actions validates the grammar in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). The workflow runs for pull requests and pushes to `main`; tag pushes are handled by the separate [publish workflow](../.github/workflows/publish.yml). See the [test strategy](test-strategy.md) for the full test-layer index and extension procedures.

## Triggers and jobs

- **Triggers:** `pull_request` and `push` to `main`.
- **Permissions:** `contents: read` only.
- **Concurrency:** superseded runs on the same ref are cancelled.
- **Matrix:** Node.js 22 and 24 on `ubuntu-latest`.
- **Actions:** pinned to commit SHAs with version comments.

Each matrix job installs the locked dependencies with `npm ci`, then runs `make ci`.

## What `make ci` runs

`make ci` expands to `verify-all build`:

1. `make check-generated` — regenerates with the pinned Tree-sitter CLI and checks that parser artifacts are unchanged from `HEAD`, including staged changes.
2. `make check-format` — runs Prettier and Ruff formatting checks over non-generated sources; `AGENTS.md`, generated parser files, benchmark fixtures/results, and lockfiles are excluded.
3. `make check-static` — runs Ruff lint rules `E4`, `E7`, `E9`, and `F` and checks the install shell script with `sh -n`.
4. `make check-benchmark-fixtures` — verifies that the [benchmark fixtures](benchmarking.md) match their manifest sizes, hashes, and deterministic generation parameters.
5. `make check-benchmark-baseline` — validates the [committed baseline](benchmarking.md#baseline-results) schema, provenance, environment agreement, fixture/catalog coverage, sample statistics, and memory invariants. It does not enforce a performance threshold.
6. `make check-benchmark-budgets` — validates the [committed budgets](benchmarking.md#performance-budgets) provenance, environment/configuration agreement, fixture/catalog coverage, and observed maxima by recomputation. It does not gate current timings.
7. `make test` — runs all corpus cases, including incomplete-call, incomplete-argument-list, incomplete-expression, and missing-delimiter cases.
8. `make test-incremental` — replays the complete [incremental edit catalog](incremental-equivalence-procedure.md) through the pinned Tree-sitter CLI and requires every incremental tree to equal a fresh parse, including malformed intermediate steps and final sources.
9. `make test-query` — runs `make test-query-compile` to compile every query in `queries/` and reject negative controls with invalid node and field names, runs `make test-query-execution` to assert every official capture name on grammar-derived roles in the representative fixtures and reject a wrong-capture negative control, and runs `make test-query-registration` to verify metadata registration, packaged query rules, and Python/Rust query exports. It also executes each official query against the committed fixtures, checks that `highlights.scm` emits no duplicate captures for the same source range, and verifies that call identifiers and object keys selected by probe queries receive no locals definition capture.
10. `make test-regressions` — validates the [regression inventory](regression-coverage.md), ensuring every recorded bug still has an existing, wired regression artifact.
11. `make test-node` — runs the Node.js binding tests with the tree-sitter runtime resolved from `package-lock.json`, covering load, generated metadata, CST fields, error recovery, query execution, and incremental/fresh equivalence through the native addon.
12. `make test-package` — runs `npm pack --dry-run --json --ignore-scripts` and checks metadata consistency, required files, forbidden artifacts, and packed file sizes.
13. `make build` — builds the static and shared C libraries and the pkg-config metadata.

The pinned versions used by CI come from `package-lock.json` (Tree-sitter CLI `0.27.2`, tree-sitter Node runtime `0.25.1`, Prettier `3.10.1`) and `requirements-dev.txt` (Ruff `0.17.6`).

All `make ci` checks above are correctness gates: a failure produces a nonzero exit status. Latency and memory observations are outside CI; comparison reports explicitly mark timing deltas and comparability mismatches as [non-gating performance warnings](benchmarking.md#correctness-failures-versus-performance-warnings). A correctness failure is never reported as a performance warning.

## Reproduce locally

From a clean checkout:

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
make ci
```

Alternatively, `make install-dev` performs both dependency installs. `make ci` expects dependencies to be installed first: the Node binding test loads the native addon built by `npm ci`, the incremental equivalence harness uses the pinned Tree-sitter CLI installed there, and formatting/static checks use the pinned Prettier and Ruff binaries. `make format` is the local auto-fix command and is deliberately not part of CI.

## Not yet covered

The following checks are required by the project roadmap but are not yet part of `make ci`:

- hardware-variance-aware CI reporting (Phase 6); performance budgets are committed and structurally validated but do not gate current timings;
- non-Node binding builds and their package-content checks (Phase 7).
