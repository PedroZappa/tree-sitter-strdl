#!/usr/bin/env node
"use strict";

const assertStrict = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const {
  ROOT,
  DEFAULT_MANIFEST,
  DEFAULT_CATALOG,
  round,
  summarize,
  loadBenchmarkFixtures,
  loadIncrementalCatalog,
} = require("./bench_common");

const BASELINE_VERSION = 1;
const COMPARISON_VERSION = 1;
const LATENCY_METRICS = ["meanMs", "p50Ms", "p95Ms", "p99Ms"];
const RETAINED_MEMORY_METRICS = ["heapUsedBytesPerTree", "rssBytesPerTree"];
const PEAK_MEMORY_METRICS = ["heapDeltaBytes", "rssDeltaBytes"];
const DEFAULT_BASELINE = path.join(ROOT, "benchmarks/results/baseline.json");
const DEFAULT_MANIFEST_PATH = path.relative(ROOT, DEFAULT_MANIFEST);
const DEFAULT_CATALOG_PATH = path.relative(ROOT, DEFAULT_CATALOG);

function usage() {
  return [
    "Usage: node scripts/baseline_results.js <build|check|compare> [options]",
    "",
    "Build, validate, or compare the committed performance baseline.",
    "",
    "Build options:",
    "  --fresh PATH        Fresh latency JSON report",
    "  --incremental PATH  Incremental latency JSON report",
    "  --memory PATH       Memory JSON report",
    "  --output PATH       Baseline path (default: benchmarks/results/baseline.json)",
    "  --commit HASH       Repository commit to record (default: git rev-parse --short HEAD)",
    "",
    "Check options:",
    "  --baseline PATH     Baseline to validate (default: benchmarks/results/baseline.json)",
    "",
    "Compare options:",
    "  --fresh PATH        Fresh latency JSON report",
    "  --incremental PATH  Incremental latency JSON report",
    "  --memory PATH       Memory JSON report",
    "  --baseline PATH     Baseline to compare (default: benchmarks/results/baseline.json)",
    "  --output PATH       Optional comparison JSON path; stdout when omitted",
    "",
    "  -h, --help          Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { help: true };
  }

  const command = argv[0];
  if (!["build", "check", "compare"].includes(command)) {
    throw new Error(`unknown command: ${command}`);
  }

  const options =
    command === "build"
      ? {
          command,
          fresh: null,
          incremental: null,
          memory: null,
          output: DEFAULT_BASELINE,
          commit: null,
        }
      : command === "compare"
        ? {
            command,
            fresh: null,
            incremental: null,
            memory: null,
            baseline: DEFAULT_BASELINE,
            output: null,
          }
        : { command, baseline: DEFAULT_BASELINE };

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      options.help = true;
      continue;
    }

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
      case "--fresh":
        if (command === "check") throw new Error(`--fresh is invalid for ${command}`);
        options.fresh = path.resolve(value());
        break;
      case "--incremental":
        if (command === "check") {
          throw new Error(`--incremental is invalid for ${command}`);
        }
        options.incremental = path.resolve(value());
        break;
      case "--memory":
        if (command === "check") throw new Error(`--memory is invalid for ${command}`);
        options.memory = path.resolve(value());
        break;
      case "--output":
        if (command === "check") throw new Error(`--output is invalid for ${command}`);
        options.output = path.resolve(value());
        break;
      case "--commit":
        if (command !== "build") throw new Error(`--commit is invalid for ${command}`);
        options.commit = value();
        break;
      case "--baseline":
        if (command === "build") throw new Error(`--baseline is invalid for ${command}`);
        options.baseline = path.resolve(value());
        break;
      default:
        throw new Error(`unknown option: ${argument}`);
    }
  }

  if (options.help) {
    return options;
  }
  if (command === "build" || command === "compare") {
    for (const field of ["fresh", "incremental", "memory"]) {
      if (!options[field]) {
        throw new Error(`${command} requires --${field}`);
      }
    }
  }
  return options;
}

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function object(value, label) {
  check(value !== null && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value;
}

function array(value, label) {
  check(Array.isArray(value), `${label} must be an array`);
  return value;
}

function text(value, label) {
  check(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  return value;
}

function finiteNumber(value, label) {
  check(typeof value === "number" && Number.isFinite(value), `${label} must be a finite number`);
  return value;
}

function integer(value, label, minimum) {
  check(Number.isInteger(value) && value >= minimum, `${label} must be an integer >= ${minimum}`);
  return value;
}

function isoDate(value, label) {
  text(value, label);
  check(value === new Date(value).toISOString(), `${label} must be an ISO UTC timestamp`);
  return value;
}

function deepEqual(actual, expected, label) {
  try {
    assertStrict.deepStrictEqual(actual, expected);
  } catch {
    throw new Error(`${label} does not match expected value`);
  }
}

function relative(filePath) {
  const absolute = path.resolve(filePath);
  const relativePath = path.relative(ROOT, absolute);
  return relativePath.startsWith("..") ? absolute : relativePath;
}

function readJson(filePath, label) {
  const absolute = path.resolve(filePath);
  let content;
  try {
    content = fs.readFileSync(absolute, "utf8");
  } catch (error) {
    throw new Error(`cannot read ${label} report ${filePath}: ${error.message}`);
  }
  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error(`${label} report ${filePath} is not valid JSON: ${error.message}`);
  }
  return { absolute, content, data };
}

function validateStats(stats, label) {
  object(stats, label);
  integer(stats.iterations, `${label}.iterations`, 1);
  for (const field of ["minMs", "meanMs", "p50Ms", "p95Ms", "p99Ms", "maxMs"]) {
    finiteNumber(stats[field], `${label}.${field}`);
  }
  check(
    stats.minMs <= stats.p50Ms &&
      stats.p50Ms <= stats.p95Ms &&
      stats.p95Ms <= stats.p99Ms &&
      stats.p99Ms <= stats.maxMs,
    `${label} percentiles are not ordered`,
  );
  check(
    stats.meanMs >= stats.minMs && stats.meanMs <= stats.maxMs,
    `${label}.meanMs is outside the sample range`,
  );
}

function validateSamples(samples, stats, label) {
  array(samples, `${label}.samplesMs`);
  check(samples.length === stats.iterations, `${label}.samplesMs length does not match stats`);
  for (let index = 0; index < samples.length; index += 1) {
    finiteNumber(samples[index], `${label}.samplesMs[${index}]`);
    check(samples[index] >= 0, `${label}.samplesMs[${index}] is negative`);
  }
  deepEqual(summarize(samples), stats, `${label}.stats`);
}

function validateEnvironment(environment, label, options = {}) {
  object(environment, label);
  text(environment.node, `${label}.node`);
  text(environment.treeSitterRuntime, `${label}.treeSitterRuntime`);
  text(environment.platform, `${label}.platform`);
  text(environment.arch, `${label}.arch`);
  check(
    typeof environment.cpuModel === "string" || environment.cpuModel === null,
    `${label}.cpuModel must be a string or null`,
  );
  integer(environment.cpuCount, `${label}.cpuCount`, 1);
  finiteNumber(environment.totalMemoryBytes, `${label}.totalMemoryBytes`);
  check(environment.totalMemoryBytes > 0, `${label}.totalMemoryBytes must be positive`);
  if (options.requireGc) {
    check(environment.gcAvailable === true, `${label}.gcAvailable must be true`);
    const flags = array(environment.nodeFlags, `${label}.nodeFlags`);
    check(flags.includes("--expose-gc"), `${label}.nodeFlags must include --expose-gc`);
  }
}

function commonEnvironment(environment) {
  const { gcAvailable, nodeFlags, ...common } = environment;
  return common;
}

function validateReportConfig(config, label, kind) {
  object(config, label);
  text(config.manifest, `${label}.manifest`);
  integer(config.iterations, `${label}.iterations`, 1);
  integer(config.warmup, `${label}.warmup`, 0);
  if (kind === "fresh") {
    check(config.fixtureFilter === null, `${label}.fixtureFilter must be null`);
  }
  if (kind === "incremental") {
    text(config.catalog, `${label}.catalog`);
    check(config.sequenceFilter === null, `${label}.sequenceFilter must be null`);
    check(config.categoryFilter === null, `${label}.categoryFilter must be null`);
  }
  if (kind === "memory") {
    text(config.catalog, `${label}.catalog`);
    check(config.mode === "all", `${label}.mode must be all`);
    check(config.fixtureFilter === null, `${label}.fixtureFilter must be null`);
    check(config.sequenceFilter === null, `${label}.sequenceFilter must be null`);
    check(config.categoryFilter === null, `${label}.categoryFilter must be null`);
  }
}

function validateFreshResults(results, config, label, expectedFixtures) {
  array(results, label);
  integer(config.fixtureCount, `${label}.config.fixtureCount`, 1);
  check(results.length === config.fixtureCount, `${label} fixture count mismatch`);

  const expectedById = new Map(expectedFixtures.map((fixture) => [fixture.id, fixture]));
  const seen = new Set();
  for (let index = 0; index < results.length; index += 1) {
    const result = object(results[index], `${label}[${index}]`);
    text(result.id, `${label}[${index}].id`);
    check(!seen.has(result.id), `${label} duplicate fixture id ${result.id}`);
    seen.add(result.id);
    const expected = expectedById.get(result.id);
    check(expected, `${label} unknown fixture id ${result.id}`);
    text(result.kind, `${label}[${index}].kind`);
    text(result.role, `${label}[${index}].role`);
    text(result.path, `${label}[${index}].path`);
    check(result.path === expected.path, `${label} path mismatch for ${result.id}`);
    integer(result.bytes, `${label}[${index}].bytes`, 1);
    check(result.bytes === expected.bytes, `${label} byte count mismatch for ${result.id}`);
    check(
      result.expectedClean === expected.expectedClean,
      `${label} expected_clean mismatch for ${result.id}`,
    );
    integer(result.rootChildChecksum, `${label}[${index}].rootChildChecksum`, 0);
    validateStats(result.stats, `${label}[${index}].stats`);
    check(
      result.stats.iterations === config.iterations,
      `${label} iteration mismatch for ${result.id}`,
    );
    validateSamples(result.samplesMs, result.stats, `${label}[${index}]`);
  }
  check(seen.size === expectedById.size, `${label} does not cover the fixture manifest`);
}

function validateIncrementalResults(results, config, label, expectedSequences) {
  array(results, label);
  integer(config.sequenceCount, `${label}.config.sequenceCount`, 1);
  check(results.length === config.sequenceCount, `${label} sequence count mismatch`);

  const expectedById = new Map(expectedSequences.map((sequence) => [sequence.id, sequence]));
  const seen = new Set();
  for (let index = 0; index < results.length; index += 1) {
    const result = object(results[index], `${label}[${index}]`);
    text(result.id, `${label}[${index}].id`);
    check(!seen.has(result.id), `${label} duplicate sequence id ${result.id}`);
    seen.add(result.id);
    const expected = expectedById.get(result.id);
    check(expected, `${label} unknown sequence id ${result.id}`);
    check(
      result.description === null || typeof result.description === "string",
      `${label}[${index}].description must be a string or null`,
    );
    text(result.fixture, `${label}[${index}].fixture`);
    check(result.fixture === expected.fixture.id, `${label} fixture mismatch for ${result.id}`);
    text(result.fixturePath, `${label}[${index}].fixturePath`);
    check(
      result.fixturePath === expected.fixture.path,
      `${label} fixture path mismatch for ${result.id}`,
    );
    integer(result.initialBytes, `${label}[${index}].initialBytes`, 1);
    check(
      result.initialBytes === expected.fixture.bytes,
      `${label} initial byte count mismatch for ${result.id}`,
    );
    integer(result.finalBytes, `${label}[${index}].finalBytes`, 1);
    deepEqual(result.categories, expected.categories, `${label} categories for ${result.id}`);
    integer(result.editCount, `${label}[${index}].editCount`, 1);
    check(
      result.editCount === expected.edits.length,
      `${label} edit count mismatch for ${result.id}`,
    );
    check(
      result.freshComparisons === config.iterations * result.editCount,
      `${label} fresh comparison count mismatch for ${result.id}`,
    );
    integer(result.rootChildChecksum, `${label}[${index}].rootChildChecksum`, 0);
    validateStats(result.stats, `${label}[${index}].stats`);
    check(
      result.stats.iterations === config.iterations,
      `${label} iteration mismatch for ${result.id}`,
    );

    const steps = array(result.steps, `${label}[${index}].steps`);
    check(steps.length === result.editCount, `${label} step count mismatch for ${result.id}`);
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
      const step = object(steps[stepIndex], `${label}[${index}].steps[${stepIndex}]`);
      const edit = expected.edits[stepIndex];
      check(step.index === stepIndex + 1, `${label} step index mismatch for ${result.id}`);
      const expectedOld = typeof edit.old === "string" ? Buffer.byteLength(edit.old) : null;
      const expectedNew = typeof edit.new === "string" ? Buffer.byteLength(edit.new) : null;
      check(step.oldBytes === expectedOld, `${label} old-byte mismatch for ${result.id}`);
      check(step.newBytes === expectedNew, `${label} new-byte mismatch for ${result.id}`);
      validateStats(step.stats, `${label}[${index}].steps[${stepIndex}].stats`);
      check(
        step.stats.iterations === config.iterations,
        `${label} step iteration mismatch for ${result.id}`,
      );
      validateSamples(
        step.samplesMs,
        step.stats,
        `${label}[${index}].steps[${stepIndex}]`,
      );
    }
  }
  check(seen.size === expectedById.size, `${label} does not cover the edit catalog`);
}

