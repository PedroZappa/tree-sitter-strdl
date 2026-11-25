# Documentation

This folder contains project-level planning and developer documentation for `tree-sitter-strdl`.

## Documents

- [Roadmap](roadmap.md) — phased implementation plan with checkable tasks and acceptance criteria.
- [Repository assessment](repository-assessment.md) — evolving Phase 1 findings, baseline, ABI 15 upgrade resolution, and syntax coverage inventory.
- [Compatibility](compatibility.md) — supported CLI, parser ABI, runtime floor, and binding validation matrix.

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
