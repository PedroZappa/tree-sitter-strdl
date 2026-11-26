#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  ROOT,
  DEFAULT_MANIFEST,
  DEFAULT_CATALOG,
  round,
  loadBenchmarkFixtures,
  loadIncrementalCatalog,
} = require("./bench_common");

const {
  readJson,
  validateEnvironment,
  validateBaseline,
  validateFreshReport,
  validateIncrementalReport,
  validateMemoryReport,
  validateReportAgreement,
  combinedEnvironment,
  comparisonConfig,
  environmentDifferences,
  configDifferences,
} = require("./baseline_results");

const BUDGET_VERSION = 1;
const MINIMUM_SESSION_COUNT = 3;
const DEFAULT_BASELINE = path.join(ROOT, "benchmarks/results/baseline.json");
const DEFAULT_BUDGET = path.join(ROOT, "benchmarks/results/budgets.json");
const DEFAULT_MANIFEST_PATH = path.relative(ROOT, DEFAULT_MANIFEST);
const DEFAULT_CATALOG_PATH = path.relative(ROOT, DEFAULT_CATALOG);

const LATENCY_METRICS = [
  { name: "p50Ms", source: "stats.p50Ms" },
  { name: "p95Ms", source: "stats.p95Ms" },
  { name: "p99Ms", source: "stats.maxMs" },
];
const RETAINED_MEMORY_METRICS = [
  { name: "heapUsedBytesPerTree", source: "retained.heapUsedBytesPerTree" },
  { name: "rssBytesPerTree", source: "retained.rssBytesPerTree" },
];
const PEAK_MEMORY_METRICS = [
  { name: "heapDeltaBytes", source: "sampledPeak.heapDeltaBytes" },
  { name: "rssDeltaBytes", source: "sampledPeak.rssDeltaBytes" },
];
const MEMORY_METRICS = [...RETAINED_MEMORY_METRICS, ...PEAK_MEMORY_METRICS];

