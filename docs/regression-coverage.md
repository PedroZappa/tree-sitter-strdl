# Regression coverage

This document closes the Phase 6 roadmap item “Ensure every discovered bug produces a regression test.” The authoritative inventory is [regression_inventory.json](../test/fixtures/regression_inventory.json); [check_regression_coverage.py](../scripts/check_regression_coverage.py) validates it and runs as `make test-regressions`, which is part of `make verify` and therefore `make ci`.

## Scope

The inventory records defects that changed parser, query, binding, packaging, incremental, or build behavior. Recovery limitations that are documented rather than fixed are included because they are permanent correctness regressions. Findings with no behavior change are recorded as explicit exclusions with a rationale.

The inventory is curated: adding a discovered bug to it is part of the fix workflow. The automated check ensures that recorded regressions cannot be renamed, deleted, or disconnected from their test targets without failing CI.

## What the checker verifies

- Inventory version, scope, unique IDs, summaries, categories, evidence, and fix references.
- Corpus case names occur exactly once in the named corpus file.
- Node binding test names occur exactly once in `bindings/node/binding_test.js`.
- Required files and directories still exist under the repository root.
- Required text is present in Make targets, scripts, queries, fixtures, and metadata.
- Text explicitly removed by a fix remains absent.
- Exclusions remain documentation-only and do not claim regression artifacts.

The checker validates artifact identity and wiring. The behaviors themselves are executed by the corpus, query, Node binding, incremental, package, and generated-artifact gates documented in the [test strategy](test-strategy.md).

## Workflow

1. When a bug is discovered, choose a stable regression artifact: a corpus case, query probe, binding test, fixture, or gate script.
2. Add a `BUG-*` entry to the inventory in the same change that fixes the bug. Include the evidence, fix reference, and every artifact that guards the behavior.
3. If the finding changed no behavior, add an `EXC-*` entry instead and explain why no regression test is required.
4. Run `make test-regressions` before running the broader suite.
5. Do not remove or weaken an inventory entry without recording the rationale in the roadmap verification log.

## Current audit

The committed inventory records 14 bugs and 61 regression assertions, plus 3 documented exclusions. A negative control that renamed one corpus case in a temporary inventory failed with `exit=1` and identified the missing case. The clean inventory passes.
