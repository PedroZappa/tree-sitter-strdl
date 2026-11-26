#!/usr/bin/env node
"use strict";

// Produce a non-gating, hardware-variance-aware performance report from one
// fresh/incremental/memory session, the committed baseline and observed-envelope budgets.

const fs = require("fs");
const path = require("path");

const {
  readJson,
  validateBaseline,
  validateFreshReport,
  validateIncrementalReport,
  validateMemoryReport,
  validateReportAgreement,
  combinedEnvironment,
  comparisonConfig,
  environmentDifferences,
  configDifferences,
  buildComparison,
} = require("./baseline_results");

const REPORT_VERSION = 1;
const INPUT_FIELDS = ["baseline", "budgets", "fresh", "incremental", "memory"];
const LATENCY_METRICS = ["p50Ms", "p95Ms", "p99Ms"];
const MEMORY_SECTIONS = [
  ["retained", ["heapUsedBytesPerTree", "rssBytesPerTree"]],
  ["sampledPeak", ["heapDeltaBytes", "rssDeltaBytes"]],
];
const BUDGET_GROUPS = [
  { mode: "fresh", path: ["fresh"], metrics: LATENCY_METRICS },
  { mode: "incremental", path: ["incremental"], metrics: LATENCY_METRICS },
  { mode: "memory-fresh", path: ["memory", "fresh"], metrics: null },
  {
    mode: "memory-incremental",
    path: ["memory", "incremental"],
    metrics: null,
  },
];

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function usage() {
  return [
    "Usage: node scripts/performance_report.js <options>",
    "",
    "Print a hardware-variance-aware performance report. Timing and memory observations",
    "are informational; environment/configuration mismatches make them non-comparable.",
    "",
    "Options:",
    "  --baseline PATH   Committed baseline results",
    "  --budgets PATH    Committed observed-envelope budgets",
    "  --fresh PATH      Fresh latency report",
    "  --incremental PATH Incremental latency report",
    "  --memory PATH     Parse-tree memory report",
    "  --output PATH     Also write the Markdown report to this file",
    "  --json-output PATH Also write the structured report to this file",
    "  --help            Show this message",
  ].join("\n");
}

function parseArgs(argv) {
  const options = { help: false, output: null, jsonOutput: null };
  for (const field of INPUT_FIELDS) {
    options[field] = null;
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const flag = argument.startsWith("--") ? argument.slice(2) : "";
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    const optionName =
      flag === "json-output"
        ? "jsonOutput"
        : flag === "output"
          ? "output"
          : INPUT_FIELDS.includes(flag)
            ? flag
            : null;
    check(optionName, `unknown option ${argument}`);
    check(index + 1 < argv.length, `${argument} requires a path`);
    index += 1;
    options[optionName] = argv[index];
    check(options[optionName].length > 0, `${argument} requires a path`);
  }
  if (options.help) {
    return options;
  }
  for (const field of INPUT_FIELDS) {
    check(options[field], `missing required option --${field}`);
  }
  return options;
}

function readBudgets(file) {
  const budgets = readJson(file, "budgets").data;
  check(
    budgets.version === 1 && budgets.kind === "budgets",
    "budgets must be a version 1 budgets artifact",
  );
  check(
    budgets.methodology && budgets.methodology.rule === "observed-envelope",
    "budgets must use the observed-envelope rule",
  );
  const groups = {
    fresh: budgets.budgets && budgets.budgets.fresh,
    incremental: budgets.budgets && budgets.budgets.incremental,
    "memory-fresh":
      budgets.budgets && budgets.budgets.memory && budgets.budgets.memory.fresh,
    "memory-incremental":
      budgets.budgets &&
      budgets.budgets.memory &&
      budgets.budgets.memory.incremental,
  };
  const indexed = {};
  for (const [name, cases] of Object.entries(groups)) {
    check(Array.isArray(cases), `budgets.budgets.${name} must be an array`);
    indexed[name] = new Map();
    for (const item of cases) {
      check(
        item && typeof item.id === "string",
        `${name} budget case requires an id`,
      );
      check(
        !indexed[name].has(item.id),
        `${name} duplicate budget case ${item.id}`,
      );
      indexed[name].set(item.id, item.metrics);
    }
  }
  return { budgets, indexed };
}

function mergeDifferences(target, entries) {
  for (const [field, difference] of entries) {
    if (!target.has(field)) {
      target.set(field, difference);
    }
  }
}

function buildComparability(comparison, budgets, reports) {
  const currentEnvironment = combinedEnvironment(reports);
  const currentConfig = comparisonConfig(reports);
  const differences = new Map();
  mergeDifferences(
    differences,
    mapFromComparison(comparison.environmentComparison),
  );
  mergeDifferences(differences, mapFromComparison(comparison.configComparison));
  mergeDifferences(
    differences,
    new Map(
      environmentDifferences(budgets.environment, currentEnvironment).map(
        toEntry,
      ),
    ),
  );
  mergeDifferences(
    differences,
    new Map(
      configDifferences(budgets.baseline.config, currentConfig).map(toEntry),
    ),
  );
  return {
    comparable:
      differences.size === 0 &&
      comparison.environmentComparison.matches &&
      comparison.configComparison.matches,
    differences: Array.from(differences.values()),
    environment: currentEnvironment,
    config: currentConfig,
  };
}

