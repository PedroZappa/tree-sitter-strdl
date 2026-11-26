#!/usr/bin/env node
"use strict";

const path = require("node:path");

const {
  ROOT,
  DEFAULT_MANIFEST,
  DEFAULT_CATALOG,
  parseInteger,
  round,
  environment,
  createParser,
  assertExpectedParse,
  loadBenchmarkFixtures,
  loadIncrementalCatalog,
  buildEdit,
  writeReport,
} = require("./bench_common");

function usage() {
  return [
    "Usage: node --expose-gc scripts/bench_memory.js [options]",
    "",
    "Measures retained parse-tree memory using the Node.js binding.",
    "",
    "Options:",
    "  --manifest PATH   Fixture manifest (default: benchmarks/fixtures/manifest.json)",
    "  --catalog PATH    Edit catalog (default: test/fixtures/incremental_sequences.json)",
    "  --mode NAME       fresh, incremental, or all (default: all)",
    "  --iterations N    Retained parses per case, at least 1 (default: 15)",
    "  --warmup N        Unretained parses per case, at least 0 (default: 2)",
    "  --fixture ID      Measure only one fresh fixture id",
    "  --sequence ID     Measure only one incremental sequence id",
    "  --category NAME   Measure only incremental sequences with this category",
    "  --output PATH     Write the full JSON report to PATH",
    "  --json            Print the full JSON report to stdout",
    "  -h, --help        Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    catalog: DEFAULT_CATALOG,
    mode: "all",
    iterations: 15,
    warmup: 2,
    fixture: null,
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
      case "--mode":
        options.mode = value();
        break;
      case "--iterations":
        options.iterations = parseInteger(value(), "iterations", 1);
        break;
      case "--warmup":
        options.warmup = parseInteger(value(), "warmup", 0);
        break;
      case "--fixture":
        options.fixture = value();
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

  if (!["fresh", "incremental", "all"].includes(options.mode)) {
    throw new Error(
      `mode must be fresh, incremental, or all, got ${options.mode}`,
    );
  }
  return options;
}

function requireGc() {
  if (typeof global.gc !== "function") {
    throw new Error(
      "memory benchmark requires --expose-gc (use make bench-memory)",
    );
  }
}

function forceGc() {
  global.gc();
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return {
    heapUsedBytes: usage.heapUsed,
    heapTotalBytes: usage.heapTotal,
    externalBytes: usage.external,
    arrayBuffersBytes: usage.arrayBuffers,
    rssBytes: usage.rss,
  };
}

function snapshotDelta(before, after) {
  return {
    heapUsedBytes: after.heapUsedBytes - before.heapUsedBytes,
    heapTotalBytes: after.heapTotalBytes - before.heapTotalBytes,
    externalBytes: after.externalBytes - before.externalBytes,
    arrayBuffersBytes: after.arrayBuffersBytes - before.arrayBuffersBytes,
    rssBytes: after.rssBytes - before.rssBytes,
  };
}

function updatePeak(peak, snapshot, baseline) {
  peak.heapDeltaBytes = Math.max(
    peak.heapDeltaBytes,
    snapshot.heapUsedBytes - baseline.heapUsedBytes,
  );
  peak.rssDeltaBytes = Math.max(
    peak.rssDeltaBytes,
    snapshot.rssBytes - baseline.rssBytes,
  );
}

function memoryResult(fields, baseline, after, treeCount, peak) {
  const retained = snapshotDelta(baseline, after);
  return {
    ...fields,
    retainedTrees: treeCount,
    retained: {
      ...retained,
      heapUsedBytesPerTree: round(retained.heapUsedBytes / treeCount),
      rssBytesPerTree: round(retained.rssBytes / treeCount),
    },
    sampledPeak: peak,
  };
}

function measureFresh(fixture, iterations, warmup, parser) {
  forceGc();
  for (let index = 0; index < warmup; index += 1) {
    assertExpectedParse(parser.parse(fixture.source), fixture);
  }

  forceGc();
  const baseline = memorySnapshot();
  const peak = { heapDeltaBytes: 0, rssDeltaBytes: 0 };
  const retained = [];
  let checksum = 0;
  for (let index = 0; index < iterations; index += 1) {
    const tree = parser.parse(fixture.source);
    assertExpectedParse(tree, fixture);
    retained.push(tree);
    checksum += tree.rootNode.childCount;
    updatePeak(peak, memorySnapshot(), baseline);
  }

  forceGc();
  const after = memorySnapshot();
  return memoryResult(
    {
      mode: "fresh",
      id: fixture.id,
      kind: fixture.kind,
      role: fixture.role,
      path: fixture.path,
      bytes: fixture.bytes,
      expectedClean: fixture.expectedClean,
      iterations,
      rootChildChecksum: checksum,
    },
    baseline,
    after,
    retained.length,
    peak,
  );
}

function replayIncremental(sequence, parser, retained) {
  let source = sequence.fixture.source;
  let tree = parser.parse(source);
  assertExpectedParse(tree, sequence.fixture);
  if (retained) {
    retained.push(tree);
  }
  let checksum = tree.rootNode.childCount;

  for (let index = 0; index < sequence.edits.length; index += 1) {
    const updated = buildEdit(
      source,
      tree,
      sequence.edits[index],
      sequence.id,
      index + 1,
    );
    tree = parser.parse(updated, tree);
    const fresh = parser.parse(updated);
    if (tree.rootNode.toString() !== fresh.rootNode.toString()) {
      throw new Error(
        `${sequence.id} step ${index + 1}: incremental tree differs from a fresh parse`,
      );
    }
    source = updated;
    if (retained) {
      retained.push(tree);
    }
    checksum += tree.rootNode.childCount;
  }

  assertExpectedParse(tree, sequence.fixture);
  return {
    finalBytes: Buffer.byteLength(source),
    rootChildChecksum: checksum,
  };
}

function measureIncremental(sequence, iterations, warmup, parser) {
  forceGc();
  for (let index = 0; index < warmup; index += 1) {
    replayIncremental(sequence, parser, null);
  }

  forceGc();
  const baseline = memorySnapshot();
  const peak = { heapDeltaBytes: 0, rssDeltaBytes: 0 };
  const retained = [];
  let checksum = 0;
  let finalBytes = 0;
  for (let index = 0; index < iterations; index += 1) {
    const replay = replayIncremental(sequence, parser, retained);
    checksum += replay.rootChildChecksum;
    finalBytes = replay.finalBytes;
    updatePeak(peak, memorySnapshot(), baseline);
  }

  forceGc();
  const after = memorySnapshot();
  return memoryResult(
    {
      mode: "incremental",
      id: sequence.id,
      description: sequence.description || null,
      fixture: sequence.fixture.id,
      fixturePath: sequence.fixture.path,
      initialBytes: sequence.fixture.bytes,
      finalBytes,
      categories: sequence.categories,
      editCount: sequence.edits.length,
      treesPerReplay: 1 + sequence.edits.length,
      iterations,
      freshComparisons: iterations * sequence.edits.length,
      rootChildChecksum: checksum,
    },
    baseline,
    after,
    retained.length,
    peak,
  );
}

function buildReport(
  options,
  fixtures,
  sequences,
  freshResults,
  incrementalResults,
) {
  return {
    mode: "memory",
    generatedAt: new Date().toISOString(),
    environment: {
      ...environment(),
      gcAvailable: true,
      nodeFlags: process.execArgv,
    },
    config: {
      manifest: path.relative(ROOT, options.manifest),
      catalog: path.relative(ROOT, options.catalog),
      mode: options.mode,
      iterations: options.iterations,
      warmup: options.warmup,
      fixtureFilter: options.fixture,
      sequenceFilter: options.sequence,
      categoryFilter: options.category,
      fixtureCount: fixtures.length,
      sequenceCount: sequences.length,
    },
    fresh: freshResults,
    incremental: incrementalResults,
  };
}

function integer(value) {
  return Number.isFinite(value) ? Math.round(value).toString() : String(value);
}

function formatRow(values) {
  return [
    String(values[0]).padEnd(22),
    String(values[1]).padStart(8),
    integer(values[2]).padStart(13),
    integer(values[3]).padStart(13),
    integer(values[4]).padStart(13),
    integer(values[5]).padStart(13),
  ].join(" ");
}

const MEMORY_HEADER = formatRow([
  "case",
  "count",
  "heap/tree(B)",
  "rss/tree(B)",
  "peakHeap(B)",
  "peakRss(B)",
]);

function printSummary(report) {
  const { node, treeSitterRuntime, platform, arch, cpuCount } =
    report.environment;
  console.log(
    `memory consumption: ${report.config.fixtureCount} fixtures, ` +
      `${report.config.sequenceCount} sequences, ${report.config.iterations} iterations, ` +
      `${report.config.warmup} warmup; GC forced`,
  );
  console.log(
    `environment: Node ${node}, tree-sitter ${treeSitterRuntime}, ` +
      `${platform}/${arch}, ${cpuCount} logical CPUs`,
  );
  if (report.fresh.length > 0) {
    console.log("fresh parse trees:");
    console.log(MEMORY_HEADER);
    for (const result of report.fresh) {
      console.log(
        formatRow([
          result.id,
          result.bytes,
          result.retained.heapUsedBytesPerTree,
          result.retained.rssBytesPerTree,
          result.sampledPeak.heapDeltaBytes,
          result.sampledPeak.rssDeltaBytes,
        ]),
      );
    }
  }
  if (report.incremental.length > 0) {
    console.log("incremental replay trees:");
    console.log(MEMORY_HEADER);
    for (const result of report.incremental) {
      console.log(
        formatRow([
          result.id,
          result.editCount,
          result.retained.heapUsedBytesPerTree,
          result.retained.rssBytesPerTree,
          result.sampledPeak.heapDeltaBytes,
          result.sampledPeak.rssDeltaBytes,
        ]),
      );
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  requireGc();

  const parser = createParser();
  const includeFresh = options.mode === "all" || options.mode === "fresh";
  const includeIncremental =
    options.mode === "all" || options.mode === "incremental";

  let freshFixtures = [];
  let fixtures = [];
  let sequences = [];
  let freshResults = [];
  let incrementalResults = [];

  if (includeFresh) {
    freshFixtures = loadBenchmarkFixtures(options.manifest, options.fixture);
    fixtures = freshFixtures;
    freshResults = freshFixtures.map((fixture) =>
      measureFresh(fixture, options.iterations, options.warmup, parser),
    );
  }

  if (includeIncremental) {
    fixtures = loadBenchmarkFixtures(options.manifest, null);
    sequences = loadIncrementalCatalog(
      options.catalog,
      fixtures,
      options.sequence,
      options.category,
    );
    incrementalResults = sequences.map((sequence) =>
      measureIncremental(sequence, options.iterations, options.warmup, parser),
    );
  }

  const report = buildReport(
    options,
    fixtures,
    sequences,
    freshResults,
    incrementalResults,
  );
  writeReport({ ...options, printSummary }, report);
}

try {
  main();
} catch (error) {
  console.error(`memory benchmark failed: ${error.message}`);
  process.exitCode = 1;
}
