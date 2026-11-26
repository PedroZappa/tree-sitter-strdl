# Testing procedures

This document describes how to run the project's tests, interpret their output, and respond to failures. [Test strategy](test-strategy.md) remains the authoritative index of test layers, inputs, scripts, and rules for adding tests; [CI](ci.md#what-make-ci-runs) defines the automated gate; [build and generation](build-and-generation.md#verify-generation-and-builds) covers artifact regeneration and build commands.

Tests exercise syntax recognition and the public concrete syntax tree (CST). They do not perform semantic analysis or parse mini-notation contents.

## Before running tests

Install the pinned toolchain as described in [development environment](development-environment.md#initial-setup):

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

`npm ci` installs the pinned Tree-sitter CLI and runtime and builds the current Node addon. The `.venv` provides Ruff, setuptools, and wheel. The Makefile prefers these repository-local tools over global binaries. `make help` lists every target and supported variable.

## Recommended validation paths

| Change type                         | Run before finishing                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Corpus, grammar, or CST behavior    | `make generate`, `make check-generated`, `make test`, `make test-query`, `make test-incremental`, `make test-node`                              |
| Query text or registration          | `make test-query`; use `make test-query-compile`, `make test-query-execution`, or `make test-query-registration` for a narrower check           |
| Incremental catalog or edit harness | `make test-incremental INCREMENTAL_FILTER="..."`, then the unfiltered `make test-incremental`                                                   |
| Recovery expectations               | `make test-recovery`, then `make test` because recovery cases also belong to the full corpus                                                    |
| Node.js binding                     | `make test-node`, then `make test-node-clean-build` when native build wiring changed                                                            |
| Other binding or package surface    | The relevant `make test-c`, `make test-python`, `make test-rust`, `make test-swift`, `make test-package`, or `make test-tarball-install` target |
| Final local validation              | `make ci` when every gated toolchain is installed; otherwise run all applicable targeted gates and state which toolchains were unavailable      |

Parser regeneration is required only after a `grammar.js` change. Query, corpus, binding, and packaging changes use the committed generated artifacts directly.

## Run targeted tests

### Corpus cases

```sh
make test
make test FILTER="method chain"
make test-recovery
```

`FILTER` is passed to `tree-sitter test -i` and restricts corpus case names. It is a local convenience: run the unfiltered `make test` before completion. `make test-recovery` reruns the recovery-focused corpus files as a subset; it does not replace the full corpus gate.

Expected trees are explicit. For malformed and incomplete cases, document localized `MISSING` or `ERROR` nodes as they are; do not convert known weak-recovery behavior into expected-good syntax. The authoritative limitations are recorded under [error recovery and stability](grammar-architecture.md#error-recovery-and-stability) and the recovery corpus.

### Incremental equivalence

```sh
make test-incremental
make test-incremental INCREMENTAL_FILTER="deletion replacement"
```

Filter terms match sequence IDs or categories in `test/fixtures/incremental_sequences.json`; multiple terms may be separated by spaces. Every selected sequence is replayed with edits, and each incremental tree is compared with a fresh parse. The harness also validates catalog structure and requires every final source to be error-free. See the [equivalence procedure](incremental-equivalence-procedure.md) for the comparison rules.

### Queries

```sh
make test-query
make test-query-compile
make test-query-execution
make test-query-registration
```

`make test-query` runs all query layers and builds the shared parser library used for execution. Query compilation rejects invalid node and field names; execution asserts every official capture name against grammar-derived roles; registration checks metadata, packaged query rules, and binding exports; invariant checks reject duplicate highlight captures and incorrect locals definitions. Query probes under `test/query/` are test inputs, not official queries.

### Bindings and packaging

```sh
make test-node
make test-node-clean-build
make test-generated-runtime
make test-c
make test-python
make test-rust
make test-swift
make test-package
make test-tarball-install
```

`make test-node` uses the current native addon; `make test-node-clean-build` compiles from clean tracked sources and is the right check after a build-wiring change. `make test-generated-runtime` verifies that the committed generated parser works without `grammar.js` or the CLI. Package checks validate the npm surface, clean-consumer installation, and parsing through the installed package.

## Aggregate gates

```sh
make verify       # core correctness gate
make verify-all   # verify plus bindings, version, package, and tarball-install checks
make ci           # verify-all plus the C library build
```

CI runs `make ci` on Node.js 22 and 24. `make verify` includes generated-artifact, formatting, static, corpus, incremental, query, regression, and benchmark-artifact structural checks. `make verify-all` adds binding and distribution checks. Prefer the narrowest relevant target while iterating, then run `make ci` before declaring a change ready.

`make performance-report` is informational and non-gating. Latency and memory measurement procedures are owned by the [benchmarking procedure map](benchmarking.md#procedure-map), not by the correctness gates described here.

## Interpret a clean run

Current clean-tree results, recorded on 2026-11-26 with CLI 0.27.2:

| Command                 | Clean result                                                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make test`             | 157/157 corpus cases; zero failed parses                                                                                                                                                           |
| `make test-recovery`    | 86 recovery cases across the recovery corpus files                                                                                                                                                 |
| `make test-incremental` | 21/21 sequences, 29 steps, 5 malformed intermediate steps, and 21/21 final-source comparisons                                                                                                      |
| `make test-query`       | 2 official queries compiled; 2 compilation negative controls rejected; 25 capture assertions; 1,096 deterministic captures; 30 call-identifier and 23 object-key ranges without locals definitions |
| `make test-node`        | 7/7 Node.js binding tests                                                                                                                                                                          |

Counts are observations for this revision and can change when tests are added. Treat a nonzero exit status as failure even if most cases pass. The CLI may print slow-parse-rate warnings for small fixture inputs; those warnings do not fail the correctness gate. Performance comparisons are reported separately as [non-gating warnings](benchmarking.md#correctness-failures-versus-performance-warnings).

## Respond to failures

- **Generated artifacts out of sync:** run `make generate`, review the `src/` diff, and rerun `make check-generated`. Never hand-edit generated files. See [build and generation](build-and-generation.md#regenerate-parser-artifacts).
- **Corpus tree mismatch:** inspect the actual CST with `make parse FILES=...` or the Node binding. Change the expected tree only when the new shape is intentional and update the public-CST documentation and regression inventory when required.
- **Incremental mismatch:** identify the sequence with `INCREMENTAL_FILTER`, inspect the failing edit step, and compare it with a fresh parse. Fix the catalog or harness only when the recorded edit is wrong; do not weaken the equivalence check.
- **Query failure:** use the compilation, execution, and registration targets to localize the layer. Invalid node or field names fail compilation; missing expected captures fail execution; metadata or export mismatches fail registration.
- **Stale Node addon:** run `make test-node-clean-build`. Avoid `npm rebuild --build-from-source` as a routine remedy because npm 11 was observed pruning dependency and build directories. Details are in the [environment notes](development-environment.md#tool-selection-and-environment-notes).
- **Python binding build failure:** use `.venv/bin/python` or override `PYTHON`; the pinned setuptools and wheel versions are required by `setup.py`.
- **Rust or Swift toolchain failure:** check `PATH` and the platform requirements in the [development environment](development-environment.md#binding-and-platform-tools). On macOS, XCTest requires a full Xcode installation rather than Command Line Tools alone.
- **Package-check failure:** run `make test-package` or `make test-tarball-install` for a precise diagnostic, then review the `package.json` allowlist and canonical `tree-sitter.json` metadata.

Do not weaken, skip, or delete a failing test merely to make the suite pass. Record the diagnosis and rationale in the [roadmap verification log](roadmap.md#verification-log) when a test or gate changes.

## Negative controls and regressions

A new correctness invariant should demonstrate both a passing committed state and a failing negative control. Some checks include permanent negative controls, such as invalid query node/field names and the wrong-capture execution probe. For other new invariants, perform the negative control in an isolated copy, record the command and nonzero result in the roadmap, and leave the working tree unchanged.

Every discovered bug must produce a permanent artifact under `test/corpus/`, in a binding test, or in an explicit exclusion. The [regression inventory](regression-coverage.md) is authoritative; run `make test-regressions` to verify that all recorded entries still resolve to existing artifacts.

## Adding tests

Follow the numbered extension rules in [test strategy](test-strategy.md#adding-or-changing-tests). In short: add explicit corpus cases, wire new query probes into `test-query-execution`, add incremental sequences to the catalog, extend binding tests for behavior specific to a binding, update package or benchmark inventories when their surfaces change, and include new gates in the appropriate aggregate target and CI documentation.
