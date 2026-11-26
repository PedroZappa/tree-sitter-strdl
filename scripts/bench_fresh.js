#!/usr/bin/env node
"use strict";

const path = require("node:path");

const {
  ROOT,
  DEFAULT_MANIFEST,
  parseInteger,
  round,
  summarize,
  environment,
  createParser,
  assertExpectedParse,
  loadBenchmarkFixtures,
  writeReport,
  formatStatsRow,
  STATS_HEADER,
} = require("./bench_common");

function usage() {
  return [
    "Usage: node scripts/bench_fresh.js [options]",
    "",
    "Measures fresh parse latency for benchmark fixtures using the Node.js binding.",
    "",
    "Options:",
    "  --manifest PATH   Fixture manifest (default: benchmarks/fixtures/manifest.json)",
    "  --iterations N    Measured parses per fixture, at least 1 (default: 15)",
    "  --warmup N        Unmeasured parses per fixture, at least 0 (default: 2)",
    "  --fixture ID      Benchmark only one fixture id",
    "  --output PATH     Write the full JSON report to PATH",
    "  --json            Print the full JSON report to stdout",
    "  -h, --help        Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    iterations: 15,
    warmup: 2,
    fixture: null,
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
      case "--iterations":
        options.iterations = parseInteger(value(), "iterations", 1);
        break;
      case "--warmup":
        options.warmup = parseInteger(value(), "warmup", 0);
        break;
      case "--fixture":
        options.fixture = value();
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

function measureFixtures(fixtures, iterations, warmup) {
  const parser = createParser();

  return fixtures.map((fixture) => {
    for (let index = 0; index < warmup; index += 1) {
      const tree = parser.parse(fixture.source);
      assertExpectedParse(tree, fixture);
    }

    const samplesMs = [];
    let consumed = 0;
    for (let index = 0; index < iterations; index += 1) {
      const started = process.hrtime.bigint();
      const tree = parser.parse(fixture.source);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      samplesMs.push(round(elapsedMs));
      consumed += tree.rootNode.childCount;
      assertExpectedParse(tree, fixture);
    }

    return {
      id: fixture.id,
      kind: fixture.kind,
      role: fixture.role,
      path: fixture.path,
      bytes: fixture.bytes,
      expectedClean: fixture.expectedClean,
      rootChildChecksum: consumed,
      samplesMs,
      stats: summarize(samplesMs),
    };
  });
}

function buildReport(options, fixtures, results) {
  return {
    mode: "fresh",
    generatedAt: new Date().toISOString(),
    environment: environment(),
    config: {
      manifest: path.relative(ROOT, options.manifest),
      iterations: options.iterations,
      warmup: options.warmup,
      fixtureFilter: options.fixture,
      fixtureCount: fixtures.length,
    },
    fixtures: results,
  };
}

function printSummary(report) {
  const { node, treeSitterRuntime, platform, arch, cpuCount } = report.environment;
  console.log(
    `fresh parse latency: ${report.config.fixtureCount} fixtures, ` +
      `${report.config.iterations} measured parses, ${report.config.warmup} warmup parses`,
  );
  console.log(
    `environment: Node ${node}, tree-sitter ${treeSitterRuntime}, ` +
      `${platform}/${arch}, ${cpuCount} logical CPUs`,
  );
  console.log(STATS_HEADER);
  for (const result of report.fixtures) {
    console.log(
      formatStatsRow([
        result.id,
        result.bytes,
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

  const fixtures = loadBenchmarkFixtures(options.manifest, options.fixture);
  const results = measureFixtures(fixtures, options.iterations, options.warmup);
  const report = buildReport(options, fixtures, results);
  writeReport({ ...options, printSummary }, report);
}

try {
  main();
} catch (error) {
  console.error(`fresh benchmark failed: ${error.message}`);
  process.exitCode = 1;
}
