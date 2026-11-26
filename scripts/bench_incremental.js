#!/usr/bin/env node
"use strict";

const path = require("node:path");

const {
  ROOT,
  DEFAULT_MANIFEST,
  DEFAULT_CATALOG,
  parseInteger,
  round,
  summarize,
  environment,
  createParser,
  assertExpectedParse,
  loadBenchmarkFixtures,
  loadIncrementalCatalog,
  buildEdit,
  writeReport,
  formatStatsRow,
} = require("./bench_common");

function usage() {
  return [
    "Usage: node scripts/bench_incremental.js [options]",
    "",
    "Measures incremental parse latency for recorded edit sequences using the Node.js binding.",
    "",
    "Options:",
    "  --manifest PATH   Fixture manifest (default: benchmarks/fixtures/manifest.json)",
    "  --catalog PATH    Edit catalog (default: test/fixtures/incremental_sequences.json)",
    "  --iterations N    Measured replays per sequence, at least 1 (default: 15)",
    "  --warmup N        Unmeasured replays per sequence, at least 0 (default: 2)",
    "  --sequence ID     Benchmark only one sequence id",
    "  --category NAME   Benchmark only sequences with this category",
    "  --output PATH     Write the full JSON report to PATH",
    "  --json            Print the full JSON report to stdout",
    "  -h, --help        Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    catalog: DEFAULT_CATALOG,
    iterations: 15,
    warmup: 2,
    sequence: null,
    category: null,
    output: null,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const separator = argument.indexOf("=");
    const flag = separator === -1 ? argument : argument.slice(0, separator);
    const inline = separator === -1 ? undefined : argument.slice(separator + 1);
    const value = () => {
      if (inline !== undefined) {
        return inline;
      }
      index += 1;
      if (index >= argv.length) {
        throw new Error(`${flag} requires a value`);
      }
      return argv[index];
    };

    switch (flag) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "--manifest":
        options.manifest = path.resolve(value());
        break;
      case "--catalog":
        options.catalog = path.resolve(value());
        break;
      case "--iterations":
        options.iterations = parseInteger(value(), "iterations", 1);
        break;
      case "--warmup":
        options.warmup = parseInteger(value(), "warmup", 0);
        break;
      case "--sequence":
        options.sequence = value();
        break;
      case "--category":
        options.category = value();
        break;
      case "--output":
        options.output = path.resolve(value());
        break;
      case "--json":
        options.json = true;
        break;
      default:
        throw new Error(`unknown option: ${argument}`);
    }
  }

  return options;
}

function editSizes(edit) {
  return {
    oldBytes: typeof edit.old === "string" ? Buffer.byteLength(edit.old) : null,
    newBytes: typeof edit.new === "string" ? Buffer.byteLength(edit.new) : null,
  };
}

function replaySequence(sequence, parser, record, stepSamples) {
  let source = sequence.fixture.source;
  let tree = parser.parse(source);
  assertExpectedParse(tree, sequence.fixture);

  const measuredSteps = [];
  for (let index = 0; index < sequence.edits.length; index += 1) {
    const edit = sequence.edits[index];
    const started = process.hrtime.bigint();
    const updated = buildEdit(source, tree, edit, sequence.id, index + 1);
    tree = parser.parse(updated, tree);
    const elapsedMs = round(
      Number(process.hrtime.bigint() - started) / 1_000_000,
    );

    const fresh = parser.parse(updated);
    const incrementalTree = tree.rootNode.toString();
    const freshTree = fresh.rootNode.toString();
    if (incrementalTree !== freshTree) {
      throw new Error(
        `${sequence.id} step ${index + 1}: incremental tree differs from a fresh parse`,
      );
    }

    source = updated;
    if (record) {
      stepSamples[index].push(elapsedMs);
      measuredSteps.push(elapsedMs);
    }
  }

  assertExpectedParse(tree, sequence.fixture);
  return {
    finalBytes: Buffer.byteLength(source),
    finalRootChildCount: tree.rootNode.childCount,
    totalMs: measuredSteps.reduce((sum, value) => sum + value, 0),
  };
}

function measureSequences(sequences, iterations, warmup) {
  const parser = createParser();

  return sequences.map((sequence) => {
    for (let index = 0; index < warmup; index += 1) {
      replaySequence(sequence, parser, false, []);
    }

    const stepSamples = sequence.edits.map(() => []);
    const totals = [];
    let checksum = 0;
    let finalBytes = 0;
    for (let index = 0; index < iterations; index += 1) {
      const replay = replaySequence(sequence, parser, true, stepSamples);
      totals.push(round(replay.totalMs));
      checksum += replay.finalRootChildCount;
      finalBytes = replay.finalBytes;
    }

    return {
      id: sequence.id,
      description: sequence.description || null,
      fixture: sequence.fixture.id,
      fixturePath: sequence.fixture.path,
      initialBytes: sequence.fixture.bytes,
      finalBytes,
      categories: sequence.categories,
      editCount: sequence.edits.length,
      freshComparisons: iterations * sequence.edits.length,
      rootChildChecksum: checksum,
      steps: sequence.edits.map((edit, index) => ({
        index: index + 1,
        ...editSizes(edit),
        samplesMs: stepSamples[index],
        stats: summarize(stepSamples[index]),
      })),
      stats: summarize(totals),
    };
  });
}

function buildReport(options, fixtures, sequences, results) {
  return {
    mode: "incremental",
    generatedAt: new Date().toISOString(),
    environment: environment(),
    config: {
      manifest: path.relative(ROOT, options.manifest),
      catalog: path.relative(ROOT, options.catalog),
      iterations: options.iterations,
      warmup: options.warmup,
      sequenceFilter: options.sequence,
      categoryFilter: options.category,
      fixtureCount: fixtures.length,
      sequenceCount: sequences.length,
    },
    sequences: results,
  };
}

function printSummary(report) {
  const { node, treeSitterRuntime, platform, arch, cpuCount } =
    report.environment;
  console.log(
    `incremental parse latency: ${report.config.sequenceCount} sequences, ` +
      `${report.config.iterations} measured replays, ${report.config.warmup} warmup replays`,
  );
  console.log(
    `environment: Node ${node}, tree-sitter ${treeSitterRuntime}, ` +
      `${platform}/${arch}, ${cpuCount} logical CPUs`,
  );
  console.log(
    formatStatsRow([
      "sequence",
      "edits",
      "p50(ms)",
      "p95(ms)",
      "p99(ms)",
      "mean(ms)",
      "max(ms)",
    ]),
  );
  for (const result of report.sequences) {
    console.log(
      formatStatsRow([
        result.id,
        result.editCount,
        result.stats.p50Ms,
        result.stats.p95Ms,
        result.stats.p99Ms,
        result.stats.meanMs,
        result.stats.maxMs,
      ]),
    );
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const fixtures = loadBenchmarkFixtures(options.manifest, null);
  const sequences = loadIncrementalCatalog(
    options.catalog,
    fixtures,
    options.sequence,
    options.category,
  );
  const results = measureSequences(
    sequences,
    options.iterations,
    options.warmup,
  );
  const report = buildReport(options, fixtures, sequences, results);
  writeReport({ ...options, printSummary }, report);
}

try {
  main();
} catch (error) {
  console.error(`incremental benchmark failed: ${error.message}`);
  process.exitCode = 1;
}