function validateRetained(retained, retainedTrees, label) {
  object(retained, label);
  integer(retainedTrees, `${label}.retainedTrees`, 1);
  for (const field of [
    "heapUsedBytes",
    "heapTotalBytes",
    "externalBytes",
    "arrayBuffersBytes",
    "rssBytes",
    "heapUsedBytesPerTree",
    "rssBytesPerTree",
  ]) {
    finiteNumber(retained[field], `${label}.${field}`);
  }
  check(
    retained.heapUsedBytesPerTree === round(retained.heapUsedBytes / retainedTrees),
    `${label}.heapUsedBytesPerTree mismatch`,
  );
  check(
    retained.rssBytesPerTree === round(retained.rssBytes / retainedTrees),
    `${label}.rssBytesPerTree mismatch`,
  );
}

function validateSampledPeak(peak, label) {
  object(peak, label);
  for (const field of ["heapDeltaBytes", "rssDeltaBytes"]) {
    finiteNumber(peak[field], `${label}.${field}`);
    check(peak[field] >= 0, `${label}.${field} is negative`);
  }
}

function validateMemoryResults(results, config, label, expectedFixtures, expectedSequences) {
  object(results, label);
  validateFreshResultsMemory(array(results.fresh, `${label}.fresh`), config, `${label}.fresh`, expectedFixtures);
  validateIncrementalResultsMemory(
    array(results.incremental, `${label}.incremental`),
    config,
    `${label}.incremental`,
    expectedSequences,
  );
}

