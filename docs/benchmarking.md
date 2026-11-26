# Benchmarking

This document owns the Phase 6 benchmark fixture inventory. The authoritative fixture metadata is [manifest.json](../benchmarks/fixtures/manifest.json); no latency, memory, or baseline results are recorded yet.

## Fixture inventory

| ID | Role | Path | Parameters | Expected parse |
| --- | --- | --- | --- | --- |
| `representative-main` | Representative Strudel composition | [`test.strdl`](../test.strdl) | committed source | clean |
| `representative-local` | Representative Strudel composition | [`test-local.strdl`](../test-local.strdl) | committed source | clean |
| `synthetic-large` | Synthetic large document | [`synthetic-large.strdl`](../benchmarks/fixtures/generated/synthetic-large.strdl) | 2,000 declarations | clean |
| `deeply-nested` | Deeply nested expression | [`deeply-nested.strdl`](../benchmarks/fixtures/generated/deeply-nested.strdl) | call depth 512 | clean |
| `pathological` | Pathological stress input | [`pathological.strdl`](../benchmarks/fixtures/generated/pathological.strdl) | 300 malformed blocks | `ERROR` nodes expected |

The two representative compositions are reused rather than duplicated. The manifest records their byte sizes and SHA-256 hashes so changes to those fixtures are explicit.

## Reproduction

```sh
make benchmark-fixtures        # regenerate the three synthetic fixtures
make check-benchmark-fixtures  # verify sizes, hashes, and exact regeneration
```

[`generate_benchmark_fixtures.py`](../scripts/generate_benchmark_fixtures.py) uses the manifest seed and parameters to render every generated fixture. `make check-benchmark-fixtures` is part of `make verify` and therefore `make ci`; representative files are hashed but never rewritten.

## Fresh parsing latency

`make bench-fresh` measures fresh parse latency through the Node.js binding. It validates every fixture's byte size and SHA-256 from the manifest, runs two unmeasured warmup parses and 15 measured parses by default, and times only `Parser.parse` with no tree supplied from a previous edit. Each result reports min, mean, P50, P95, P99, and max in milliseconds. A parse whose `rootNode.hasError` disagrees with the manifest's `expected_clean` value fails the run.

```sh
make bench-fresh
make bench-fresh BENCH_ITERATIONS=30 BENCH_WARMUP=5
make bench-fresh BENCH_FIXTURE=synthetic-large BENCH_OUTPUT=benchmarks/results/fresh.json
```

`scripts/bench_fresh.js --json` prints the same report as structured output. This is a measurement tool, not a committed baseline or CI gate; results vary by hardware and concurrent load.

## Validation performed

- All four `expected_clean: true` fixtures parse with `tree-sitter parse --quiet` and exit 0 using CLI 0.27.2.
- The two representative compositions are the canonical fixtures already used by query execution (`Makefile` `FIXTURES`) and the incremental catalog (`test/fixtures/incremental_sequences.json`), so they are reused rather than duplicated.
- A temporary manifest negative control that changed the `representative-main` SHA-256 failed with exit 1; the clean manifest passes.
- The synthetic large fixture is 95,393 bytes, contains exactly 2,000 generated declarations, and parses cleanly with `tree-sitter parse --quiet`.
- A temporary manifest negative control that changed the synthetic declaration count to 1,999 failed with exit 1 because the committed fixture no longer regenerated from the manifest parameters.
- The deeply nested fixture is 1,639 bytes and contains a 512-level `s(` call chain around `note("c3")`; it parses cleanly with `tree-sitter parse --quiet`.
- A temporary manifest negative control that changed the nested depth to 511 failed with exit 1 because the committed fixture no longer regenerated from the manifest parameters.
- The pathological fixture is 7,447 bytes, contains exactly 300 malformed blocks, exits nonzero, and produces 498 `ERROR` nodes with no `MISSING` nodes, as intended for stress testing.
- A temporary manifest negative control that changed the pathological block count to 299 failed with exit 1 because the committed fixture no longer regenerated from the manifest parameters.
- A negative control appended a newline to `deeply-nested.strdl`; the checker failed with exit 1 on size, SHA-256, and regeneration mismatch, then passed after restoration.
- The committed set contains five fixtures and 107,480 bytes in total.
- `make bench-fresh` with 15 measured and 2 warmup parses ran on Node v26.13.1, tree-sitter runtime 0.25.1, linux/x64 with 24 logical CPUs. P50/P95/P99 in milliseconds were: representative-main 0.492108/0.534366/0.549940, representative-local 0.017792/0.026397/0.039735, synthetic-large 10.310601/10.421912/10.427943, deeply-nested 0.372424/0.406146/0.415580, and pathological 1.995324/2.033064/2.034242.
- A temporary manifest negative control that changed `synthetic-large` SHA-256 failed with exit 1 before timing any fixture.
- A temporary manifest negative control that marked the pathological fixture `expected_clean: true` failed with exit 1 because its parse still contained an `ERROR` node.
- A filtered JSON-report control wrote a one-fixture report with `mode: fresh`, two samples, and finite P99; `node --check` passed.

## Remaining work

Incremental latency measurement, memory measurement, P50/P95/P99 reporting for incremental parsing, dedicated hardware/software environment capture, committed baselines, and performance budgets remain separate roadmap items. The fresh report includes basic runtime metadata but is not hardware-normalized. This document will own those results as they are added.