function mapFromComparison(group) {
  return new Map(group.differences.map(toEntry));
}

function toEntry(difference) {
  return [difference.field, difference];
}

function evaluateMetric(mode, id, metric, change, budgetMetric, comparable) {
  check(budgetMetric, `${mode}[${id}] missing budget for ${metric}`);
  check(
    Number.isFinite(budgetMetric.budget),
    `${mode}[${id}] ${metric} budget must be a finite number`,
  );
  check(
    Array.isArray(budgetMetric.observations),
    `${mode}[${id}] ${metric} budget observations must be an array`,
  );
  const observations = budgetMetric.observations;
  const observedMax = Math.max(budgetMetric.budget, ...observations);
  const verdict = !comparable
    ? "non-comparable"
    : change.current <= observedMax
      ? "within-observed-envelope"
      : "above-observed-envelope";
  return {
    mode,
    id,
    metric,
    baseline: change.baseline,
    current: change.current,
    delta: change.delta,
    ratio: change.ratio,
    budget: budgetMetric.budget,
    budgetObservations: observations,
    ratioToBudget:
      budgetMetric.budget > 0 ? change.current / budgetMetric.budget : null,
    verdict,
  };
}

function collectEvaluations(comparison, indexed, comparable) {
  const evaluations = [];
  for (const { mode, path: observationPath, metrics } of BUDGET_GROUPS) {
    const items = observationPath.reduce(
      (group, key) => group && group[key],
      comparison.observations,
    );
    check(
      items,
      `comparison is missing ${observationPath.join(".")} observations`,
    );
    for (const item of items) {
      const budgetCase = indexed[mode].get(item.id);
      check(budgetCase, `${mode} budget is missing case ${item.id}`);
      const fields =
        metrics === null
          ? MEMORY_SECTIONS.flatMap(([section, names]) =>
              names.map((name) => [
                `${section}.${name}`,
                name,
                item[section][name],
              ]),
            )
          : metrics.map((name) => [name, name, item.stats[name]]);
      for (const [label, budgetField, change] of fields) {
        check(change, `${mode}[${item.id}] missing comparison for ${label}`);
        evaluations.push(
          evaluateMetric(
            mode,
            item.id,
            label,
            change,
            budgetCase[budgetField],
            comparable,
          ),
        );
      }
    }
  }
  return evaluations;
}

function buildSummary(comparison, evaluations, comparability) {
  const summary = {
    comparable: comparability.comparable,
    cases: {
      fresh: comparison.observations.fresh.length,
      incremental: comparison.observations.incremental.length,
      memoryFresh: comparison.observations.memory.fresh.length,
      memoryIncremental: comparison.observations.memory.incremental.length,
    },
    metrics: evaluations.length,
    withinEnvelope: evaluations.filter(
      (item) => item.verdict === "within-observed-envelope",
    ).length,
    aboveEnvelope: evaluations.filter(
      (item) => item.verdict === "above-observed-envelope",
    ).length,
    nonComparable: evaluations.filter(
      (item) => item.verdict === "non-comparable",
    ).length,
    observedIncreases: comparison.increases.length,
  };
  return summary;
}

function number(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }
  return String(Number(value.toFixed(6)));
}