function validateFreshResultsMemory(results, config, label, expectedFixtures) {
  integer(config.fixtureCount, `${label}.config.fixtureCount`, 1);
  check(results.length === config.fixtureCount, `${label} fixture count mismatch`);
  const expectedById = new Map(expectedFixtures.map((fixture) => [fixture.id, fixture]));
  const seen = new Set();
  for (let index = 0; index < results.length; index += 1) {
    const result = object(results[index], `${label}[${index}]`);
    text(result.id, `${label}[${index}].id`);
    check(!seen.has(result.id), `${label} duplicate fixture id ${result.id}`);
    seen.add(result.id);
    const expected = expectedById.get(result.id);
    check(expected, `${label} unknown fixture id ${result.id}`);
    check(result.mode === "fresh", `${label} mode mismatch for ${result.id}`);
    text(result.kind, `${label}[${index}].kind`);
    text(result.role, `${label}[${index}].role`);
    text(result.path, `${label}[${index}].path`);
    check(result.path === expected.path, `${label} path mismatch for ${result.id}`);
    integer(result.bytes, `${label}[${index}].bytes`, 1);
    check(result.bytes === expected.bytes, `${label} byte count mismatch for ${result.id}`);
    check(
      result.expectedClean === expected.expectedClean,
      `${label} expected_clean mismatch for ${result.id}`,
    );
    check(result.iterations === config.iterations, `${label} iteration mismatch for ${result.id}`);
    integer(result.rootChildChecksum, `${label}[${index}].rootChildChecksum`, 0);
    check(
      result.retainedTrees === config.iterations,
      `${label} retained tree count mismatch for ${result.id}`,
    );
    validateRetained(result.retained, result.retainedTrees, `${label}[${index}].retained`);
    validateSampledPeak(result.sampledPeak, `${label}[${index}].sampledPeak`);
  }
  check(seen.size === expectedById.size, `${label} does not cover the fixture manifest`);
}

