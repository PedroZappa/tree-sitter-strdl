#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const Parser = require("tree-sitter");
const Language = require("../bindings/node");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MANIFEST = path.join(ROOT, "benchmarks/fixtures/manifest.json");

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

function parseInteger(raw, label, minimum) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${label} must be an integer >= ${minimum}, got ${raw}`);
  }
  return value;
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

function loadFixtures(manifestPath, filter) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1) {
    throw new Error("unsupported benchmark manifest version");
  }
  if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) {
    throw new Error("benchmark manifest has no fixtures");
  }

  const seen = new Set();
  const fixtures = [];
  for (const entry of manifest.fixtures) {
    if (!entry || typeof entry !== "object") {
      throw new Error("benchmark manifest contains a non-object fixture");
    }
    if (typeof entry.id !== "string" || entry.id.length === 0) {
      throw new Error("benchmark manifest entry has no id");
    }
    if (seen.has(entry.id)) {
      throw new Error(`duplicate fixture id: ${entry.id}`);
    }
    seen.add(entry.id);
    if (filter && entry.id !== filter) {
      continue;
    }
    if (typeof entry.path !== "string" || entry.path.length === 0) {
      throw new Error(`${entry.id} has no path`);
    }
    if (typeof entry.expected_clean !== "boolean") {
      throw new Error(`${entry.id} has no expected_clean value`);
    }

    const absolutePath = path.resolve(ROOT, entry.path);
    const relativeToRoot = path.relative(ROOT, absolutePath);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      throw new Error(`${entry.id} path escapes the repository: ${entry.path}`);
    }

    const data = fs.readFileSync(absolutePath);
    if (data.length !== entry.bytes) {
      throw new Error(
        `${entry.id} size is ${data.length}, manifest says ${entry.bytes}`,
      );
    }
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    if (hash !== entry.sha256) {
      throw new Error(`${entry.id} SHA-256 does not match the manifest`);
    }

    fixtures.push({
      id: entry.id,
      kind: entry.kind,
      role: entry.role,
      path: relativeToRoot,
      bytes: data.length,
      expectedClean: entry.expected_clean,
      source: data.toString("utf8"),
    });
  }

  if (fixtures.length === 0) {
    throw new Error(`no benchmark fixture matched id ${filter}`);
  }
  return fixtures;
}

function assertExpectedParse(tree, fixture) {
  const hasError = tree.rootNode.hasError;
  if (fixture.expectedClean && hasError) {
    throw new Error(`${fixture.id} was expected to parse cleanly but has an ERROR node`);
  }
  if (!fixture.expectedClean && !hasError) {
    throw new Error(`${fixture.id} was expected to exercise errors but parsed cleanly`);
  }
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const percentile = (fraction) => {
    const rank = (sorted.length - 1) * fraction;
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    const weight = rank - lower;
    return round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
  };

  return {
    iterations: samples.length,
    minMs: round(sorted[0]),
    meanMs: round(total / samples.length),
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    maxMs: round(sorted.at(-1)),
  };
}

function environment() {
  const processors = os.cpus();
  return {
    node: process.version,
    treeSitterRuntime: require("tree-sitter/package.json").version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: processors.length > 0 ? processors[0].model : null,
    cpuCount: processors.length,
    totalMemoryBytes: os.totalmem(),
  };
}

function measureFixtures(fixtures, iterations, warmup) {
  const parser = new Parser();
  parser.setLanguage(Language);

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
  console.log(
    [
      "fixture".padEnd(22),
      "bytes".padStart(8),
      "p50(ms)".padStart(10),
      "p95(ms)".padStart(10),
      "p99(ms)".padStart(10),
      "mean(ms)".padStart(11),
      "max(ms)".padStart(10),
    ].join(" "),
  );
  for (const result of report.fixtures) {
    console.log(
      [
        result.id.padEnd(22),
        String(result.bytes).padStart(8),
        result.stats.p50Ms.toFixed(6).padStart(10),
        result.stats.p95Ms.toFixed(6).padStart(10),
        result.stats.p99Ms.toFixed(6).padStart(10),
        result.stats.meanMs.toFixed(6).padStart(11),
        result.stats.maxMs.toFixed(6).padStart(10),
      ].join(" "),
    );
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const fixtures = loadFixtures(options.manifest, options.fixture);
  const results = measureFixtures(fixtures, options.iterations, options.warmup);
  const report = buildReport(options, fixtures, results);

  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) {
      console.log(`wrote: ${path.relative(ROOT, options.output)}`);
    }
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printSummary(report);
  }
}

try {
  main();
} catch (error) {
  console.error(`fresh benchmark failed: ${error.message}`);
  process.exitCode = 1;
}