function ratio(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${value.toFixed(3)}x`;
}

function renderReport(report) {
  const lines = [
    "# Performance check report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "Status: informational only. Timing and memory observations never fail CI.",
    "Correctness guards, not performance deltas, remain the gating checks.",
    "",
    "## Comparability",
    "",
    `Baseline commit: \`${report.baseline.repositoryCommit}\`.`,
    `Current configuration: ${report.current.config.iterations} iterations, ${report.current.config.warmup} warmup; baseline configuration: ${report.baseline.config.iterations} iterations, ${report.baseline.config.warmup} warmup.`,
    "",
  ];
  if (report.comparability.differences.length === 0) {
    lines.push(
      "Environment and configuration match both the committed baseline and the budget sessions.",
    );
  } else {
    lines.push(
      "The current session is not comparable with the committed observations. Deltas are informational only.",
      "",
      "| Field | Baseline | Current |",
      "| --- | --- | --- |",
    );
    for (const difference of report.comparability.differences) {
      lines.push(
        `| ${difference.field} | ${number(difference.baseline)} | ${number(difference.current)} |`,
      );
    }
  }
  lines.push(
    "",
    "Hardware and runtime differences change parser latency without changing parser correctness.",
    "No hardware normalization, safety factor, or arbitrary multiplier is applied.",
    "",
    "## Observed-envelope check",
    "",
    `Budgets use ${report.budgets.sessionCount} sessions with the ${report.budgets.rule} rule: ${report.budgets.percentileRule}`,
    "",
    "| Scope | Cases | Metrics | Within envelope | Above envelope | Non-comparable |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  );
  const scopeRows = [
    ["Fresh latency", "fresh", report.summary.cases.fresh],
    ["Incremental latency", "incremental", report.summary.cases.incremental],
    ["Fresh memory", "memory-fresh", report.summary.cases.memoryFresh],
    [
      "Incremental memory",
      "memory-incremental",
      report.summary.cases.memoryIncremental,
    ],
  ];
  for (const [label, mode, cases] of scopeRows) {
    const relevant = report.evaluations.filter((item) => item.mode === mode);
    lines.push(
      `| ${label} | ${cases} | ${relevant.length} | ${relevant.filter((item) => item.verdict === "within-observed-envelope").length} | ${relevant.filter((item) => item.verdict === "above-observed-envelope").length} | ${relevant.filter((item) => item.verdict === "non-comparable").length} |`,
    );
  }
  lines.push("", "## Largest increases", "");
  if (report.increases.length === 0) {
    lines.push("_No increases versus the committed baseline._");
  } else {
    lines.push(
      "| Mode | Case | Metric | Baseline | Current | Delta | Ratio | Budget | Verdict |",
      "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    );
    const lookup = new Map(
      report.evaluations.map((item) => [
        `${item.mode}|${item.id}|${item.metric}`,
        item,
      ]),
    );
    for (const increase of report.increases.slice(0, 10)) {
      const evaluation = lookup.get(
        `${increase.mode}|${increase.id}|${increase.metric}`,
      );
      const budget = evaluation ? number(evaluation.budget) : "n/a";
      const verdict = evaluation ? evaluation.verdict : "no budget metric";
      const baselineValue = evaluation ? number(evaluation.baseline) : "n/a";
      const currentValue = evaluation ? number(evaluation.current) : "n/a";
      lines.push(
        `| ${increase.mode} | ${increase.id} | ${increase.metric} | ${baselineValue} | ${currentValue} | ${number(increase.delta)} | ${ratio(increase.ratio)} | ${budget} | ${verdict} |`,
      );
    }
  }
  lines.push(
    "",
    "## Interpretation",
    "",
    "- Budget exceedances are warnings for investigation, never failures.",
    "- Budgets cover P50/P95/P99 and memory metrics; `meanMs` increases have no envelope verdict.",
    "- A non-comparable session makes every numeric verdict informational.",
    "- Reproduce an above-envelope result on the reference environment before treating it as a regression.",
    "- Correctness gates are documented in [ci.md](../docs/ci.md) and remain mandatory.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function writeText(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function buildReport(options) {
  const baseline = readJson(options.baseline, "baseline").data;
  validateBaseline(baseline);
  const budgets = readBudgets(options.budgets);
  const reports = {
    fresh: readJson(options.fresh, "fresh"),
    incremental: readJson(options.incremental, "incremental"),
    memory: readJson(options.memory, "memory"),
  };
  validateFreshReport(reports.fresh.data);
  validateIncrementalReport(reports.incremental.data);
  validateMemoryReport(reports.memory.data);
  validateReportAgreement(
    reports.fresh.data,
    reports.incremental.data,
    reports.memory.data,
  );

  const comparison = buildComparison(baseline, reports);
  const comparability = buildComparability(
    comparison,
    budgets.budgets,
    reports,
  );
  const evaluations = collectEvaluations(
    comparison,
    budgets.indexed,
    comparability.comparable,
  );
  return {
    version: REPORT_VERSION,
    kind: "performance-report",
    generatedAt: new Date().toISOString(),
    baseline: {
      repositoryCommit: baseline.repositoryCommit,
      generatedAt: baseline.generatedAt,
      config: baseline.config,
      environment: baseline.environment,
    },
    budgets: {
      generatedAt: budgets.budgets.generatedAt,
      rule: budgets.budgets.methodology.rule,
      sessionCount: budgets.budgets.methodology.sessionCount,
      percentileRule: budgets.budgets.methodology.percentileRule,
      normalization: budgets.budgets.methodology.normalization,
    },
    current: {
      environment: comparability.environment,
      config: comparability.config,
      reports: {
        fresh: path.basename(options.fresh),
        incremental: path.basename(options.incremental),
        memory: path.basename(options.memory),
      },
    },
    comparability,
    classification: comparison.classification,
    summary: buildSummary(comparison, evaluations, comparability),
    evaluations,
    increases: comparison.increases,
    interpretation:
      "Informational hardware-variance-aware report; no thresholds or pass/fail performance status.",
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const report = buildReport(options);
  const markdown = renderReport(report);
  process.stdout.write(markdown);
  if (options.output) {
    writeText(options.output, markdown);
  }
  if (options.jsonOutput) {
    writeText(options.jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stderr.write(
    `performance report: ${report.summary.metrics} metrics, ` +
      `${report.summary.aboveEnvelope} above envelope, ` +
      `${report.summary.nonComparable} non-comparable; informational only\n`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`performance report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildReport, renderReport };