function validateIncrementalResultsMemory(results, config, label, expectedSequences) {
  integer(config.sequenceCount, `${label}.config.sequenceCount`, 1);
  check(results.length === config.sequenceCount, `${label} sequence count mismatch`);
  const expectedById = new Map(expectedSequences.map((sequence) => [sequence.id, sequence]));
  const seen = new Set();
  for (let index = 0; index < results.length; index += 1) {
    const result = object(results[index], `${label}[${index}]`);
    text(result.id, `${label}[${index}].id`);
    check(!seen.has(result.id), `${label} duplicate sequence id ${result.id}`);
    seen.add(result.id);
    const expected = expectedById.get(result.id);
    check(expected, `${label} unknown sequence id ${result.id}`);
    check(result.mode === "incremental", `${label} mode mismatch for ${result.id}`);
    check(
      result.description === null || typeof result.description === "string",
      `${label}[${index}].description must be a string or null`,
    );
    text(result.fixture, `${label}[${index}].fixture`);
    check(result.fixture === expected.fixture.id, `${label} fixture mismatch for ${result.id}`);
    text(result.fixturePath, `${label}[${index}].fixturePath`);
    check(
      result.fixturePath === expected.fixture.path,
      `${label} fixture path mismatch for ${result.id}`,
    );
    integer(result.initialBytes, `${label}[${index}].initialBytes`, 1);
    check(
      result.initialBytes === expected.fixture.bytes,
      `${label} initial byte count mismatch for ${result.id}`,
    );
    integer(result.finalBytes, `${label}[${index}].finalBytes`, 1);
    deepEqual(result.categories, expected.categories, `${label} categories for ${result.id}`);
    integer(result.editCount, `${label}[${index}].editCount`, 1);
    check(
      result.editCount === expected.edits.length,
      `${label} edit count mismatch for ${result.id}`,
    );
    check(
      result.treesPerReplay === 1 + result.editCount,
      `${label} trees-per-replay mismatch for ${result.id}`,
    );
    check(result.iterations === config.iterations, `${label} iteration mismatch for ${result.id}`);
    check(
      result.freshComparisons === config.iterations * result.editCount,
      `${label} fresh comparison count mismatch for ${result.id}`,
    );
    integer(result.rootChildChecksum, `${label}[${index}].rootChildChecksum`, 0);
    check(
      result.retainedTrees === config.iterations * result.treesPerReplay,
      `${label} retained tree count mismatch for ${result.id}`,
    );
    validateRetained(result.retained, result.retainedTrees, `${label}[${index}].retained`);
    validateSampledPeak(result.sampledPeak, `${label}[${index}].sampledPeak`);
  }
  check(seen.size === expectedById.size, `${label} does not cover the edit catalog`);
}

