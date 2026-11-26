# Benchmarking

This document owns the Phase 6 benchmark fixture inventory and fresh/incremental latency and memory measurements. The authoritative fixture metadata is [manifest.json](../benchmarks/fixtures/manifest.json); no committed baselines are recorded yet.

The measurement environment is recorded below. Individual JSON reports include a smaller runtime summary from `scripts/bench_common.js`; this section is the dedicated hardware and software record.

## Benchmark environment

This environment was recorded on 2026-11-26 (UTC) at repository commit `362d5fd`, after the Phase 6 measurement work. It applies to the latency and memory observations in this document; the grammar, generated parser, and package metadata were unchanged across those measurement commits. The observations were taken under normal desktop load with no CPU affinity, frequency-governor locking, or workload isolation. The load average at capture was `1.79 1.60 1.54`; it is informational, not a controlled benchmark condition.

| Field | Recorded value | Source |
| --- | --- | --- |
| Operating system | Omarchy 4.5.0 (`ID=omarchy`) | `/etc/os-release` |
| Kernel | `Linux 7.2.15-1-omarchy` | `uname -sr` |
| Machine architecture | `x86_64` | `uname -m` |
| CPU model | `12th Gen Intel(R) Core(TM) i9-12900KF` | `lscpu`, `os.cpus()` |
| CPU topology | 1 socket, 16 cores per socket, 2 threads per core, 24 logical CPUs | `lscpu`, `os.cpus()` |
| CPU maximum frequency | 5,200.0000 MHz; not a guaranteed sustained frequency | `lscpu` |
| Memory | 32,654,224 kB (`/proc/meminfo`); 33,437,925,376 bytes (`os.totalmem()`) | `/proc/meminfo`, benchmark reports |
| Node.js | `v26.13.1`; V8 `14.6.202.34-node.40`; OpenSSL `3.5.9` | `node --version`, `process.versions` |
| npm | `11.20.0` | `npm --version` |
| Tree-sitter CLI | `0.27.2` via `node_modules/.bin/tree-sitter` selected by the Makefile; `0.26.9` on `PATH` | `$(TS) --version`, `tree-sitter --version` |
| Tree-sitter Node runtime | `0.25.1` | `tree-sitter/package.json` |
| Package version | `1.5.0` | `package.json` |
| Repository commit | `362d5fd` | `git rev-parse --short HEAD` |

Reproduce the runtime subset from a generated report and the remaining values with these commands:

```sh
make bench-fresh BENCH_OUTPUT=/tmp/benchmark-environment.json
node -e 'console.log(JSON.stringify(require("/tmp/benchmark-environment.json").environment, null, 2))'
sed -n '/^PRETTY_NAME=/p;/^VERSION_ID=/p;/^ID=/p' /etc/os-release
uname -sr
uname -m
lscpu | sed -n '/^Architecture:/p;/^CPU(s):/p;/^Model name:/p;/^Thread(s) per core:/p;/^Core(s) per socket:/p;/^Socket(s):/p;/^CPU max MHz:/p'
awk '/^MemTotal:/ {print $0}' /proc/meminfo
node --version
node -p 'JSON.stringify(process.versions)'
npm --version
node -p 'require("tree-sitter/package.json").version'
node_modules/.bin/tree-sitter --version
tree-sitter --version
git rev-parse --short HEAD
```

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

## Percentile reporting

Fresh and incremental latency results are reported as separate reports, not as one pooled distribution. `scripts/bench_common.js` sorts each sample set and interpolates P50, P95, and P99 at ranks `(n - 1) * 0.50`, `(n - 1) * 0.95`, and `(n - 1) * 0.99`. Fresh samples are individual `Parser.parse` calls. Incremental samples are replay totals: the sum of the `tree.edit` plus incremental `Parser.parse` timings for every step in one replay. Per-step incremental percentiles are also present in the JSON report.