function usage() {
  return [
    "Usage: node scripts/benchmark_budgets.js <build|check> [options]",
    "",
    "Build or validate observed-envelope performance budgets.",
    "",
    "Build options:",
    "  --inputs PATH   Session manifest with fresh/incremental/memory report triples",
    "  --baseline PATH Baseline path (default: benchmarks/results/baseline.json)",
    "  --output PATH   Budgets path (default: benchmarks/results/budgets.json)",
    "",
    "Check options:",
    "  --budget PATH   Budgets to validate (default: benchmarks/results/budgets.json)",
    "",
    "  -h, --help      Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    return { help: true };
  }

  const command = argv[0];
  if (!["build", "check"].includes(command)) {
    throw new Error(`unknown command: ${command}`);
  }

  const options =
    command === "build"
      ? { command, inputs: null, baseline: DEFAULT_BASELINE, output: DEFAULT_BUDGET }
      : { command, budget: DEFAULT_BUDGET };

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
      case "--inputs":
        if (command !== "build") throw new Error(`--inputs is invalid for ${command}`);
        options.inputs = path.resolve(value());
        break;
      case "--baseline":
        if (command !== "build") throw new Error(`--baseline is invalid for ${command}`);
        options.baseline = path.resolve(value());
        break;
      case "--output":
        if (command !== "build") throw new Error(`--output is invalid for ${command}`);
        options.output = path.resolve(value());
        break;
      case "--budget":
        if (command !== "check") throw new Error(`--budget is invalid for ${command}`);
        options.budget = path.resolve(value());
        break;
      default:
        throw new Error(`unknown option: ${argument}`);
    }
  }

  if (options.help) {
    return options;
  }
  if (command === "build" && !options.inputs) {
    throw new Error("build requires --inputs");
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

function relative(filePath) {
  const absolute = path.resolve(filePath);
  const relativePath = path.relative(ROOT, absolute);
  return relativePath.startsWith("..") ? absolute : relativePath;
}

function valueAt(result, source, label) {
  const value = source.split(".").reduce((current, key) => (current === null ? undefined : current[key]), result);
  return finiteNumber(value, label);
}

function validateSessionManifest(manifest, inputsPath) {
  object(manifest, "session manifest");
  check(manifest.version === 1, "session manifest.version must be 1");
  const sessions = array(manifest.sessions, "session manifest.sessions");
  check(
    sessions.length >= MINIMUM_SESSION_COUNT - 1,
    `session manifest requires at least ${MINIMUM_SESSION_COUNT - 1} additional sessions`,
  );
  const baseDirectory = path.dirname(inputsPath);
  return sessions.map((entry, index) => {
    const session = object(entry, `session manifest.sessions[${index}]`);
    const reportPaths = {};
    for (const mode of ["fresh", "incremental", "memory"]) {
      const report = text(session[mode], `session manifest.sessions[${index}].${mode}`);
      reportPaths[mode] = path.resolve(baseDirectory, report);
    }
    return reportPaths;
  });
}

function loadSession(reportPaths, baseline, index) {
  const reports = {
    fresh: readJson(reportPaths.fresh, "fresh"),
    incremental: readJson(reportPaths.incremental, "incremental"),
    memory: readJson(reportPaths.memory, "memory"),
  };
  validateFreshReport(reports.fresh.data);
  validateIncrementalReport(reports.incremental.data);
  validateMemoryReport(reports.memory.data);
  validateReportAgreement(reports.fresh.data, reports.incremental.data, reports.memory.data);

  const environment = combinedEnvironment(reports);
  const config = comparisonConfig(reports);
  const environmentDiffs = environmentDifferences(baseline.environment, environment);
  check(
    environmentDiffs.length === 0,
    `session ${index} environment does not match baseline: ${environmentDiffs.map((item) => item.field).join(", ")}`,
  );
  const configDiffs = configDifferences(baseline.config, config);
  check(
    configDiffs.length === 0,
    `session ${index} configuration does not match baseline: ${configDiffs.map((item) => item.field).join(", ")}`,
  );

  return {
    reports,
    metadata: {
      generatedAt: reports.fresh.data.generatedAt,
      reports: {
        fresh: path.basename(reports.fresh.absolute),
        incremental: path.basename(reports.incremental.absolute),
        memory: path.basename(reports.memory.absolute),
      },
      environment,
      config,
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
}

function indexById(cases, label) {
  const byId = new Map();
  for (let index = 0; index < cases.length; index += 1) {
    const item = object(cases[index], `${label}[${index}]`);
    const id = text(item.id, `${label}[${index}].id`);
    check(!byId.has(id), `${label} duplicate id ${id}`);
    byId.set(id, item);
  }
  return byId;
}

function metricBudget(observations, sourceLabels, label) {
  array(observations, `${label}.observations`);
  check(
    observations.length === sourceLabels.length,
    `${label}.observations length does not match session count`,
  );
  let maxIndex = 0;
  for (let index = 0; index < observations.length; index += 1) {
    finiteNumber(observations[index], `${label}.observations[${index}]`);
    if (observations[index] > observations[maxIndex]) {
      maxIndex = index;
    }
  }
  return {
    budget: round(observations[maxIndex]),
    source: sourceLabels[maxIndex],
    observations: observations.map((value) => round(value)),
  };
}

function caseBudget(baselineCase, sessionCases, label, metricSpecs, sourceLabels, extraFields) {
  object(baselineCase, `${label}.baseline`);
  const id = text(baselineCase.id, `${label}.baseline.id`);
  for (let index = 0; index < sessionCases.length; index += 1) {
    const sessionCase = object(sessionCases[index], `${label}.session[${index}]`);
    check(sessionCase.id === id, `${label} session ${index} id mismatch`);
  }

  const metrics = {};
  for (const spec of metricSpecs) {
    const observations = [
      valueAt(baselineCase, spec.source, `${label}.baseline.${spec.source}`),
      ...sessionCases.map((sessionCase, index) =>
        valueAt(sessionCase, spec.source, `${label}.session[${index}].${spec.source}`),
      ),
    ];
    metrics[spec.name] = metricBudget(observations, sourceLabels, `${label}.${spec.name}`);
  }
  return { ...extraFields, id, metrics };
}

function buildBudgetLists(baseline, resultSets, sourceLabels) {
  const freshSessions = resultSets.map((results) => indexById(results.fresh, "session fresh"));
  const incrementalSessions = resultSets.map((results) =>
    indexById(results.incremental, "session incremental"),
  );
  const memoryFreshSessions = resultSets.map((results) =>
    indexById(results.memory.fresh, "session memory fresh"),
  );
  const memoryIncrementalSessions = resultSets.map((results) =>
    indexById(results.memory.incremental, "session memory incremental"),
  );

  return {
    fresh: baseline.results.fresh.map((baselineCase) =>
      caseBudget(
        baselineCase,
        freshSessions.map((byId) => byId.get(baselineCase.id)),
        `budget.fresh[${baselineCase.id}]`,
        LATENCY_METRICS,
        sourceLabels,
        { kind: baselineCase.kind, role: baselineCase.role },
      ),
    ),
    incremental: baseline.results.incremental.map((baselineCase) =>
      caseBudget(
        baselineCase,
        incrementalSessions.map((byId) => byId.get(baselineCase.id)),
        `budget.incremental[${baselineCase.id}]`,
        LATENCY_METRICS,
        sourceLabels,
        { fixture: baselineCase.fixture },
      ),
    ),
    memory: {
      fresh: baseline.results.memory.fresh.map((baselineCase) =>
        caseBudget(
          baselineCase,
          memoryFreshSessions.map((byId) => byId.get(baselineCase.id)),
          `budget.memory.fresh[${baselineCase.id}]`,
          MEMORY_METRICS,
          sourceLabels,
          { mode: "fresh" },
        ),
      ),
      incremental: baseline.results.memory.incremental.map((baselineCase) =>
        caseBudget(
          baselineCase,
          memoryIncrementalSessions.map((byId) => byId.get(baselineCase.id)),
          `budget.memory.incremental[${baselineCase.id}]`,
          MEMORY_METRICS,
          sourceLabels,
          { mode: "incremental" },
        ),
      ),
    },
  };
}

function validateConfig(config, label) {
  object(config, label);
  check(config.manifest === DEFAULT_MANIFEST_PATH, `${label}.manifest must be ${DEFAULT_MANIFEST_PATH}`);
  check(config.catalog === DEFAULT_CATALOG_PATH, `${label}.catalog must be ${DEFAULT_CATALOG_PATH}`);
  integer(config.iterations, `${label}.iterations`, 1);
  integer(config.warmup, `${label}.warmup`, 0);
  integer(config.fixtureCount, `${label}.fixtureCount`, 1);
  integer(config.sequenceCount, `${label}.sequenceCount`, 1);
}

function validateSessionMetadata(sessions, label) {
  array(sessions, label);
  return sessions.map((entry, index) => {
    const session = object(entry, `${label}[${index}]`);
    isoDate(session.generatedAt, `${label}[${index}].generatedAt`);
    const reports = object(session.reports, `${label}[${index}].reports`);
    for (const mode of ["fresh", "incremental", "memory"]) {
      text(reports[mode], `${label}[${index}].reports.${mode}`);
    }
    validateEnvironment(session.environment, `${label}[${index}].environment`, { requireGc: true });
    validateConfig(session.config, `${label}[${index}].config`);
    return `session-${index + 1}`;
  });
}

function validateMetric(metric, label, sourceLabels) {
  object(metric, label);
  finiteNumber(metric.budget, `${label}.budget`);
  text(metric.source, `${label}.source`);
  check(sourceLabels.includes(metric.source), `${label}.source is not a known session`);
  array(metric.observations, `${label}.observations`);
  check(
    metric.observations.length === sourceLabels.length,
    `${label}.observations length does not match session count`,
  );
  let maxIndex = 0;
  for (let index = 0; index < metric.observations.length; index += 1) {
    finiteNumber(metric.observations[index], `${label}.observations[${index}]`);
    if (metric.observations[index] > metric.observations[maxIndex]) {
      maxIndex = index;
    }
  }
  check(metric.budget === round(metric.observations[maxIndex]), `${label}.budget is not the observed maximum`);
  check(metric.source === sourceLabels[maxIndex], `${label}.source is not the maximum session`);
}

function validateCaseList(cases, expectedIds, label, metricNames, sourceLabels) {
  array(cases, label);
  check(cases.length === expectedIds.size, `${label} case count mismatch`);
  const seen = new Set();
  for (let index = 0; index < cases.length; index += 1) {
    const item = object(cases[index], `${label}[${index}]`);
    const id = text(item.id, `${label}[${index}].id`);
    check(expectedIds.has(id), `${label} unknown id ${id}`);
    check(!seen.has(id), `${label} duplicate id ${id}`);
    seen.add(id);
    const metrics = object(item.metrics, `${label}[${index}].metrics`);
    for (const metricName of metricNames) {
      validateMetric(metrics[metricName], `${label}[${id}].metrics.${metricName}`, sourceLabels);
    }
  }
  check(seen.size === expectedIds.size, `${label} does not cover all expected cases`);
}

function validateBudgets(budgets) {
  object(budgets, "budgets");
  check(budgets.version === BUDGET_VERSION, `budgets.version must be ${BUDGET_VERSION}`);
  check(budgets.kind === "budgets", "budgets.kind must be budgets");
  isoDate(budgets.generatedAt, "budgets.generatedAt");

  const baseline = object(budgets.baseline, "budgets.baseline");
  isoDate(baseline.generatedAt, "budgets.baseline.generatedAt");
  check(
    typeof baseline.repositoryCommit === "string" &&
      /^[0-9a-f]{7,40}$/.test(baseline.repositoryCommit),
    "budgets.baseline.repositoryCommit must be a hexadecimal git hash",
  );
  validateConfig(baseline.config, "budgets.baseline.config");
  validateEnvironment(budgets.environment, "budgets.environment", { requireGc: true });

  const methodology = object(budgets.methodology, "budgets.methodology");
  check(methodology.rule === "observed-envelope", "budgets.methodology.rule must be observed-envelope");
  check(
    methodology.minimumSessions === MINIMUM_SESSION_COUNT,
    `budgets.methodology.minimumSessions must be ${MINIMUM_SESSION_COUNT}`,
  );
  integer(methodology.sessionCount, "budgets.methodology.sessionCount", MINIMUM_SESSION_COUNT);
  text(methodology.percentileRule, "budgets.methodology.percentileRule");
  text(methodology.normalization, "budgets.methodology.normalization");

  const sourceLabels = [
    "baseline",
    ...validateSessionMetadata(budgets.sessions, "budgets.sessions"),
  ];
  check(
    methodology.sessionCount === sourceLabels.length,
    "budgets.methodology.sessionCount does not match sessions",
  );
  for (let index = 0; index < budgets.sessions.length; index += 1) {
    const session = budgets.sessions[index];
    const environmentDiffs = environmentDifferences(budgets.environment, session.environment);
    check(
      environmentDiffs.length === 0,
      `budgets.environment does not match session-${index + 1}: ${environmentDiffs.map((item) => item.field).join(", ")}`,
    );
    const configDiffs = configDifferences(baseline.config, session.config);
    check(
      configDiffs.length === 0,
      `budgets.baseline.config does not match session-${index + 1}: ${configDiffs.map((item) => item.field).join(", ")}`,
    );
  }

  const fixtures = loadBenchmarkFixtures(path.resolve(ROOT, DEFAULT_MANIFEST), null);
  const sequences = loadIncrementalCatalog(
    path.resolve(ROOT, DEFAULT_CATALOG),
    fixtures,
    null,
    null,
  );
  const fixtureIds = new Set(fixtures.map((fixture) => fixture.id));
  const sequenceIds = new Set(sequences.map((sequence) => sequence.id));

  const results = object(budgets.budgets, "budgets.budgets");
  validateCaseList(
    results.fresh,
    fixtureIds,
    "budgets.budgets.fresh",
    LATENCY_METRICS.map((metric) => metric.name),
    sourceLabels,
  );
  validateCaseList(
    results.incremental,
    sequenceIds,
    "budgets.budgets.incremental",
    LATENCY_METRICS.map((metric) => metric.name),
    sourceLabels,
  );

  const memory = object(results.memory, "budgets.budgets.memory");
  validateCaseList(
    memory.fresh,
    fixtureIds,
    "budgets.budgets.memory.fresh",
    MEMORY_METRICS.map((metric) => metric.name),
    sourceLabels,
  );
  validateCaseList(
    memory.incremental,
    sequenceIds,
    "budgets.budgets.memory.incremental",
    MEMORY_METRICS.map((metric) => metric.name),
    sourceLabels,
  );
}

function writeJson(output, data) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(data, null, 2)}\n`);
}

function runBuild(options) {
  const baselineReport = readJson(options.baseline, "baseline");
  const baseline = baselineReport.data;
  validateBaseline(baseline);

  const inputsReport = readJson(options.inputs, "session manifest");
  const reportPaths = validateSessionManifest(inputsReport.data, options.inputs);
  const sessions = [];
  const resultSets = [];
  for (let index = 0; index < reportPaths.length; index += 1) {
    const session = loadSession(reportPaths[index], baseline, index + 1);
    sessions.push(session.metadata);
    resultSets.push(session.results);
  }

  const sourceLabels = ["baseline", ...sessions.map((_, index) => `session-${index + 1}`)];
  const budgets = {
    version: BUDGET_VERSION,
    kind: "budgets",
    generatedAt: new Date().toISOString(),
    baseline: {
      generatedAt: baseline.generatedAt,
      repositoryCommit: baseline.repositoryCommit,
      config: baseline.config,
    },
    environment: baseline.environment,
    methodology: {
      rule: "observed-envelope",
      minimumSessions: MINIMUM_SESSION_COUNT,
      sessionCount: sourceLabels.length,
      percentileRule:
        "P50 and P95 use the highest session percentile; P99 uses the highest single observed sample.",
      normalization: "No hardware normalization, safety factor, or arbitrary multiplier is applied.",
    },
    sessions,
    budgets: buildBudgetLists(baseline, resultSets, sourceLabels),
  };

  validateBudgets(budgets);
  writeJson(options.output, budgets);
  const caseCount =
    budgets.budgets.fresh.length +
    budgets.budgets.incremental.length +
    budgets.budgets.memory.fresh.length +
    budgets.budgets.memory.incremental.length;
  console.log(
    `budgets written: ${relative(options.output)} (${budgets.methodology.sessionCount} sessions, ` +
      `${caseCount} cases, commit ${budgets.baseline.repositoryCommit})`,
  );
}

function runCheck(options) {
  const budgets = readJson(options.budget, "budgets").data;
  validateBudgets(budgets);
  console.log(
    `budgets validated: ${relative(options.budget)} (${budgets.methodology.sessionCount} sessions, ` +
      `commit ${budgets.baseline.repositoryCommit})`,
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
  } else {
    runCheck(options);
  }
}

try {
  main();
} catch (error) {
  console.error(`benchmark budgets failed: ${error.message}`);
  process.exitCode = 1;
}