function loadManifestAndCatalog(manifestPath, catalogPath, label) {
  try {
    const fixtures = loadBenchmarkFixtures(path.resolve(ROOT, manifestPath), null);
    const sequences = catalogPath
      ? loadIncrementalCatalog(path.resolve(ROOT, catalogPath), fixtures, null, null)
      : null;
    return { fixtures, sequences };
  } catch (error) {
    throw new Error(`cannot load baseline inputs from ${label}: ${error.message}`);
  }
}

function validateFreshReport(report) {
  object(report, "fresh report");
  check(report.mode === "fresh", "fresh report has wrong mode");
  isoDate(report.generatedAt, "fresh report.generatedAt");
  validateEnvironment(report.environment, "fresh report.environment");
  validateReportConfig(report.config, "fresh report.config", "fresh");
  const { fixtures } = loadManifestAndCatalog(
    report.config.manifest,
    null,
    "fresh report.config.manifest",
  );
  validateFreshResults(report.fixtures, report.config, "fresh report.fixtures", fixtures);
}

function validateIncrementalReport(report) {
  object(report, "incremental report");
  check(report.mode === "incremental", "incremental report has wrong mode");
  isoDate(report.generatedAt, "incremental report.generatedAt");
  validateEnvironment(report.environment, "incremental report.environment");
  validateReportConfig(report.config, "incremental report.config", "incremental");
  const { fixtures, sequences } = loadManifestAndCatalog(
    report.config.manifest,
    report.config.catalog,
    "incremental report inputs",
  );
  validateIncrementalResults(
    report.sequences,
    report.config,
    "incremental report.sequences",
    sequences,
  );
  check(fixtures.length > 0, "incremental report fixture set is empty");
}

function validateMemoryReport(report) {
  object(report, "memory report");
  check(report.mode === "memory", "memory report has wrong mode");
  isoDate(report.generatedAt, "memory report.generatedAt");
  validateEnvironment(report.environment, "memory report.environment", { requireGc: true });
  validateReportConfig(report.config, "memory report.config", "memory");
  const { fixtures, sequences } = loadManifestAndCatalog(
    report.config.manifest,
    report.config.catalog,
    "memory report inputs",
  );
  validateMemoryResults(report, report.config, "memory report", fixtures, sequences);
}

function validateReportAgreement(fresh, incremental, memory) {
  deepEqual(commonEnvironment(fresh.environment), commonEnvironment(incremental.environment), "fresh/incremental environment");
  deepEqual(commonEnvironment(fresh.environment), commonEnvironment(memory.environment), "fresh/memory environment");
  check(fresh.config.manifest === incremental.config.manifest, "manifest paths disagree");
  check(fresh.config.manifest === memory.config.manifest, "manifest paths disagree");
  check(incremental.config.catalog === memory.config.catalog, "catalog paths disagree");
  check(fresh.config.iterations === incremental.config.iterations, "iteration counts disagree");
  check(fresh.config.iterations === memory.config.iterations, "iteration counts disagree");
  check(fresh.config.warmup === incremental.config.warmup, "warmup counts disagree");
  check(fresh.config.warmup === memory.config.warmup, "warmup counts disagree");
  check(
    fresh.config.manifest === DEFAULT_MANIFEST_PATH,
    `fresh report must use ${DEFAULT_MANIFEST_PATH}`,
  );
  check(
    incremental.config.catalog === DEFAULT_CATALOG_PATH,
    `incremental report must use ${DEFAULT_CATALOG_PATH}`,
  );
}

function validateSources(sources, baselineEnvironment) {
  object(sources, "baseline.sources");
  for (const mode of ["fresh", "incremental", "memory"]) {
    const source = object(sources[mode], `baseline.sources.${mode}`);
    check(source.mode === mode, `baseline.sources.${mode}.mode mismatch`);
    isoDate(source.generatedAt, `baseline.sources.${mode}.generatedAt`);
    text(source.report, `baseline.sources.${mode}.report`);
    validateEnvironment(source.environment, `baseline.sources.${mode}.environment`, {
      requireGc: mode === "memory",
    });
  }

  const fresh = sources.fresh.environment;
  const incremental = sources.incremental.environment;
  const memory = sources.memory.environment;
  deepEqual(commonEnvironment(fresh), commonEnvironment(incremental), "source environments");
  deepEqual(commonEnvironment(fresh), commonEnvironment(memory), "source environments");
  deepEqual(commonEnvironment(fresh), commonEnvironment(baselineEnvironment), "baseline environment");
  check(
    baselineEnvironment.gcAvailable === memory.gcAvailable,
    "baseline gcAvailable does not match memory source",
  );
  deepEqual(baselineEnvironment.nodeFlags, memory.nodeFlags, "baseline nodeFlags");
}

