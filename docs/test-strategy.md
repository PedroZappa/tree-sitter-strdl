# Test strategy

This document is the index for how `tree-sitter-strdl` is tested. It owns the Phase 6 roadmap item “Create a documented test strategy index.” The [Makefile](../Makefile) is the canonical command entry point; authoritative details for individual layers live in the linked documents rather than being duplicated here.

The tests cover syntax recognition and the public concrete syntax tree (CST). They do not perform semantic analysis, resolve symbols, or parse mini-notation contents.

## Principles

- Expected corpus trees are explicit and reviewed.
- Malformed-input cases document localized errors and known recovery limitations rather than pretending weak recovery is valid syntax.
- Generated parser files are build artifacts: consistency is checked, not manually maintained.
- A discovered parser or query bug must produce a permanent regression test.
- The [regression inventory](regression-coverage.md) is the authoritative record of discovered bugs and their regression artifacts.
- CI and local development use the same `make` targets wherever possible; gaps are listed explicitly below.
- Query probes under `test/query/` are test inputs, not official queries.

## Test layers

| Layer | Command | Inputs | What it verifies |
| --- | --- | --- | --- |
| Generated-artifact consistency | `make check-generated` | `grammar.js`, pinned Tree-sitter CLI, files under `src/` | Regeneration produces no differences from `HEAD` in committed parser artifacts, including staged changes. |
| Corpus behavior | `make test` (`FILTER=regex` optional) | `test/corpus/*.txt` | All corpus cases produce their expected CSTs. The suite includes valid syntax, precedence, modules, templates, error recovery, and known-limitation regressions. |
| Recovery subset | `make test-recovery` | `incomplete_*`, `malformed_*`, `missing_*`, `noncascading_*`, `recovery_*`, `unfinished_*`, and `valid_*` corpus files | Re-runs the recovery-focused corpus files as a dedicated subset. These cases also run under `make test`. |
| Incremental equivalence | `make test-incremental` (`INCREMENTAL_FILTER=...` optional) | `test/fixtures/incremental_sequences.json`, `test.strdl`, `test-local.strdl` | Incremental parses equal fresh parses after every edit and at the final source; catalog IDs and fixture keys are validated, and final sources must be error-free. See [incremental equivalence](incremental-equivalence-procedure.md) and the [sequence catalog](incremental-editing-sequences.md). |
| Query compilation | `make test-query-compile` | `queries/*.scm` | Every official query compiles, and built-in negative controls reject invalid node and field names. |
| Query execution | `make test-query-execution` | `test/query/*.scm`, representative fixtures | Probe-selected ranges assert every official highlight and locals capture name; a wrong-capture negative control is rejected. |
| Query registration | `make test-query-registration` | `tree-sitter.json`, `package.json`, binding exports | Official queries are registered, packaged, and exported consistently. See [query audit](query-audit.md#registration-packaging-and-binding-exports). |
| Query invariants | `make test-query` | `queries/`, `test.strdl`, `test-local.strdl`, `test/query/determinism.strdl` | Official queries execute; highlights are deterministic; call identifiers and object keys receive no locals definition captures. |
| Node.js binding | `make test-node` | `bindings/node/*_test.js` | The native addon loads, exports generated metadata, exposes CST fields, recovers from incomplete input, executes a query, and matches a fresh parse after an incremental edit. |
| Package integrity | `make test-package` | `package.json`, `tree-sitter.json`, `npm pack --dry-run --json --ignore-scripts` | Package metadata is consistent; required runtime files are present; forbidden build artifacts are absent; packed file sizes match local files. |
| Regression inventory | `make test-regressions` | `test/fixtures/regression_inventory.json` | Every recorded bug resolves to an existing, wired corpus case, binding test, fixture, or gate artifact; documented exclusions remain rationale-only. See [regression coverage](regression-coverage.md). |
| Benchmark fixture consistency | `make check-benchmark-fixtures` | `benchmarks/fixtures/manifest.json`, generated and representative fixtures | Fixture sizes, hashes, and generated content match the manifest exactly. See [benchmarking](benchmarking.md). |
| Fresh parse latency | `make bench-fresh` | `scripts/bench_fresh.js`, `benchmarks/fixtures/manifest.json`, Node.js binding | Measures `Parser.parse` latency with warmup, percentiles, fixture hash validation, and `expected_clean` guards. Not a CI gate. See [benchmarking](benchmarking.md#fresh-parsing-latency). |
| Incremental parse latency | `make bench-incremental` | `scripts/bench_incremental.js`, `scripts/bench_common.js`, `test/fixtures/incremental_sequences.json`, Node.js binding | Times `tree.edit` plus incremental `Parser.parse` with warmup and percentiles, and rejects any step whose tree differs from a fresh parse. Not a CI gate. See [benchmarking](benchmarking.md#incremental-parsing-latency). |
| C library build | `make build` (included in `make ci`) | `bindings/c/`, generated sources | Static/shared libraries and pkg-config metadata build from generated artifacts. Build validation is distinct from behavioral testing. |

## Command map

| Target | Scope |
| --- | --- |
| `make test` | Full corpus suite. |
| `make test-recovery` | Recovery-focused corpus subset. |
| `make test-incremental` | Incremental/fresh equivalence harness; not yet in CI. |
| `make test-query-compile` | Query syntax, node types, and field names. |
| `make test-query-execution` | Expected captures on grammar-derived roles. |
| `make test-query-registration` | Metadata, packaging rules, and binding exports. |
| `make test-query` | All query layers plus execution and invariant checks. |
| `make test-node` | Native Node.js binding behavior tests. |
| `make test-package` | npm package contents, metadata, and file-size checks. |
| `make test-regressions` | Regression inventory integrity and artifact wiring. |
| `make benchmark-fixtures` | Regenerate synthetic benchmark fixtures. |
| `make check-benchmark-fixtures` | Benchmark fixture size, hash, and regeneration consistency. |
| `make bench-fresh` | Fresh parse latency measurement with configurable iterations, warmup, fixture filter, and JSON output. |
| `make bench-incremental` | Incremental parse latency measurement with configurable iterations, warmup, sequence/category filters, and JSON output. |
| `make check-generated` | Generated-file consistency against `HEAD`. |
| `make verify` | Generated-file, benchmark-fixture, corpus, query, and regression-inventory layers. |
| `make verify-all` | `verify` plus Node.js binding and package checks. |
| `make ci` | `verify-all` plus the C library build. |

Run `make help` for the authoritative target list and parameter names.

## Fixtures and scripts

- `test/corpus/`: explicit expected trees for valid, ambiguous, malformed, incomplete, and regression cases.
- `test.strdl` and `test-local.strdl`: representative compositions used by query and incremental harnesses.
- `test/query/determinism.strdl`: shared fixture for capture uniqueness and locals-definition checks.
- `test/query/*.scm`: probe queries that identify syntactic roles for `scripts/check_query_captures.py` and `scripts/check_locals_definitions_absent.py`.
- `test/fixtures/incremental_sequences.json`: recorded edit sequences for `scripts/test_incremental.py`.
- `test/fixtures/regression_inventory.json`: authoritative bug-to-regression inventory for `scripts/check_regression_coverage.py`.
- `benchmarks/fixtures/manifest.json`: authoritative benchmark fixture inventory, parameters, sizes, and hashes.
- `scripts/check_query_compilation.py`: compiles official queries and runs two built-in negative controls.
- `scripts/check_query_captures.py`: asserts expected captures for a probe role.
- `scripts/check_query_determinism.py`: rejects multiple highlight captures for one source range.
- `scripts/check_locals_definitions_absent.py`: rejects locals definition captures on selected probe roles.
- `scripts/check_query_registration.py`: checks official query registration, packaging, and binding exports.
- `scripts/check_package_integrity.py`: checks packed metadata, required files, forbidden artifacts, and file sizes.
- `scripts/check_regression_coverage.py`: validates the regression inventory and its referenced artifacts.
- `scripts/generate_benchmark_fixtures.py`: generates and verifies deterministic benchmark fixtures.
- `scripts/bench_common.js`: shared benchmark argument, fixture, catalog, edit replay, statistics, and report helpers.
- `scripts/bench_fresh.js`: fresh parse latency measurement.
- `scripts/bench_incremental.js`: incremental parse latency measurement with fresh-CST equivalence guards.
- `scripts/test_incremental.py`: replays edits and compares incremental and fresh CSTs.

Temporary negative controls used while developing the determinism, locals-definition, registration, and capture checks are recorded in the [roadmap verification log](roadmap.md#verification-log). The query compilation checker contains built-in negative controls, and `test-query-execution` includes a permanent wrong-capture negative control.

## Adding or changing tests

1. **Syntax or CST behavior:** add a case under `test/corpus/` with an explicit expected tree. Add malformed or incomplete cases to files matching the `make test-recovery` wildcards.
2. **Query role assertions:** add a probe query under `test/query/` and a line in the `test-query-execution` target with the expected capture name.
3. **Query invariants:** extend the relevant script and Makefile target. Include negative-control evidence in the roadmap when a new invariant is introduced.
4. **Incremental parsing:** add a sequence to `test/fixtures/incremental_sequences.json`, run the filtered subset, then run the full harness.
5. **Query inventory changes:** update `scripts/check_query_registration.py`, registration metadata, binding exports, and the query documentation in the same change.
6. **Node.js binding behavior:** extend `bindings/node/binding_test.js` when native export shape, parser behavior, query execution, or incremental parsing through the primary binding needs coverage.
7. **Package contents:** update `scripts/check_package_integrity.py` and the `package.json` `files` allowlist when the published surface changes; keep generated sources explicit rather than using broad `src/**` patterns.
8. **Discovered bug:** add a `BUG-*` entry to the [regression inventory](regression-coverage.md) in the same change as the fix. Use an `EXC-*` entry only when no behavior changed.
9. **Benchmark fixture:** update `benchmarks/fixtures/manifest.json`, regenerate with `make benchmark-fixtures`, and check with `make check-benchmark-fixtures`.
10. **New test layer:** add a `make` target, include it in the appropriate aggregate target, link it here and from [CI](ci.md), and update the roadmap.

Do not weaken or delete an existing test to make a change pass without an explicit, sound rationale recorded in the roadmap.

## Current coverage and gaps

Covered by `make ci` today: generated-file and benchmark-fixture consistency, corpus behavior, all query layers, regression-inventory integrity, Node.js binding load/metadata/CST/recovery/query/incremental behavior, npm package integrity, and the C library build. Recovery cases run inside the full corpus suite; `make test-recovery` is the dedicated local subset.

Local-only: incremental/fresh equivalence and fresh/incremental latency measurement.

Not yet implemented: memory measurement, committed benchmark baselines and performance-regression reporting, formatting/static checks, and non-Node binding validation. These are tracked in the [Phase 6](roadmap.md#phase-6--testing-and-performance) and [Phase 7](roadmap.md#phase-7--packaging-and-compatibility) checklists. CI gaps are also summarized in [CI](ci.md#not-yet-covered).
