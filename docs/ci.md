# Continuous integration

GitHub Actions validates the grammar in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). The workflow runs for pull requests and pushes to `main`; tag pushes are handled by the separate [publish workflow](../.github/workflows/publish.yml).

## Triggers and jobs

- **Triggers:** `pull_request` and `push` to `main`.
- **Permissions:** `contents: read` only.
- **Concurrency:** superseded runs on the same ref are cancelled.
- **Matrix:** Node.js 22 and 24 on `ubuntu-latest`.
- **Actions:** pinned to commit SHAs with version comments.

Each matrix job installs the locked dependencies with `npm ci`, then runs `make ci`.

## What `make ci` runs

`make ci` expands to `verify-all build`:

1. `make check-generated` — regenerates with the pinned Tree-sitter CLI and checks that committed parser artifacts are unchanged.
2. `make test` — runs all corpus cases, including incomplete-call, incomplete-argument-list, incomplete-expression, and missing-delimiter cases.
3. `make test-query` — runs `make test-query-compile` to compile every query in `queries/` and reject negative controls with invalid node and field names, runs `make test-query-execution` to assert expected captures on grammar-derived roles in the representative fixtures, and runs `make test-query-registration` to verify metadata registration, packaged query rules, and Python/Rust query exports. It also executes each official query against the committed fixtures, checks that `highlights.scm` emits no duplicate captures for the same source range, and verifies that call identifiers and object keys selected by probe queries receive no locals definition capture.
4. `make test-node` — runs the Node.js binding tests with the tree-sitter runtime resolved from `package-lock.json`.
5. `make build` — builds the static and shared C libraries and the pkg-config metadata.

The pinned versions used by CI come from `package-lock.json`: Tree-sitter CLI `0.27.2` and tree-sitter Node runtime `0.25.1`.

## Reproduce locally

From a clean checkout:

```sh
npm ci
make ci
```

`make ci` expects dependencies to be installed first because the Node binding test loads the native addon built by `npm ci`.

## Not yet covered

The following checks are required by the project roadmap but are not yet part of `make ci`:

- incremental-versus-fresh parse equivalence (Phase 4) — a local harness now exists as `make test-incremental`; see the [equivalence test procedure](incremental-equivalence-procedure.md);
- benchmark fixtures, baselines, and performance-regression reporting (Phase 6);
- non-Node binding builds and package-content checks (Phase 7);
- formatting and static checks beyond generated-artifact consistency (no formatter is configured yet).