function validateBaselineConfig(config) {
  object(config, "baseline.config");
  check(config.manifest === DEFAULT_MANIFEST_PATH, `baseline.config.manifest must be ${DEFAULT_MANIFEST_PATH}`);
  check(config.catalog === DEFAULT_CATALOG_PATH, `baseline.config.catalog must be ${DEFAULT_CATALOG_PATH}`);
  integer(config.iterations, "baseline.config.iterations", 1);
  integer(config.warmup, "baseline.config.warmup", 0);
  integer(config.fixtureCount, "baseline.config.fixtureCount", 1);
  integer(config.sequenceCount, "baseline.config.sequenceCount", 1);
  check(
    config.resultsPath === "benchmarks/results/baseline.json",
    "baseline.config.resultsPath must be benchmarks/results/baseline.json",
  );
}

function validateBaseline(baseline) {
  object(baseline, "baseline");
  check(baseline.version === BASELINE_VERSION, `baseline.version must be ${BASELINE_VERSION}`);
  check(baseline.kind === "baseline", "baseline.kind must be baseline");
  isoDate(baseline.generatedAt, "baseline.generatedAt");
  check(
    typeof baseline.repositoryCommit === "string" &&
      /^[0-9a-f]{7,40}$/.test(baseline.repositoryCommit),
    "baseline.repositoryCommit must be a short or full hexadecimal git hash",
  );
  text(baseline.purpose, "baseline.purpose");
  text(baseline.environmentRecord, "baseline.environmentRecord");
  validateEnvironment(baseline.environment, "baseline.environment", { requireGc: true });
  validateBaselineConfig(baseline.config);
  validateSources(baseline.sources, baseline.environment);

  const { fixtures, sequences } = loadManifestAndCatalog(
    baseline.config.manifest,
    baseline.config.catalog,
    "baseline.config",
  );
  const results = object(baseline.results, "baseline.results");
  validateFreshResults(results.fresh, baseline.config, "baseline.results.fresh", fixtures);
  validateIncrementalResults(
    results.incremental,
    baseline.config,
    "baseline.results.incremental",
    sequences,
  );
  validateMemoryResults(
    { fresh: results.memory.fresh, incremental: results.memory.incremental },
    baseline.config,
    "baseline.results.memory",
    fixtures,
    sequences,
  );
}