The following values were recorded from one default run with 15 measured samples and 2 warmup samples per case. They are observations, not baselines.

### Fresh parse latency percentiles

| Fixture | P50 (ms) | P95 (ms) | P99 (ms) |
| --- | ---: | ---: | ---: |
| `representative-main` | 0.324216 | 0.369064 | 0.401948 |
| `representative-local` | 0.017270 | 0.023297 | 0.031866 |
| `synthetic-large` | 10.259487 | 10.546336 | 10.551806 |
| `deeply-nested` | 0.380255 | 0.396238 | 0.402565 |
| `pathological` | 2.018148 | 2.056487 | 2.075988 |

### Incremental replay-total latency percentiles

| Sequence | P50 (ms) | P95 (ms) | P99 (ms) |
| --- | ---: | ---: | ---: |
| `method-chain-insertion` | 0.050129 | 0.088407 | 0.089975 |
| `pattern-string-replacement` | 0.101519 | 0.111033 | 0.118090 |
| `declaration-deletion` | 0.037129 | 0.057602 | 0.069556 |
| `nested-object-edits` | 0.070891 | 0.086573 | 0.097651 |
| `malformed-call-repair` | 0.071524 | 0.074884 | 0.076636 |
| `declaration-insertion` | 0.042142 | 0.047449 | 0.047707 |
| `arrow-parameter-rename` | 0.069568 | 0.080019 | 0.085170 |
| `method-deletion` | 0.042669 | 0.047781 | 0.049059 |
| `call-statement-insertion` | 0.042367 | 0.043557 | 0.043971 |
| `template-content-edit` | 0.042356 | 0.044184 | 0.044375 |
| `compact-set-cps` | 0.010447 | 0.011305 | 0.012178 |
| `compact-declaration-deletion` | 0.011136 | 0.028865 | 0.030224 |
| `compact-malformed-repair` | 0.026983 | 0.041677 | 0.043210 |
| `argument-deletion` | 0.033337 | 0.041979 | 0.055613 |
| `object-property-deletion` | 0.034633 | 0.036612 | 0.038690 |
| `method-name-replacement` | 0.037836 | 0.038668 | 0.038799 |
| `nested-call-edit` | 0.044240 | 0.053095 | 0.066321 |
| `nested-arrow-body-edit` | 0.038268 | 0.039654 | 0.040085 |
| `object-brace-repair` | 0.073640 | 0.075948 | 0.076225 |
| `string-quote-repair` | 0.081336 | 0.091253 | 0.100235 |
| `array-bracket-repair` | 0.107875 | 0.109792 | 0.110390 |

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
- Separate JSON reports were generated with `BENCH_OUTPUT` and checked against distinct expected shapes: `mode: fresh` with five `fixtures` and no `sequences`, and `mode: incremental` with 21 `sequences` and no `fixtures`. All 26 reported stats objects had finite P50/P95/P99/max values ordered as `P50 <= P95 <= P99 <= max`. Temporary report copies with a deleted fresh `p95Ms` and a null incremental `p50Ms` failed validation with exit 1.
- A generated `BENCH_OUTPUT` report reproduced the documented runtime subset exactly: Node `v26.13.1`, tree-sitter runtime `0.25.1`, `linux`/`x64`, 24 logical CPUs, CPU model `12th Gen Intel(R) Core(TM) i9-12900KF`, and `33,437,925,376` bytes of `os.totalmem()`. The remaining documented values were checked against `/etc/os-release`, `uname`, `lscpu`, `/proc/meminfo`, `node --version`, `process.versions`, `npm --version`, both CLI paths, and `git rev-parse`. A temporary report copy with `cpuCount` changed to 23 failed validation with exit 1.

## Remaining work

Committed fresh/incremental latency and memory baselines and performance budgets remain separate roadmap items. The reports include runtime metadata, and the dedicated environment record above is not hardware-normalized. This document will own those results as they are added.
