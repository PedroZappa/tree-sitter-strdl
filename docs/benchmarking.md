# Benchmarking

This document owns the Phase 6 benchmark fixture inventory and fresh/incremental latency and memory measurements. The authoritative fixture metadata is [manifest.json](../benchmarks/fixtures/manifest.json); no committed baselines are recorded yet.

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

## Incremental parsing latency

`make bench-incremental` measures incremental update latency through the Node.js binding. It reads the 21 edit sequences in [incremental_sequences.json](../test/fixtures/incremental_sequences.json), validates their fixtures against the benchmark manifest, and replays each sequence with two unmeasured warmup replays and 15 measured replays by default. Each timed step includes `tree.edit` and the subsequent `Parser.parse(updated, tree)` call. The initial fresh parse and the fresh comparison parse after each step are deliberately outside the measured interval.

The harness compares every incremental tree with a fresh parse of the same intermediate source. A mismatch, an edit that cannot be applied, or a final tree whose `hasError` disagrees with the manifest fails the run. Results report min, mean, P50, P95, P99, and max in milliseconds both per edit step and per replay total.

```sh
make bench-incremental
make bench-incremental BENCH_ITERATIONS=30 BENCH_WARMUP=5
make bench-incremental BENCH_SEQUENCE=malformed-call-repair BENCH_OUTPUT=benchmarks/results/incremental.json
make bench-incremental BENCH_CATEGORY=compact-fixture
```

`scripts/bench_incremental.js --json` prints the same report as structured output. Sequence totals are not directly comparable with fresh fixture totals because they replay different source sizes and edit counts; use the report's fixture path, edit count, and per-step values when interpreting results. This is a measurement tool, not a committed baseline or CI gate.

## Memory consumption

`make bench-memory` runs Node with `--expose-gc` and measures retained parse-tree memory for fresh and incremental workloads. It forces GC before each baseline and again after the measured trees are retained, then reports deltas for V8 `heapUsed`, `heapTotal`, `external`, `arrayBuffers`, and RSS. Each fresh iteration retains one parse tree; each incremental replay retains the initial tree plus one tree per edit and compares every step with a fresh parse. Warmup iterations are unretained.

```sh
make bench-memory
make bench-memory BENCH_MODE=fresh BENCH_FIXTURE=synthetic-large
make bench-memory BENCH_MODE=incremental BENCH_SEQUENCE=malformed-call-repair BENCH_OUTPUT=benchmarks/results/memory.json
make bench-memory BENCH_CATEGORY=compact-fixture
```

`scripts/bench_memory.js --json` prints the same report as structured output. Heap values describe reachable JavaScript heap after GC; native tree memory may appear primarily in RSS. RSS is process-wide and allocator-granular, so per-tree values can be zero or jump in page-sized increments. Sampled peak deltas are observed after retaining each tree, not a continuous high-water trace. This is a measurement tool, not a committed baseline or CI gate.

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
- `make bench-incremental` with 15 measured replays and 2 warmup replays ran on Node v26.13.1, tree-sitter runtime 0.25.1, linux/x64 with 24 logical CPUs. It covered all 21 sequences, 29 edit steps, and 435 fresh-comparison parses per measured pass. Observed replay-total P99 values in milliseconds were: method-chain-insertion 0.414387, pattern-string-replacement 0.124559, declaration-deletion 0.049974, nested-object-edits 0.091612, malformed-call-repair 0.078348, declaration-insertion 0.049517, arrow-parameter-rename 0.098679, method-deletion 0.064867, call-statement-insertion 0.043110, template-content-edit 0.062985, compact-set-cps 0.010771, compact-declaration-deletion 0.024841, compact-malformed-repair 0.042569, argument-deletion 0.033128, object-property-deletion 0.035529, method-name-replacement 0.037611, nested-call-edit 0.058675, nested-arrow-body-edit 0.094787, object-brace-repair 0.073458, string-quote-repair 0.087804, and array-bracket-repair 0.112255.
- A temporary catalog negative control that changed the first edit's `occurrence` to 99 failed with exit 1 before producing a report.
- A temporary manifest negative control that changed `representative-main` SHA-256 failed with exit 1 before replaying edits.
- A filtered JSON-report control wrote a one-sequence report with `mode: incremental`, one step, two fresh comparisons, and finite P99; a `compact-fixture` category control selected four sequences; `node --check` passed for all three latency scripts.
- `make bench-memory` with 15 retained iterations and 2 unretained warmups ran on Node v26.13.1, tree-sitter runtime 0.25.1, linux/x64 with 24 logical CPUs. It forced GC and covered all 5 fresh fixtures and 21 incremental sequences. Observed retained heap per tree was 870, 683, 198, 189, and 183 bytes for representative-main, representative-local, synthetic-large, deeply-nested, and pathological; incremental values ranged from 282 to 2,291 bytes per tree. Sampled peak RSS reached 61,341,696 bytes for synthetic-large and 7,274,496 bytes for pattern-string-replacement.
- Negative controls failed with exit 1 when the memory script was run without `--expose-gc`, when a catalog edit used `occurrence: 99`, when `representative-main` SHA-256 was wrong, and when `--mode` was invalid.
- A filtered JSON-report control wrote a one-fixture report with `mode: memory`, two retained trees, finite heap per tree, and `gcAvailable: true`; a `compact-fixture` category control selected four incremental sequences; `node --check` passed for all four benchmark scripts.

## Remaining work

Committed fresh/incremental latency and memory baselines, dedicated hardware/software environment capture, and performance budgets remain separate roadmap items. The reports include basic runtime metadata but are not hardware-normalized. This document will own those results as they are added.
