# Documentation

This folder contains project-level planning and developer documentation for `tree-sitter-strdl`.

## Documents

- [Roadmap](roadmap.md) — phased implementation plan with checkable tasks and acceptance criteria.
- [Repository assessment](repository-assessment.md) — completed Phase 1 findings, grammar/CST audit, functional and performance baselines, ABI 15 upgrade resolution, syntax coverage inventory, repository inventory, cleanup candidates, prioritized gaps, and AGPL-3.0 license decision.
- [Grammar architecture](grammar-architecture.md) — naming conventions, public syntax-tree API, expression hierarchy, precedence, and conflict policy.
- [Strudel syntax evidence](syntax-evidence.md) — Phase 3 examples from official documentation, runtime source, official examples/tutorials, and maintained community sources, with source paths and rendered URLs.
- [Syntax coverage matrix](syntax-coverage-matrix.md) — Phase 3 comparison of each significant requirement with current grammar and corpus coverage.
- [Compatibility](compatibility.md) — supported CLI, parser ABI, runtime floor, and binding validation matrix.
- [CI](ci.md) — GitHub Actions triggers, validation commands, pinned tooling, local reproduction, and deferred checks.
- [Test strategy](test-strategy.md) — index of test layers, `make` command map, fixtures, scripts, extension procedures, and current coverage gaps.
- [Regression coverage](regression-coverage.md) — authoritative inventory of discovered bugs, their permanent regression artifacts, and documented exclusions.
- [Incremental editing sequences](incremental-editing-sequences.md) — fixtures, edit format, and recorded editing sequences for incremental-parsing equivalence tests.
- [Incremental equivalence test procedure](incremental-equivalence-procedure.md) — how the harness replays edits, compares trees, handles malformed steps, and reports results.
- [Queries](queries.md) — official query inventory, capture conventions, registration, execution, and stability policy.
- [Query audit](query-audit.md) — Phase 5 structural audit of `highlights.scm` against the current node and field API, with fixture evidence, follow-up findings, and registration evidence.
- [Highlight captures](highlight-captures.md) — authoritative reference for every `highlights.scm` capture name, its syntactic meaning, and query API stability notes.
- [Locals captures](locals-captures.md) — authoritative reference for every `locals.scm` capture name, scope and definition behavior, and known limitations.
- [Locals audit](locals-audit.md) — Phase 5 audit of `locals.scm` scopes, definitions, references, and semantic gaps.
- [Injection evaluation](injections-evaluation.md) — Phase 5 decision on whether `injections.scm` is justified by actual syntax requirements.

## Sources of truth

- [AGENTS.md](../AGENTS.md) — authoritative project requirements, architecture constraints, and phase definitions.
- [grammar.js](../grammar.js) — authoritative grammar definition.
- [tree-sitter.json](../tree-sitter.json) — parser metadata and query registration.
- Generated files under [src/](../src/) are build artifacts, not independent sources of truth.

## Documentation conventions

- Prefer concise Markdown documents with explicit ownership.
- Link to authoritative files instead of duplicating their contents.
- Update the roadmap in the same change that completes a roadmap item.
- Record evidence for completed items: commands, test results, generated-file checks, or review notes.
- Do not mark a task complete based on assumption or partial implementation.