function currentCommit() {
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function combinedEnvironment(reports) {
  return {
    ...commonEnvironment(reports.fresh.data.environment),
    gcAvailable: reports.memory.data.environment.gcAvailable,
    nodeFlags: reports.memory.data.environment.nodeFlags,
  };
}

function comparisonConfig(reports) {
  return {
    manifest: reports.fresh.data.config.manifest,
    catalog: reports.incremental.data.config.catalog,
    iterations: reports.fresh.data.config.iterations,
    warmup: reports.fresh.data.config.warmup,
    fixtureCount: reports.fresh.data.config.fixtureCount,
    sequenceCount: reports.incremental.data.config.sequenceCount,
  };
}

function buildBaseline(reports, options) {
  const commit = options.commit || currentCommit();
  check(/^[0-9a-f]{7,40}$/.test(commit), "commit must be a short or full hexadecimal git hash");

  const baseline = {
    version: BASELINE_VERSION,
    kind: "baseline",
    generatedAt: new Date().toISOString(),
    repositoryCommit: commit,
    purpose: "Observed performance baseline; not a performance budget or CI gate.",
    environmentRecord: "docs/benchmarking.md#benchmark-environment",
    environment: combinedEnvironment(reports),
    config: {
      manifest: reports.fresh.data.config.manifest,
      catalog: reports.incremental.data.config.catalog,
      iterations: reports.fresh.data.config.iterations,
      warmup: reports.fresh.data.config.warmup,
      fixtureCount: reports.fresh.data.config.fixtureCount,
      sequenceCount: reports.incremental.data.config.sequenceCount,
      resultsPath: relative(options.output),
    },
    sources: {
      fresh: {
        mode: reports.fresh.data.mode,
        generatedAt: reports.fresh.data.generatedAt,
        report: path.basename(reports.fresh.absolute),
        environment: reports.fresh.data.environment,
      },
      incremental: {
        mode: reports.incremental.data.mode,
        generatedAt: reports.incremental.data.generatedAt,
        report: path.basename(reports.incremental.absolute),
        environment: reports.incremental.data.environment,
      },
      memory: {
        mode: reports.memory.data.mode,
        generatedAt: reports.memory.data.generatedAt,
        report: path.basename(reports.memory.absolute),
        environment: reports.memory.data.environment,
      },
    },
    results: {
      fresh: reports.fresh.data.fixtures,
      incremental: reports.incremental.data.sequences,
      memory: {
        fresh: reports.memory.data.fresh,
        incremental: reports.memory.data.incremental,
      },
    },
  };

  validateBaseline(baseline);
  return baseline;
}

function valuesEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function environmentDifferences(baselineEnvironment, currentEnvironment) {
  const differences = [];
  const fields = [
    "node",
    "treeSitterRuntime",
    "platform",
    "arch",
    "cpuModel",
    "cpuCount",
    "totalMemoryBytes",
    "gcAvailable",
  ];
  for (const field of fields) {
    if (baselineEnvironment[field] !== currentEnvironment[field]) {
      differences.push({
        field,
        baseline: baselineEnvironment[field],
        current: currentEnvironment[field],
      });
    }
  }
  if (!valuesEqual(baselineEnvironment.nodeFlags, currentEnvironment.nodeFlags)) {
    differences.push({
      field: "nodeFlags",
      baseline: baselineEnvironment.nodeFlags,
      current: currentEnvironment.nodeFlags,
    });
  }
  return differences;
}

function configDifferences(baselineConfig, currentConfig) {
  const differences = [];
  const fields = ["manifest", "catalog", "iterations", "warmup", "fixtureCount", "sequenceCount"];
  for (const field of fields) {
    if (baselineConfig[field] !== currentConfig[field]) {
      differences.push({ field, baseline: baselineConfig[field], current: currentConfig[field] });
    }
  }
  return differences;
}

function metricChange(baselineValue, currentValue, label) {
  finiteNumber(baselineValue, `${label}.baseline`);
  finiteNumber(currentValue, `${label}.current`);
  return {
    baseline: baselineValue,
    current: currentValue,
    delta: round(currentValue - baselineValue),
    ratio: baselineValue > 0 ? round(currentValue / baselineValue) : null,
  };
}

function addIncrease(increases, mode, id, metric, change, source) {
  if (change.delta > 0) {
    increases.push({ mode, id, metric, source, delta: change.delta, ratio: change.ratio });
  }
}

function compareLatencyResult(baselineResult, currentResult, label, mode, increases) {
  check(baselineResult.id === currentResult.id, `${label} id mismatch`);
  const metrics = {};
  for (const field of LATENCY_METRICS) {
    const change = metricChange(
      baselineResult.stats[field],
      currentResult.stats[field],
      `${label}.stats.${field}`,
    );
    metrics[field] = change;
    addIncrease(increases, mode, baselineResult.id, field, change, `${label}.stats.${field}`);
  }
  return { id: baselineResult.id, stats: metrics };
}

function compareResultLists(baselineResults, currentResults, label, mode, increases, compareOne) {
  array(baselineResults, `${label}.baseline`);
  array(currentResults, `${label}.current`);
  check(
    baselineResults.length === currentResults.length,
    `${label} result count mismatch`,
  );
  const currentById = new Map();
  for (let index = 0; index < currentResults.length; index += 1) {
    const result = object(currentResults[index], `${label}.current[${index}]`);
    text(result.id, `${label}.current[${index}].id`);
    check(!currentById.has(result.id), `${label} duplicate current id ${result.id}`);
    currentById.set(result.id, result);
  }
  return baselineResults.map((baselineResult, index) => {
    const baselineItem = object(baselineResult, `${label}.baseline[${index}]`);
    text(baselineItem.id, `${label}.baseline[${index}].id`);
    const currentItem = currentById.get(baselineItem.id);
    check(currentItem, `${label} missing current result for ${baselineItem.id}`);
    return compareOne(
      baselineItem,
      currentItem,
      `${label}[${baselineItem.id}]`,
      mode,
      increases,
    );
  });
}

function compareFreshResults(baselineResults, currentResults, increases) {
  return compareResultLists(
    baselineResults,
    currentResults,
    "fresh",
    "fresh",
    increases,
    compareLatencyResult,
  );
}

function compareIncrementalResults(baselineResults, currentResults, increases) {
  return compareResultLists(
    baselineResults,
    currentResults,
    "incremental",
    "incremental",
    increases,
    compareLatencyResult,
  );
}

function compareMemoryResult(baselineResult, currentResult, label, mode, increases) {
  check(baselineResult.id === currentResult.id, `${label} id mismatch`);
  check(
    baselineResult.retainedTrees === currentResult.retainedTrees,
    `${label} retained-tree count mismatch`,
  );
  const retained = {};
  for (const field of RETAINED_MEMORY_METRICS) {
    const change = metricChange(
      baselineResult.retained[field],
      currentResult.retained[field],
      `${label}.retained.${field}`,
    );
    retained[field] = change;
    addIncrease(increases, mode, baselineResult.id, field, change, `${label}.retained.${field}`);
  }
  const sampledPeak = {};
  for (const field of PEAK_MEMORY_METRICS) {
    const change = metricChange(
      baselineResult.sampledPeak[field],
      currentResult.sampledPeak[field],
      `${label}.sampledPeak.${field}`,
    );
    sampledPeak[field] = change;
    addIncrease(
      increases,
      mode,
      baselineResult.id,
      field,
      change,
      `${label}.sampledPeak.${field}`,
    );
  }
  return { id: baselineResult.id, retained, sampledPeak };
}

function compareMemoryResults(baselineResults, currentResults, increases) {
  object(baselineResults, "memory.baseline");
  object(currentResults, "memory.current");
  return {
    fresh: compareResultLists(
      baselineResults.fresh,
      currentResults.fresh,
      "memory-fresh",
      "memory-fresh",
      increases,
      compareMemoryResult,
    ),
    incremental: compareResultLists(
      baselineResults.incremental,
      currentResults.incremental,
      "memory-incremental",
      "memory-incremental",
      increases,
      compareMemoryResult,
    ),
  };
}

function buildComparison(baseline, reports) {
  const currentEnvironment = combinedEnvironment(reports);
  const currentConfig = comparisonConfig(reports);
  const environmentDiffs = environmentDifferences(baseline.environment, currentEnvironment);
  const configDiffs = configDifferences(baseline.config, currentConfig);
  const increases = [];
  const observations = {
    fresh: compareFreshResults(baseline.results.fresh, reports.fresh.data.fixtures, increases),
    incremental: compareIncrementalResults(
      baseline.results.incremental,
      reports.incremental.data.sequences,
      increases,
    ),
    memory: compareMemoryResults(baseline.results.memory, reports.memory.data, increases),
  };
  increases.sort((left, right) => {
    const leftRatio = left.ratio === null ? Number.NEGATIVE_INFINITY : left.ratio;
    const rightRatio = right.ratio === null ? Number.NEGATIVE_INFINITY : right.ratio;
    return rightRatio - leftRatio || right.delta - left.delta;
  });

  return {
    version: COMPARISON_VERSION,
    kind: "comparison",
    generatedAt: new Date().toISOString(),
    baseline: {
      generatedAt: baseline.generatedAt,
      repositoryCommit: baseline.repositoryCommit,
      environment: baseline.environment,
      config: baseline.config,
    },
    current: {
      fresh: {
        generatedAt: reports.fresh.data.generatedAt,
        report: path.basename(reports.fresh.absolute),
        environment: reports.fresh.data.environment,
      },
      incremental: {
        generatedAt: reports.incremental.data.generatedAt,
        report: path.basename(reports.incremental.absolute),
        environment: reports.incremental.data.environment,
      },
      memory: {
        generatedAt: reports.memory.data.generatedAt,
        report: path.basename(reports.memory.absolute),
        environment: reports.memory.data.environment,
      },
    },
    environmentComparison: { matches: environmentDiffs.length === 0, differences: environmentDiffs },
    configComparison: { matches: configDiffs.length === 0, differences: configDiffs },
    observations,
    increases,
    interpretation: "Observed increases for investigation; no thresholds or pass/fail status.",
  };
}

function writeJson(output, data) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`);
}

function writeBaseline(output, baseline) {
  writeJson(output, baseline);
}

function runBuild(options) {
  const reports = {
    fresh: readJson(options.fresh, "fresh"),
    incremental: readJson(options.incremental, "incremental"),
    memory: readJson(options.memory, "memory"),
  };
  validateFreshReport(reports.fresh.data);
  validateIncrementalReport(reports.incremental.data);
  validateMemoryReport(reports.memory.data);
  validateReportAgreement(reports.fresh.data, reports.incremental.data, reports.memory.data);

  const baseline = buildBaseline(reports, options);
  writeBaseline(options.output, baseline);
  console.log(
    `baseline written: ${relative(options.output)} (${baseline.config.fixtureCount} fixtures, ` +
      `${baseline.config.sequenceCount} sequences, commit ${baseline.repositoryCommit})`,
  );
}

function runCheck(options) {
  const baseline = readJson(options.baseline, "baseline").data;
  validateBaseline(baseline);
  console.log(
    `baseline validated: ${relative(options.baseline)} (${baseline.config.fixtureCount} fixtures, ` +
      `${baseline.config.sequenceCount} sequences, commit ${baseline.repositoryCommit})`,
  );
}

function runCompare(options) {
  const baseline = readJson(options.baseline, "baseline").data;
  validateBaseline(baseline);

  const reports = {
    fresh: readJson(options.fresh, "fresh"),
    incremental: readJson(options.incremental, "incremental"),
    memory: readJson(options.memory, "memory"),
  };
  validateFreshReport(reports.fresh.data);
  validateIncrementalReport(reports.incremental.data);
  validateMemoryReport(reports.memory.data);
  validateReportAgreement(reports.fresh.data, reports.incremental.data, reports.memory.data);

  const comparison = buildComparison(baseline, reports);
  if (!options.output) {
    process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`);
    return;
  }
  writeJson(options.output, comparison);
  console.log(
    `comparison written: ${relative(options.output)} (${comparison.observations.fresh.length} fixtures, ` +
      `${comparison.observations.incremental.length} sequences, ${comparison.increases.length} increases, ` +
      `environment ${comparison.environmentComparison.matches ? "matches" : "differs"})`,
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (options.command === "build") {
    runBuild(options);
  } else if (options.command === "check") {
    runCheck(options);
  } else {
    runCompare(options);
  }
}

try {
  main();
} catch (error) {
  console.error(`baseline results failed: ${error.message}`);
  process.exitCode = 1;
}
