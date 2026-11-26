"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const Parser = require("tree-sitter");
const Language = require("../bindings/node");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_MANIFEST = path.join(ROOT, "benchmarks/fixtures/manifest.json");
const DEFAULT_CATALOG = path.join(
  ROOT,
  "test/fixtures/incremental_sequences.json",
);

function parseInteger(raw, label, minimum) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${label} must be an integer >= ${minimum}, got ${raw}`);
  }
  return value;
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

function createParser() {
  const parser = new Parser();
  parser.setLanguage(Language);
  return parser;
}

function assertExpectedParse(tree, fixture) {
  const hasError = tree.rootNode.hasError;
  if (fixture.expectedClean && hasError) {
    throw new Error(
      `${fixture.id} was expected to parse cleanly but has an ERROR node`,
    );
  }
  if (!fixture.expectedClean && !hasError) {
    throw new Error(
      `${fixture.id} was expected to exercise errors but parsed cleanly`,
    );
  }
}

function loadBenchmarkFixtures(manifestPath, filter) {
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

function matches(text, needle) {
  const positions = [];
  let start = 0;
  while (true) {
    const position = text.indexOf(needle, start);
    if (position < 0) {
      return positions;
    }
    positions.push(position);
    start = position + 1;
  }
}

function pointAt(source, index) {
  const lines = source.slice(0, index).split("\n");
  return { row: lines.length - 1, column: Buffer.byteLength(lines.at(-1)) };
}

function buildEdit(source, tree, edit, sequenceId, step) {
  if (edit.op !== "replace") {
    throw new Error(`${sequenceId} step ${step}: unsupported op ${edit.op}`);
  }
  if (typeof edit.old !== "string" || edit.old.length === 0) {
    throw new Error(
      `${sequenceId} step ${step}: old must be a non-empty string`,
    );
  }
  if (typeof edit.new !== "string") {
    throw new Error(`${sequenceId} step ${step}: new must be a string`);
  }
  const occurrence = edit.occurrence === undefined ? 0 : edit.occurrence;
  if (!Number.isInteger(occurrence) || occurrence < 0) {
    throw new Error(
      `${sequenceId} step ${step}: occurrence must be a non-negative integer`,
    );
  }

  const positions = matches(source, edit.old);
  if (occurrence >= positions.length) {
    throw new Error(
      `${sequenceId} step ${step}: occurrence ${occurrence} missing; ${positions.length} matches`,
    );
  }

  const charIndex = positions[occurrence];
  const startIndex = Buffer.byteLength(source.slice(0, charIndex));
  const oldCharEnd = charIndex + edit.old.length;
  const oldEndIndex = startIndex + Buffer.byteLength(edit.old);
  const updated =
    source.slice(0, charIndex) + edit.new + source.slice(oldCharEnd);
  const newCharEnd = charIndex + edit.new.length;
  const newEndIndex = startIndex + Buffer.byteLength(edit.new);
  tree.edit({
    startIndex,
    oldEndIndex,
    newEndIndex,
    startPosition: pointAt(source, charIndex),
    oldEndPosition: pointAt(source, oldCharEnd),
    newEndPosition: pointAt(updated, newCharEnd),
  });
  return updated;
}

function loadIncrementalCatalog(
  catalogPath,
  benchmarkFixtures,
  sequenceFilter,
  categoryFilter,
) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  if (catalog.version !== 1) {
    throw new Error("unsupported incremental catalog version");
  }
  if (!catalog.fixtures || typeof catalog.fixtures !== "object") {
    throw new Error("incremental catalog has no fixture map");
  }
  if (!Array.isArray(catalog.sequences) || catalog.sequences.length === 0) {
    throw new Error("incremental catalog has no sequences");
  }

  const benchmarkByPath = new Map(
    benchmarkFixtures.map((fixture) => [fixture.path, fixture]),
  );
  const catalogFixtures = new Map();
  for (const [name, relativePath] of Object.entries(catalog.fixtures)) {
    const absolutePath = path.resolve(ROOT, relativePath);
    const normalized = path.relative(ROOT, absolutePath);
    const fixture = benchmarkByPath.get(normalized);
    if (!fixture) {
      throw new Error(
        `incremental fixture ${name} is not in the benchmark manifest: ${relativePath}`,
      );
    }
    catalogFixtures.set(name, fixture);
  }

  const seen = new Set();
  const sequences = [];
  for (const sequence of catalog.sequences) {
    if (typeof sequence.id !== "string" || sequence.id.length === 0) {
      throw new Error("incremental catalog entry has no id");
    }
    if (seen.has(sequence.id)) {
      throw new Error(`duplicate sequence id: ${sequence.id}`);
    }
    seen.add(sequence.id);
    if (!catalogFixtures.has(sequence.fixture)) {
      throw new Error(`${sequence.id}: unknown fixture ${sequence.fixture}`);
    }
    if (!Array.isArray(sequence.edits) || sequence.edits.length === 0) {
      throw new Error(`${sequence.id}: no edits`);
    }
    if (sequenceFilter && sequence.id !== sequenceFilter) {
      continue;
    }
    if (
      categoryFilter &&
      !(sequence.categories || []).includes(categoryFilter)
    ) {
      continue;
    }
    sequences.push({
      id: sequence.id,
      fixtureName: sequence.fixture,
      fixture: catalogFixtures.get(sequence.fixture),
      categories: sequence.categories || [],
      edits: sequence.edits,
    });
  }

  if (sequences.length === 0) {
    throw new Error("no incremental sequences matched the filters");
  }
  return sequences;
}

function writeReport(options, report) {
  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) {
      console.log(`wrote: ${path.relative(ROOT, options.output)}`);
    }
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (options.printSummary) {
    options.printSummary(report);
  }
}

function formatStatsRow(values) {
  const number = (value) =>
    typeof value === "number" ? value.toFixed(6) : String(value);
  return [
    String(values[0]).padEnd(22),
    String(values[1]).padStart(8),
    number(values[2]).padStart(10),
    number(values[3]).padStart(10),
    number(values[4]).padStart(10),
    number(values[5]).padStart(11),
    number(values[6]).padStart(10),
  ].join(" ");
}

const STATS_HEADER = formatStatsRow([
  "fixture",
  "bytes",
  "p50(ms)",
  "p95(ms)",
  "p99(ms)",
  "mean(ms)",
  "max(ms)",
]);

module.exports = {
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
  STATS_HEADER,
};
