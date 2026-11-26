# Implementation roadmap

This roadmap turns the phases in [AGENTS.md](../AGENTS.md) into checkable implementation steps.

## Status rules

- `- [ ]` means the item has not been verified as complete.
- `- [x]` means the item is complete and has evidence in a commit, issue, pull request, test output, or linked document.
- Check an item only after its acceptance criteria are met.
- Update this file in the same change that completes an item.
- Record verification notes beneath completed phases when useful.
- Deliberate deferrals belong under **Deferred work**, with a reason and expected benefit.
- No item is pre-checked here. Existing code may partially implement a phase, but phase completion requires explicit verification.

## Versioning and phase tags

- Release and phase-complete tags use annotated `vMAJOR.MINOR.PATCH` tags, for example `v1.2.0`.
- Create a phase tag only after the phase acceptance criteria pass and tracked version metadata matches the tag.
- Work for the following phase uses a `phase/<number>-<slug>` branch created from the phase tag.
- Legacy tags `1.1.5` and `v1.1.x` are historical exceptions; do not create new non-`vX.Y.Z` tags.
- Do not push tags from ordinary commits. The publish workflow triggers on tag push, so tag pushes require explicit release authorization.

## Repository snapshot

Verified by inspecting the repository when this roadmap was created on 2026-11-25:

- `grammar.js` defines declarations, assignments, calls, chained methods, binary arithmetic, single-parameter arrow functions, object and array literals, strings, numbers, identifiers, line comments, and parenthesized expressions.
- Generated parser artifacts exist under `src/`, including `parser.c`, `grammar.json`, and `node-types.json`.
- `test/corpus/` contains seven corpus files.
- `queries/highlights.scm` and `queries/locals.scm` exist.
- Bindings exist for C, Go, Node.js, Python, Rust, and Swift.
- `package.json` defines Node.js tests, playground startup, and local installation scripts.
- `.github/workflows/` currently contains only `publish.yml`.
- No benchmark infrastructure, formal performance baseline, repository assessment, compatibility policy, or phase status document was found.
- `README.md` primarily documents Neovim installation; it does not yet document supported syntax, compatibility, parser API, or query captures.

These observations are inputs to Phase 1, not proof that any phase is complete.

## Immediate next work

Phase 2 is complete and tagged `v1.3.0`. Phase 3 evidence collection, the sourced coverage matrix, and the evidence-driven structured refactor are complete. Phase 4 is complete and tagged `v1.4.0`. Phase 5 is complete and tagged `v1.5.0`; the next work is Phase 6 testing and performance.

- [x] Capture the current functional baseline: grammar generation, corpus tests, Node.js binding tests, and query compilation.
- [x] Verify whether regenerated files under `src/` match the committed artifacts.
- [x] Inventory syntax coverage against the required constructs in `AGENTS.md`.
- [x] Inventory bindings, dependencies, queries, tests, CI, packaging, and licensing.
- [x] Write `docs/repository-assessment.md` with findings, risks, prioritized gaps, and the implementation order.
- [x] Link the assessment from [docs/README.md](README.md).

---

## Phase 1 — Repository audit

**Deliverable:** a documented repository assessment and implementation plan.

### Inspect the complete repository

- [x] Record repository purpose, scope, and current architecture.
- [x] Inventory tracked files, generated artifacts, bindings, queries, tests, scripts, and CI workflows.
- [x] Identify obsolete, duplicated, or unowned infrastructure.
- [x] Record which files are authoritative and which are generated.
- [x] Establish the current versioning and release model.

### Understand the current grammar

- [x] Map every `grammar.js` rule and its role.
- [x] Document current named nodes, fields, and public syntax-tree shape.
- [x] Record current precedence declarations and associativity choices.
- [x] Identify grammar rules that are undocumented, unused, or unexpectedly ambiguous.
- [x] Compare implemented syntax with the required coverage list in `AGENTS.md`.

### Audit bindings and dependencies

- [x] Test or inspect each existing binding: C, Go, Node.js, Python, Rust, and Swift.
- [x] Record which bindings are maintained, generated, and reachable from package metadata.
- [x] List direct and development dependencies and their purpose.
- [x] Verify dependency versions against the supported Tree-sitter CLI and runtime policy.
- [x] Identify dependencies that are unnecessary or unmaintained.

### Investigate licensing

- [x] Confirm the authoritative repository license.
- [x] Compare license declarations in `LICENSE`, `package.json`, `tree-sitter.json`, `Cargo.toml`, `pyproject.toml`, and binding files.
- [x] Investigate license history and published package metadata.
- [x] Align project license declarations with AGPL-3.0-only.
- [x] Verify licenses of reused grammar code or assets.
- [x] Record attribution requirements.
- [x] Escalate licensing uncertainty before substantial code reuse or license changes.

### Inspect tests, queries, and generated artifacts

- [x] Catalog existing corpus tests and the syntax each one covers.
- [x] Determine whether expected trees are explicit and intentional.
- [x] Compile and execute `queries/highlights.scm` and `queries/locals.scm`.
- [x] Check query capture names and registration in `tree-sitter.json` and `package.json`.
- [x] Regenerate parser artifacts and compare them with committed files.

### Establish baselines

- [x] Record commands for grammar generation and functional tests.
- [x] Establish a fresh-parsing latency baseline.
- [x] Establish an incremental-parsing latency baseline.
- [x] Establish representative and stress-test fixtures.
- [x] Record memory-use and large-document behavior.

### Phase 1 acceptance criteria

- [x] `docs/repository-assessment.md` exists and links to evidence.
- [x] Every significant gap has a priority and recommended phase.
- [x] Functional and performance baselines are recorded with reproduction commands.
- [x] Licensing, bindings, generated artifacts, tests, queries, and CI are explicitly assessed.
- [x] The implementation order is approved or recorded as provisional.

---

## Phase 2 — Grammar foundation

**Deliverable:** a stable, intentional grammar foundation.

- [x] Define node naming conventions in a grammar architecture document.
- [x] Define field naming conventions for important structural relationships.
- [x] Document which nodes are part of the public syntax-tree API.
- [x] Establish the core statement and expression hierarchy.
- [x] Establish composable base-expression rules.
- [x] Document every precedence declaration.
- [x] Document every intentional conflict and why it is necessary.
- [x] Remove unjustified precedence rules and conflicts where verification shows they are unnecessary.
- [x] Add corpus tests for foundational rules and precedence decisions.
- [x] Regenerate `src/parser.c`, `src/grammar.json`, and `src/node-types.json`.
- [x] Review every `node-types.json` change as a syntax-tree API change.
- [x] Run corpus tests and query compilation after regeneration.
- [x] Record syntax-tree changes in documentation.

### Phase 2 acceptance criteria

- [x] Foundational rules are deliberate, documented, and tested.
- [x] Generated artifacts are synchronized with `grammar.js`.
- [x] Public node and field names are documented.
- [x] No unexplained conflicts or precedence declarations remain.
- [x] Existing valid compositions still parse correctly.

---

## Phase 3 — Language coverage

**Deliverable:** comprehensive, evidence-based support for syntax used in real Strudel compositions.

### Establish evidence

- [x] Collect syntax examples from official Strudel documentation.
- [x] Collect examples from Strudel source code and runtime.
- [x] Collect examples from official examples and tutorials.
- [x] Record maintained community examples that demonstrate additional syntax.
- [x] Add each significant syntax requirement to a coverage matrix with its source.

### Audit current coverage

- [x] Variable declarations: `var`, `let`, and `const`.
- [x] Assignments and expression statements.
- [x] Function calls and nested calls.
- [x] Member expressions and method chains.
- [x] Arrow functions and callbacks.
- [x] Function parameters, including more than one parameter.
- [x] Arrays and objects.
- [x] Object properties and shorthand properties.
- [x] Destructuring.
- [x] Spread and rest syntax.
- [x] Arithmetic expressions.
- [x] Logical and comparison expressions.
- [x] Unary expressions.
- [x] Conditional expressions.
- [x] Optional chaining.
- [x] Nullish coalescing.
- [x] Template literals and interpolation.
- [x] Single-quoted and double-quoted strings.
- [x] Line and block comments.
- [x] Parenthesized expressions.
- [x] Relevant import and export syntax.
- [x] Mini-notation remains opaque JavaScript string content.

### Implement verified gaps

- [x] Implement only constructs supported by collected evidence.
- [x] Keep Strudel API function names out of grammar rules.
- [x] Preserve composable JavaScript-like expression rules.
- [x] Add corpus tests for every newly supported construct.
- [x] Add representative real-world Strudel fixtures.
- [x] Add regression tests for bugs discovered during implementation.
- [x] Regenerate and review generated artifacts.
- [x] Update the supported-syntax documentation.

### Phase 3 acceptance criteria

- [x] The coverage matrix records implemented, missing, and intentionally excluded constructs.
- [x] Every implemented gap has an evidence source and corpus coverage.
- [x] Real-world fixtures parse without unexpected errors.
- [x] Mini-notation has no grammar-specific nodes or semantics.
- [x] Generated artifacts remain synchronized.

---

## Phase 4 — Error recovery and incremental parsing

**Deliverable:** robust editor-facing parser behavior.

### Error recovery

- [x] Test unfinished function calls.
- [x] Test incomplete expressions.
- [x] Test missing delimiters.
- [x] Test incomplete argument lists.
- [x] Test partially typed arrow functions.
- [x] Test incomplete declarations.
- [x] Test unfinished strings and templates where recoverable.
- [x] Test malformed nested structures.
- [x] Verify that valid syntax outside error regions remains usable.
- [x] Verify that errors do not cascade unnecessarily.
- [x] Add permanent regression tests for each discovered recovery bug.

### Incremental parsing

- [x] Define realistic editing sequences using representative Strudel compositions.
- [x] Test insertions.
- [x] Test deletions.
- [x] Test replacements.
- [x] Test nested edits.
- [x] Test edits through temporarily malformed states.
- [x] Compare each incremental result against a fresh parse of the same final source.
- [x] Automate the comparison in a repeatable test harness.
- [x] Document the equivalence test procedure.

### Phase 4 acceptance criteria

- [x] Incomplete and malformed inputs retain useful syntax-tree information.
- [x] Valid-code correctness is not weakened to improve malformed-input recovery.
- [x] Incremental and fresh parses are equivalent for all recorded editing sequences.
- [x] Recovery regressions have permanent corpus tests.

---

## Phase 5 — Queries

**Deliverable:** complete official query infrastructure.

- [x] Audit `highlights.scm` against the current public syntax tree.
- [x] Verify that highlight patterns are specific and deterministic.
- [x] Document every highlight capture name and intended meaning.
- [x] Decide whether API-name-specific highlights are compatible with project scope.
- [x] Remove or relocate semantic analysis that does not belong in syntax queries.
- [x] Audit `locals.scm` scopes, definitions, and references.
- [x] Verify that function call identifiers are not incorrectly treated as definitions.
- [x] Verify that object keys are not incorrectly treated as variable definitions.
- [x] Evaluate whether `injections.scm` is justified by actual requirements.
- [x] Add only justified injections; do not create an empty or speculative query file.
- [x] Add query compilation tests.
- [x] Add query execution tests against representative compositions.
- [x] Keep capture names stable and document breaking changes.
- [x] Register official queries in `tree-sitter.json`, `package.json`, and packaging rules.
- [x] Add query documentation under `docs/`.

### Phase 5 acceptance criteria

- [x] Every official query compiles and executes against representative fixtures.
- [x] Capture names and meanings are documented.
- [x] Query behavior matches the public syntax-tree API.
- [x] Queries avoid editor-specific assumptions and semantic-analysis responsibilities.
- [x] Packaged queries are present in published package contents.

---

## Phase 6 — Testing and performance

**Deliverable:** measurable correctness and performance standards.

### Multi-layer testing

- [x] Create a documented test strategy index.
- [x] Expand corpus tests for valid syntax.
- [x] Expand corpus tests for malformed and incomplete code.
- [x] Add tests for every supported modern JavaScript construct.
- [x] Add tests for nested expressions and method chains.
- [x] Add query tests for compilation and captures.
- [x] Add incremental parsing tests.
- [x] Add Node.js binding tests.
- [x] Add generated-artifact consistency checks.
- [x] Add package integrity checks.
- [x] Ensure every discovered bug produces a regression test.

### Performance infrastructure

- [x] Create reproducible benchmarking fixtures.
- [x] Use representative Strudel compositions.
- [x] Use synthetic large documents.
- [x] Use deeply nested expressions.
- [x] Use pathological input for stress testing.
- [x] Add fresh-parsing latency measurement.
- [x] Add incremental-parsing latency measurement.
- [x] Add memory-consumption measurement.
- [x] Record P50, P95, and P99 separately for fresh and incremental parsing.
- [x] Record benchmark hardware and software environment.
- [x] Store baseline results in the repository.
- [x] Investigate regressions rather than ignoring them.
- [x] Establish performance budgets only after realistic baselines exist.
- [x] Distinguish correctness failures from performance warnings.

### CI validation

- [x] Run grammar generation in CI.
- [x] Check generated-file consistency in CI.
- [x] Run corpus tests in CI.
- [x] Run query tests in CI.
- [x] Run Node.js binding tests in CI.
- [x] Run incremental parsing tests in CI.
- [x] Run formatting and static checks in CI.
- [x] Run compatibility checks in CI (Node.js 22 and 24 matrix).
- [x] Run performance checks with hardware-variance-aware reporting.

See [CI](ci.md) for the workflow, commands, and remaining gaps.

### Phase 6 acceptance criteria

- [x] Test layers and commands are documented.
- [x] All required test layers run automatically.
- [x] Baselines are reproducible and committed.
- [x] Performance budgets, if any, are based on measured baselines.
- [x] No known correctness regression remains untracked.

---

## Phase 7 — Packaging and compatibility

**Deliverable:** an independently distributable grammar package.

### Node.js and bindings

- [x] Verify the Node.js binding build from a clean environment.
- [x] Run Node.js binding tests.
- [x] Verify generated parser files are usable without regeneration.
- [x] Audit the C binding.
- [x] Audit the Go binding.
- [x] Audit the Python binding.
- [ ] Audit the Rust binding.
- [ ] Audit the Swift binding.
- [ ] Decide which non-Node bindings are retained or deprecated, with rationale.
- [ ] Do not remove an existing integration without evaluating consequences.

### Compatibility policy

- [x] Pin development tooling for reproducible builds.
- [x] Document the supported Tree-sitter CLI version.
- [x] Document the minimum supported runtime version.
- [ ] Test generated parser compatibility with supported runtimes.
- [ ] Document package compatibility expectations.
- [ ] Define the syntax-coverage compatibility policy.
- [ ] Define the breaking-change policy for node names, field names, and queries.

### Package integrity

- [ ] Verify `package.json` files include grammar, generated sources, bindings, queries, and metadata.
- [ ] Verify `tree-sitter.json` metadata matches package metadata.
- [ ] Verify version numbers are aligned.
- [ ] Verify the package can be installed from a tarball.
- [ ] Verify the installed package can parse a representative composition.
- [ ] Verify published contents with `npm pack --dry-run`.
- [ ] Verify no build artifacts are accidentally required or omitted.

### Phase 7 acceptance criteria

- [ ] A clean consumer can install and use the package without regenerating the parser.
- [ ] Supported tooling and runtime versions are documented and tested.
- [ ] Package contents are validated.
- [ ] Binding decisions are documented.
- [ ] Breaking-change policy is published.

---

## Phase 8 — Documentation and release readiness

**Deliverable:** independently maintainable and releasable grammar.

### Documentation

- [ ] Expand `README.md` with purpose, scope, installation, usage, supported syntax, and limitations.
- [ ] Add grammar architecture documentation.
- [ ] Document important node types.
- [ ] Document public fields.
- [ ] Document precedence and intentional conflicts.
- [ ] Document error recovery considerations.
- [x] Add query documentation with capture names and conventions.
- [ ] Add development environment documentation.
- [ ] Document build and generation procedures.
- [ ] Document testing procedures.
- [ ] Document benchmarking procedures.
- [ ] Document contribution workflow.
- [x] Add compatibility documentation.
- [ ] Verify all documentation matches implemented behavior.

### CI/CD and release

- [ ] Ensure all pull-request and push validation checks from `AGENTS.md` run in CI.
- [ ] Ensure generated files are checked before release.
- [ ] Validate package contents before publishing.
- [ ] Maintain release notes and a changelog.
- [ ] Use versioned releases.
- [ ] Keep publishing controlled by explicit release authorization.
- [ ] Verify that ordinary commits cannot publish packages.
- [ ] Perform a release-readiness review.

### Final validation

- [x] Regenerate parser artifacts.
- [x] Run corpus tests.
- [ ] Run query tests.
- [x] Run Node.js binding tests.
- [ ] Run incremental parsing tests.
- [ ] Run compatibility checks.
- [ ] Run benchmarks and compare against baseline.
- [ ] Review licensing and attribution.
- [ ] Review package contents.
- [ ] Review documentation consistency.
- [ ] Record any unresolved limitations.

### Phase 8 acceptance criteria

- [ ] Documentation covers consumers, contributors, and maintainers.
- [ ] CI validates generation, correctness, queries, bindings, compatibility, and performance as specified.
- [ ] Release process is versioned, controlled, and documented.
- [ ] Final validation has no unresolved correctness failures.
- [ ] Known limitations are documented honestly.

---

## Deferred work

Use this section for worthwhile improvements that are intentionally postponed.

For each deferred item, record:

- [ ] Opportunity and expected benefit.
- [ ] Reason for deferral.
- [ ] Suggested phase or trigger for revisiting.
- [ ] Link to any related issue or discussion.

### Deferred items

- **Rust ABI-15 binding verification**
  - Opportunity and expected benefit: confirm the Rust binding loads the generated ABI 15 parser and prevent a silent runtime-floor mismatch.
  - Reason for deferral: `cargo` is unavailable in the verification environment; the declared dev dependency is already `tree-sitter = "0.25.8"`.
  - Suggested phase or trigger: Phase 7, when a toolchain with `cargo` is available.

- **Swift XCTest verification**
  - Opportunity and expected benefit: execute `swift test`, not only `swift build`, to validate the Swift binding against ABI 15.
  - Reason for deferral: XCTest could not be resolved by the installed command-line tools; dependency resolution selected SwiftTreeSitter 0.25.0 and tree-sitter 0.25.10, and the library build passed.
  - Suggested phase or trigger: Phase 7, with a Swift toolchain that provides XCTest.

- **Automated query capture and incremental parsing tests**
  - Opportunity and expected benefit: verify query semantics and edit equivalence rather than only query compilation and manual regeneration checks.
  - Reason for deferral: outside the completed compatibility-upgrade scope.
  - Suggested phase or trigger: Phases 4 and 5.

- **Remaining `locals.scm` semantic follow-ups**
  - Opportunity and expected benefit: capture import aliases, nested array-pattern bindings, and catch/function scopes correctly, and narrow the blanket reference rule so references represent actual identifier reads.
  - Reason for deferral: the current audit item is diagnostic; the immediately following roadmap items cover call identifiers and object keys first.
  - Suggested phase or trigger: later Phase 5 locals work, after the call-identifier and object-key decisions.
  - Related evidence: [locals audit](locals-audit.md).

## Verification log

For checked items, add a short entry using this format:

```markdown
- Phase 1 — item name: verified with `<command>` on YYYY-MM-DD; evidence: <link or commit>.
```

- Phase 1 — Capture functional baseline: verified with `tree-sitter generate`, `tree-sitter test`, `npm test`, and `tree-sitter query ...` on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md). The baseline records the original Node.js binding-test failure; the later upgrade run passed.
- Phase 1 — Regenerated-file investigation: the ABI 15 upgrade intentionally changed generated artifacts from `HEAD`; a second `node_modules/.bin/tree-sitter generate` left `src/parser.c`, `src/grammar.json`, `src/node-types.json`, and `src/tree_sitter/array.h` byte-identical; evidence: [compatibility.md](compatibility.md).
- Phase 1 — Link assessment: verified by the assessment link in [docs/README.md](README.md) on 2026-11-25.
- Phase 7 — Pin tooling and document CLI/runtime floor: verified with `package.json`, `package-lock.json`, and [compatibility.md](compatibility.md).
- Phase 7 and Phase 8 — Node.js binding tests: `npm test` passed after dependency installation with `tree-sitter` 0.25.1 and Node.js 26.8.2.
- Phase 8 — Compatibility documentation: verified by [compatibility.md](compatibility.md), including the runtime matrix and known limitations.
- Phase 8 — Regeneration and corpus tests: `node_modules/.bin/tree-sitter generate` was idempotent and `tree-sitter test` passed 7/7 corpus tests with CLI 0.27.2.
- Phase 1 — Inventory syntax coverage: compared `grammar.js`, `test/corpus/`, `src/node-types.json`, and temporary `tree-sitter parse --json-summary`/`--cst` probes on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#syntax-coverage-inventory).
- Phase 1 — Inventory bindings, dependencies, queries, tests, CI, packaging, and licensing: inspected tracked source, manifests, queries, corpus tests, fixtures, and the single publish workflow on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#repository-inventory). The license conflict was unresolved at inventory time and was later decided.
- Phase 1 — Investigate license history: inspected `git log`, commit diffs, and public npm/crates.io/PyPI metadata for published `1.1.8` artifacts on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#history-and-published-artifact-evidence). The AGPL/MIT conflict persists in published artifacts.
- Phase 1 — Resolve license authority: owner confirmed AGPL-3.0 as authoritative on 2026-11-25; project declarations were aligned to `AGPL-3.0-only`; evidence: [docs/repository-assessment.md](repository-assessment.md#licensing-decision).
- Phase 1 — Identify obsolete, duplicated, or unowned infrastructure: compared the tracked file list, ignored artifacts, generated-file markers, and build/package configuration on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#obsolete-duplicated-and-unowned-infrastructure).
- Phase 1 — Establish functional and performance baselines: `tree-sitter test` passed 7/7 with CLI 0.26.9; fresh and incremental parse samples were collected via `tree-sitter parse --time --edits` against a shared library built from committed `src/parser.c`; evidence: [docs/repository-assessment.md](repository-assessment.md#performance-baseline).
- Phase 1 — Establish representative and stress fixtures: used `test/fixtures/test.strdl` plus temporary generated large, deep, malformed, x10, and x100 fixtures with recorded generation commands on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#fixtures).
- Phase 1 — Record memory and large-document behavior: measured CLI child peak RSS with `resource.getrusage` for five fixture sizes on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#memory-and-large-document-behavior).
- Phase 1 — Prioritize gaps and record implementation order: recorded priority, risk, recommended phase, and provisional phase order on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#prioritized-gaps-risks-and-implementation-order).
- Phase 1 — Grammar and CST audit: compared every `grammar.js` rule, all 20 named node types and 7 fields in `src/node-types.json`, and parse probes on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#grammar-architecture-audit).
- Phase 1 — Corpus expected-tree review: reviewed all seven expected trees and confirmed they are explicit, pass CLI 0.26.9, omit field names, and do not record wrapper-design rationale on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#corpus-expected-tree-review).
- Phase 1 — Dependency and attribution audit: compared manifests, `package-lock.json`, npm/crates.io/PyPI registry metadata, upstream Tree-sitter v0.27.2 source/templates, and git history on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#dependency-and-attribution-audit).
- Phase 1 — Complete repository assessment: recorded findings, risks, prioritized gaps, and provisional implementation order in `docs/repository-assessment.md` on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#prioritized-gaps-risks-and-implementation-order).
- Phase 1 — Version tag: aligned tracked version metadata to `1.2.0`, documented the `vX.Y.Z` phase-tag convention, and replaced the local `phase-1-repository-audit` tag with annotated `v1.2.0` on 2026-11-25; no tag was pushed.
- Phase 2 — Grammar architecture: documented naming rules, the public node/field API, statement and expression hierarchy, every active precedence declaration, and the no-conflict policy on 2026-11-25; evidence: [grammar-architecture.md](grammar-architecture.md).
- Phase 2 — Dead metadata removal: removed unreferenced named precedence levels `member`, `call`, `binary_times`, and `binary_plus` and the commented-out conflict entry from `grammar.js`; the retained `arrow_function` level remains active.
- Phase 2 — Generated artifact review: `node_modules/.bin/tree-sitter generate` with CLI 0.27.2 left `src/node-types.json` unchanged, removed only stale precedence metadata from `src/grammar.json`, and updated only version metadata in `src/parser.c`; no public syntax-tree API change was introduced.
- Phase 2 — Corpus tests: added `declarations.txt`, `base_expressions.txt`, and `precedence.txt`; `node_modules/.bin/tree-sitter test --json-summary` passed 17/17 cases with CLI 0.27.2, including all seven original cases.
- Phase 2 — Query compilation: `node_modules/.bin/tree-sitter query --quiet --grammar-path . queries/highlights.scm test/fixtures/test.strdl` and the equivalent `locals.scm` command completed successfully with CLI 0.27.2.
- Phase 2 — Representative fixture: `node_modules/.bin/tree-sitter parse test/fixtures/test.strdl` produced no `ERROR` or `MISSING` nodes after regeneration.
- Phase 2 — Version tag: aligned tracked version metadata to `1.3.0` and created annotated tag `v1.3.0` on 2026-11-25; no tag was pushed.
- Phase 3 — Official documentation evidence: collected 33 syntax examples from Codeberg `uzu/strudel` `website/src/pages/**/*.mdx`, imported package docs, `website/src/examples.mjs`, and `packages/web/README.md` on 2026-11-25; each example is linked to its source in [syntax-evidence.md](syntax-evidence.md). Only user-facing Strudel/JavaScript code was collected; MDX infrastructure and mini-notation internals were excluded.
- Phase 3 — Source/runtime evidence: inspected `packages/transpiler` (`transpiler.mjs`, `index.mjs`, four plug-ins, `test/transpiler.test.mjs`) and `packages/core` (`evaluate.mjs`, `repl.mjs`) from Codeberg `main` on 2026-11-25; recorded 18 S-IDs in [syntax-evidence.md](syntax-evidence.md). Confirms Acorn `ecmaVersion: 2022` with `allowAwaitOutsideFunction: true`, label rewriting, mini/tag plug-ins, and observed ternary/template-interpolation inputs. The commented-out destructuring/`import()` test is marked inactive evidence.
- Phase 3 — Examples/tutorials evidence: inspected `examples/codemirror-repl/tunes.mjs`, `examples/minimal-repl/tune.mjs`, `test/testtunes.mjs`, `website/src/repl/tunes.mjs`, and tutorial pages `learn/lfo.mdx`, `learn/mondo-notation.mdx`, `recipes/arpeggios.mdx`, `understand/cycles.mdx`, and `workshop/motors.mdx` from Codeberg `main` on 2026-11-25; recorded 18 E-IDs in [syntax-evidence.md](syntax-evidence.md). Adds active evidence for `new` expressions, two-parameter arrows, unary minus, nested object/array literals, and member calls on string literals. Object spread and logical OR occur only in commented-out fixtures (E18).
- Phase 3 — Community evidence: checked repository activity via the GitHub API and inspected user-facing pattern/helper code from `Coriou/strasbeat`, `edcrub/edcrub.github.io`, and `calvinw/strudel-llm-docs`, plus the dated GoSuraj GSB post, on 2026-11-25; recorded seven C-IDs in [syntax-evidence.md](syntax-evidence.md). Adds active evidence for `var`, assignment statements, `export default`, named `function` declarations with default parameters, array destructuring in arrow parameters, object spread, and `try`/`catch`.
- Phase 3 — Coverage matrix: recorded M01–M45 with evidence IDs, current status, grammar/corpus audit, next action, intentional exclusions, and deferred constructs in [syntax-coverage-matrix.md](syntax-coverage-matrix.md) on 2026-11-25.
- Phase 3 — Audit current coverage: inspected `grammar.js`, `src/node-types.json`, and committed corpus tests at `2d9b706`, then parsed 43 temporary probes under `/tmp/opencode/coverage-probes` with `node_modules/.bin/tree-sitter parse` using CLI 0.27.2 on 2026-11-25. Error-free `await`, `new`, `export const`, `export default`, and tagged-template probes were reviewed with `--cst` and classified as structurally missing. No grammar or generated files changed.
- Phase 3 — Structured grammar refactor: replaced wrapper-heavy expression/statement rules with composable JavaScript-like rules, added named fields, explicit parenthesized/interpolation nodes, and seven justified GLR conflicts on 2026-11-25. Regenerated with `node_modules/.bin/tree-sitter generate` using CLI 0.27.2. `src/node-types.json` changed from 20 named nodes/7 fields to 40 named nodes/31 fields; the public CST change is documented in [grammar-architecture.md](grammar-architecture.md).
- Phase 3 — Corpus and query validation: `node_modules/.bin/tree-sitter test --update` rewrote all prior expected trees and added 28 cases; three unsupported logical/nullish operator cases were then removed, leaving 25 net new cases. A final `node_modules/.bin/tree-sitter test` passed 42/42 cases with CLI 0.27.2. The same command compiled and executed `queries/highlights.scm` and `queries/locals.scm` successfully after both were rewritten for the new CST.
- Phase 3 — Probe and fixture validation: all 43 temporary probes were reparsed after regeneration. Named imports were fixed to consume `from`; expected remaining errors are object destructuring, spread arguments, shorthand properties, logical operators, and nullish coalescing. `node_modules/.bin/tree-sitter parse test/fixtures/test.strdl test/fixtures/test-local.strdl` completed without `ERROR` or `MISSING` nodes.
- Phase 3 — Evidence discipline: logical operators and nullish coalescing were briefly added with the binary-expression family, then removed because E18 is inactive and no active evidence exists. Final matrix rows M23 and M27 remain **Missing**.
- Phase 3 — Documentation: updated [README.md](../README.md), [grammar-architecture.md](grammar-architecture.md), [syntax-coverage-matrix.md](syntax-coverage-matrix.md), [compatibility.md](compatibility.md), and the historical notice in [repository-assessment.md](repository-assessment.md). `git diff --check` passed before the change was staged.
- Phase 4 — Error recovery: added `test/corpus/incomplete_calls.txt` with five permanent unfinished-call cases covering a missing `)`, a completed string argument, method-chain calls, in-progress arguments, and declaration values. `node_modules/.bin/tree-sitter test` passes 47/47 cases with CLI 0.27.2; each new case localizes the error as `MISSING ")"` and preserves the surrounding call, member, and declaration structure.
- Phase 4 — Error recovery: added `test/corpus/incomplete_expressions.txt` with five permanent cases covering missing binary/comparison operands, a missing ternary alternative, a nested incomplete operator, and a missing member property. Each case preserves the expression node and synthesizes a `MISSING` terminal. A bare `!` at EOF was probed but collapses to a root `ERROR`, so it was not recorded as expected-good recovery. `node_modules/.bin/tree-sitter test` passes 52/52 cases with CLI 0.27.2. `make test-recovery` runs both recovery corpus files and passes 10/10 cases.
- Phase 4 — Error recovery: added `test/corpus/missing_delimiters.txt` with five permanent cases covering missing `]`, `)`, and `}` delimiters while preserving arrays, parenthesized expressions, computed access, object literals, and blocks. Object recovery is tested in declaration context because bare `{a: 1` is a labeled block in statement position; `f({a: 1` collapses to `ERROR` because both `}` and `)` are missing and was not recorded as expected-good recovery. Extended `make test-recovery` to include `missing_*.txt`. `node_modules/.bin/tree-sitter test` passes 57/57 cases with CLI 0.27.2; `make test-recovery` passes 15/15 cases.
- Phase 4 — Error recovery: added `test/corpus/incomplete_argument_lists.txt` with six permanent cases covering trailing commas, a trailing comma after multiple arguments, a nested incomplete call, a leading comma, a doubled comma, and a missing comma. Partial lists synthesize `MISSING ")"`, while malformed separators produce localized `ERROR` nodes and preserve the surrounding arguments and call. The nested case records both missing closing parentheses without collapsing the surrounding call. `node_modules/.bin/tree-sitter test` passes 63/63 cases with CLI 0.27.2; `make test-recovery` passes 21/21 cases.
- Phase 4 — Error recovery: added `test/corpus/incomplete_arrow_functions.txt` with six permanent cases covering missing bodies after single, parenthesized, empty, and destructured parameter lists, an incomplete expression body, and a missing block brace. Each case preserves the `arrow_function` node and synthesizes a localized `MISSING number` or `MISSING "}"`. `node_modules/.bin/tree-sitter test` passes 69/69 cases with CLI 0.27.2; `make test-recovery` passes 27/27 cases.
- Phase 4 — Error recovery: added `test/corpus/incomplete_declarations.txt` with seven permanent cases covering missing `const`/`let`/`var` initializers, a missing initializer after an array binding, an incomplete second declarator, a trailing declarator comma, and a missing `export default` value. Variable declarations preserve the declaration kind and binding name while leaving the trailing `=` in a localized `ERROR`; `export default` synthesizes `MISSING number`. `function f()` and `import { x } from` were probed but collapse to a root `ERROR`, so they were not recorded as expected-good recovery. `node_modules/.bin/tree-sitter test` passes 76/76 cases with CLI 0.27.2; `make test-recovery` passes 34/34 cases.
- Phase 4 — Error recovery: added `test/corpus/unfinished_templates.txt` with three permanent recoverable cases: an untagged template with a trailing newline, a template after a completed `${...}` substitution, and a tagged template. Each preserves the template or tagged-template node and synthesizes a missing closing backtick; the plain template case requires a trailing newline in the corpus input. Unclosed quoted strings and an unfinished `${...}` expression collapse to a root `ERROR` and were not recorded as expected-good recovery. `node_modules/.bin/tree-sitter test` passes 79/79 cases with CLI 0.27.2; `make test-recovery` passes 37/37 cases.
- Phase 4 — Error recovery: added `test/corpus/malformed_nested_structures.txt` with seven permanent cases covering a missing array bracket inside a closed call, a missing array bracket inside an object, an incomplete arrow body inside a call, nested calls with two missing parentheses, a nested call with a missing object brace, a doubled comma inside a nested array, and a doubled comma inside a nested object. Each preserves the outer call, declaration, object, array, or arrow node and localizes the inner error. An array of objects with both closing delimiters missing was probed but collapses to a root `ERROR`; the nested-call case requires a trailing newline in the corpus input. Extended `make test-recovery` to include `malformed_*.txt`. `node_modules/.bin/tree-sitter test` passes 86/86 cases with CLI 0.27.2; `make test-recovery` passes 44/44 cases.
- Phase 4 — Error recovery: added `test/corpus/valid_syntax_around_errors.txt` with five permanent cases placing a localized error between valid declarations or calls. Missing array/object brackets, a nested array bracket inside a call, a doubled comma, and a missing function body each keep the surrounding statements as separate syntax nodes. Probes showed that an unfinished call, a missing initializer, and an incomplete arrow body swallow following statements; those cascading forms were documented as limitations. Extended `make test-recovery` to include `valid_*.txt`. `node_modules/.bin/tree-sitter test` passes 91/91 cases with CLI 0.27.2; `make test-recovery` passes 49/49 cases.
- Phase 4 — Error recovery: added `test/corpus/noncascading_errors.txt` with six permanent cases where one malformed token stays local while surrounding declarations and calls still parse. Covered an unexpected token between call arguments, a missing comma between object pairs, a missing object value, a missing comma between array elements, an invalid initializer, and a stray statement token. A probe confirmed that an unclosed quoted string consumes the rest of the file; unfinished calls, missing initializers, and incomplete arrow bodies were already recorded as cascading limitations. Extended `make test-recovery` to include `noncascading_*.txt`. `node_modules/.bin/tree-sitter test` passes 97/97 cases with CLI 0.27.2; `make test-recovery` passes 55/55 cases.
- Phase 4 — Error recovery: added `test/corpus/recovery_limitations.txt` with fifteen permanent known-limitation regressions covering bare `!`, missing function bodies, imports without sources, unterminated quoted strings, untagged templates at exact EOF, unfinished template substitutions, missing object and call delimiters, nested missing delimiters, nested calls at EOF, and incomplete constructs that consume the next declaration keyword. These trees document current weak recovery and are not expected-good recovery. Refined the earlier cascade description: unfinished calls, missing initializers, and incomplete arrows consume the following declaration keyword, while an unclosed string consumes the rest of the file. Extended `make test-recovery` to include `recovery_*.txt`. `node_modules/.bin/tree-sitter test` passes 112/112 cases with CLI 0.27.2; `make test-recovery` passes 70/70 cases.
- Phase 4 — Incremental parsing: defined 13 editing sequences in `test/fixtures/incremental_sequences.json` using `test/fixtures/test.strdl` and `test/fixtures/test-local.strdl`. Sequences cover insertion, deletion, replacement, nested edits, and temporary malformed states; each edit is a current-source replacement with an occurrence index. Documented the catalog in `docs/incremental-editing-sequences.md` and linked it from `docs/README.md`. Validated that all edits apply and all 13 final sources parse cleanly with `tree-sitter parse --quiet`; both repair sequences produce a `MISSING ")"` intermediate state. Equivalence harness and procedure documentation remain pending.
- Phase 4 — Incremental parsing: added `scripts/test_incremental.py` and `make test-incremental` with `INCREMENTAL_FILTER` support. The harness replays recorded edits with `tree-sitter parse --edits`, writes the final source, and diffs normalized CST output against a fresh parse. Insertion coverage passes 3/3 sequences: method-chain insertion, declaration insertion, and call-statement insertion. The full catalog also passes 13/13. Documented harness usage in `docs/incremental-editing-sequences.md`; no grammar change was required.
- Phase 4 — Incremental parsing: verified deletion equivalence with `make test-incremental INCREMENTAL_FILTER=deletion`. Added `argument-deletion` and `object-property-deletion` to `test/fixtures/incremental_sequences.json`, bringing deletion coverage to five distinct CST shapes: whole declaration, labeled statement, chain method, call argument, and nested object property. Deletion subset passes 5/5; full catalog passes 15/15. Updated `docs/incremental-editing-sequences.md`; no grammar change was required.
- Phase 4 — Incremental parsing: verified replacement equivalence with `make test-incremental INCREMENTAL_FILTER=replacement`. Added `method-name-replacement` to `test/fixtures/incremental_sequences.json`, extending replacement coverage to string contents, template contents, binding identifiers, member-expression method names, and numeric literals. Replacement subset passes 5/5; full catalog passes 16/16. Updated `docs/incremental-editing-sequences.md`; no grammar change was required.
- Phase 4 — Incremental parsing: verified nested-edit equivalence with `make test-incremental INCREMENTAL_FILTER=nested-edit`. Added `nested-call-edit` and `nested-arrow-body-edit` to `test/fixtures/incremental_sequences.json`, extending nested coverage to object literals, nested call arguments, and arrow-function bodies. Nested subset passes 4/4; full catalog passes 18/18. Updated `docs/incremental-editing-sequences.md`; no grammar change was required.
- Phase 4 — Incremental parsing: extended `scripts/test_incremental.py` to compare incremental and fresh trees after every edit, not only the final state. The CLI exits nonzero on malformed parses but still emits a CST, so the harness now detects genuine failures by the presence of a `source_file` node and strips `Parse:`/`Edit:` timing lines. Added `object-brace-repair` and `string-quote-repair`, bringing malformed-state coverage to missing call parentheses, missing object braces, and unterminated strings. Malformed subset passes 4/4 sequences with 4 malformed steps; full catalog passes 20/20 sequences and 27/27 steps. Updated `docs/incremental-editing-sequences.md`; no grammar change was required.
- Phase 4 — Incremental parsing: made final-source equivalence an explicit harness result. `scripts/test_incremental.py` now tracks the last step of each sequence separately and reports `Final-source comparisons: 20/20 passed`. This confirms that every incremental result for the completed source is byte-for-byte equivalent to a fresh parse of the same final source, and that the comparison is automated through the repeatable `make test-incremental` target with optional `INCREMENTAL_FILTER` subsets. No grammar change was required.
- Phase 4 — Incremental parsing: added `docs/incremental-equivalence-procedure.md`, documenting the guarantee under test, authoritative inputs, edit model, step-by-step comparison procedure, CLI parse-error handling, pass/fail rules, output format, current coverage, how to add sequences, and scope limitations. Linked it from the docs index, the sequence catalog, grammar architecture, and CI notes. The incremental-parsing checklist is now complete; no grammar change was required.
- Phase 4 — Closeout: checked all four acceptance criteria after verifying 70 recovery corpus cases across eleven files, 112/112 total corpus cases, `make verify` success with synchronized generated artifacts, no `grammar.js` change during the phase, and incremental/fresh equivalence across 20 sequences, 27 steps, and 20/20 final-source comparisons. Bumped tracked version metadata from 1.3.0 to 1.4.0 and regenerated `src/parser.c` so its embedded language minor version matches. Created local annotated tag `v1.4.0`; the tag was not pushed. Phase 5 work starts from this tag.
- Phase 6 — CI validation: added `.github/workflows/ci.yml` for pull requests and pushes to `main`, with SHA-pinned checkout/setup-node actions and a Node.js 22/24 matrix. Added `make ci`, `docs/ci.md`, the CI badge, and documentation links. `make ci` was run locally and passed generated-artifact, corpus, query, Node binding, and C build checks. Incremental, benchmark, formatting/static, and non-Node binding checks remain deferred.
- Phase 5 — Query audit: audited all 40 `highlights.scm` patterns against `src/node-types.json` and `grammar.js`. All referenced named nodes, fields, and tokens exist; `tree-sitter query` and `make test-query` compiled and executed successfully, while negative controls confirmed compilation rejects invalid node and field names. Recorded fixture capture counts and follow-up findings in `docs/query-audit.md`: overlapping generic captures, broad parameter-container captures, hardcoded Strudel API-name groups, missing `?.` and template-delimiter punctuation coverage, and uneven fixture coverage. No grammar or query change was required for this audit item.
- Phase 5 — Query specificity: removed the generic identifier fallback, all hardcoded Strudel API-name groups, and broad parameter/container captures. `highlights.scm` now uses contextual identifier patterns and direct constructor captures. Added `scripts/check_query_determinism.py` to `make test-query`; it failed a duplicate-capture negative control and passed the committed query with 901 captures across 901 ranges and no duplicate ranges. Updated `docs/query-audit.md` with the scope decision, before/after evidence, and limitations. Remaining work includes capture documentation and fixtures that exercise `?.` and `${`.
- Phase 5 — Capture documentation: added `docs/highlight-captures.md` documenting all 16 current highlight captures, their exact syntactic contexts, determinism rules, scope boundaries, and removed capture names as breaking changes. Linked it from `README.md` and `docs/README.md`, and updated `docs/ci.md`. A targeted probe exposed a latent `${identifier}` overlap between `@variable` and `@expression`; replaced the wildcard template expression pattern with an explicit non-overlapping type list and added `test/query/determinism.strdl` to the determinism check. `tree-sitter parse` reports no errors, and `make test-query` reports 1,096 captures across 1,096 ranges with zero duplicates.
- Phase 5 — Locals audit: audited all 12 `locals.scm` patterns against `src/node-types.json` and executed the query against `test/fixtures/test.strdl`, `test/fixtures/test-local.strdl`, and `test/query/determinism.strdl`. Confirmed that all referenced node types and fields are valid, call identifiers are reference-only, and object keys are emitted as `@local.definition.property` plus `@local.reference`. Recorded import-alias, nested array-pattern, catch-scope, function-name-scope, and blanket-reference findings in `docs/locals-audit.md` and deferred the non-immediate follow-ups. No query change was made for the audit item.
- Phase 5 — Call identifier definitions: added `test/query/call_identifiers.scm` and `scripts/check_locals_definitions_absent.py` to `make test-query`. The grammar-derived check verified 30 call identifier ranges with no `local.definition.*` captures; a negative control adding a call definition pattern failed with `exit=1`. Updated `docs/locals-audit.md` and `docs/ci.md`. No `locals.scm` change was required because the current query already treats call identifiers as references only.
- Phase 5 — Object key definitions: removed `(pair key: (identifier) @local.definition.property)` from `locals.scm` because object property names do not introduce lexical local bindings. Added `test/query/object_keys.scm` covering identifier, string, number, and computed keys, and wired the generic absence checker into `make test-query`. Verified 23 object key ranges with zero definition captures; restoring the removed pattern in a negative control failed with `exit=1`. Updated `docs/locals-audit.md` and `docs/ci.md` and recorded `@local.definition.property` as a breaking locals query API change.
- Phase 5 — Injection evaluation: reviewed Tree-sitter injection semantics, `tree-sitter.json`, the two-query inventory, and evidence D05, D09, D20, D33, S07, S11, S12, S15, S16, S17, E10, C01, and C02. Concluded that no current construct justifies reparsing Strudel source content with another language and that `injection-regex: "^strudel$"` is a host-side declaration rather than a local query requirement. Recorded the evidence, candidate matrix, and revisit conditions in `docs/injections-evaluation.md`; no speculative query file was created.
- Phase 5 — Query compilation tests: added `scripts/check_query_compilation.py` and the `make test-query-compile` target. The checker compiles every official query without source paths and requires negative controls with an invalid node type and invalid field name to fail for the expected reasons. Both official queries compiled; both negative controls were rejected. A temporary invalid query made the checker fail with `exit=1`. `make test-query` now runs the compilation target before execution and semantic checks.
- Phase 5 — Query execution tests: added `scripts/check_query_captures.py`, the `make test-query-execution` target, and grammar-derived probe queries under `test/query/`. The check asserts that every probe-selected range in `test/fixtures/test.strdl`, `test/fixtures/test-local.strdl`, and `test/query/determinism.strdl` receives the expected capture. Verified nine highlight roles and three locals roles; an incorrect expected capture on call identifiers failed with `exit=1`. `make test-query` now runs compilation, execution assertions, and the existing semantic checks.
- Phase 5 — Query registration: registered `locals.scm` in `tree-sitter.json` and the legacy `package.json` metadata alongside `highlights.scm`; no injection or tag query was registered. Exposed `HIGHLIGHTS_QUERY` and `LOCALS_QUERY` from the Python and Rust bindings. Added `scripts/check_query_registration.py` and `make test-query-registration` to verify registration, query-carrying packaging rules, and binding exports. Removing the `locals` registration in a negative control failed with `exit=1`; `npm pack --dry-run --json` listed both query files. `cargo fmt --check` passed, while `cargo check --offline` could not resolve `tree-sitter-language` from the local crate cache.
- Phase 5 — Query documentation: added `docs/queries.md` as the official query-surface entry point and `docs/locals-captures.md` as the authoritative locals capture API reference. Linked both from `README.md` and `docs/README.md`, and cross-linked the existing highlight, locals, query audit, and injection documents. Local Markdown links resolve, `make docs` lists the new documents, and all Phase 5 acceptance criteria are now evidenced.
- Phase 5 — Closeout: checked all five acceptance criteria. `make verify-all` passed generated-artifact sync, 112/112 corpus cases, query compilation, execution assertions, registration checks, determinism checks, and the Node.js binding test before version metadata changed. After the closeout bump, regeneration was stable and `make test`, `make test-query`, and `make test-node` passed; query checks reported 1,096 captures across 1,096 ranges, 30 call identifier ranges, and 23 object key ranges with zero definition-capture failures. Phase 5 made no `grammar.js` or parser-source changes; only version metadata was regenerated at closeout. Bumped tracked version metadata from 1.4.0 to 1.5.0 and created local annotated tag `v1.5.0`; the tag was not pushed. Phase 6 work starts from this tag.
- Phase 6 — Test strategy index: added `docs/test-strategy.md` as the index of test layers, `make` command map, fixtures and scripts, extension procedures, and current coverage gaps. Linked it from `README.md`, `docs/README.md`, and `docs/ci.md`, and marked the Phase 6 checklist item complete. Checked 86 local Markdown links across the changed docs with no broken targets; `make docs` lists the new document, `make test-recovery` passes, and `git diff --check` passes. No test behavior changed.
- Phase 6 — Valid syntax corpus: added `test/corpus/valid_syntax_expansions.txt` with four evidence-backed cases covering quoted and computed object keys with nested objects and trailing commas (D22, M16), nested arrays as call arguments (D19, E06, M15), optional member and subscript chaining (S17, M26), and a ternary condition inside template interpolation (S11, M29). Generating the last tree exposed that `grammar.js` declared named precedence levels in ascending order although Tree-sitter requires descending order, producing inverted trees such as `a + b * c` as `(a + b) * c` and `a > b ? c : d` as `a > (b ? c : d)`. Reversed the precedence list, regenerated `src/grammar.json` and `src/parser.c`, corrected the affected expectations in `precedence.txt` and `incomplete_expressions.txt`, added a standalone comparison-condition regression to `operators.txt`, and documented the CST change in `grammar-architecture.md`. The full corpus passes 117/117 cases. This fixes public CST shapes for mixed-operator expressions and is recorded as a breaking syntax-tree behavior correction.
- Phase 6 — Malformed and incomplete corpus: added `test/corpus/malformed_expansions.txt` with twelve permanent cases covering chained and optional subscripts with missing closing brackets, a missing formal-parameter parenthesis, doubled commas in formal and arrow parameters and an array literal, a missing comma between object pairs inside a call, a missing object value inside a call, missing ternary consequence and colon inside calls, a missing parenthesized-expression closing parenthesis in a declaration, and a missing comma in an array binding pattern. Each case preserves the surrounding declaration, call, array, object, or function node and localizes the malformed region as `MISSING` or `ERROR`. Probes that collapse to a root `ERROR` or consume following statements—missing subscript indexes, a missing ternary alternative in declaration position, an unfinished `try`, and a trailing-comma parameter list without a body—were not promoted to expected-good cases; existing limitation regressions remain authoritative. Derived expected trees from the Node binding because `tree-sitter test --update` refuses to auto-accept trees containing `ERROR` or `MISSING`. The filtered corpus passes 12/12 cases, `make test-recovery` passes 86/86 cases, and the full corpus passes 129/129 cases. No grammar change was required.
- Phase 6 — Modern JavaScript construct coverage: audited every grammar production against the corpus and added `test/corpus/modern_javascript_constructs.txt` with seventeen valid cases. The new cases cover `try`/`catch` without a binding, valueless `return`, array destructuring declarations with nested patterns and trailing commas, multiple and trailing-comma formal parameters, array-valued default parameters, bare array-pattern arrows, named imports with aliases and trailing commas, exported function declarations, member and subscript assignment targets, all eight comparison and equality operators, right-nested ternaries, `new` without arguments and with member/subscript constructors, empty objects and arrays, numeric object keys, escaped quotes, and an escaped template dollar. Generated and reviewed all expected trees in an isolated copy before installing the corpus file. The filtered corpus passes 17/17 cases and the full corpus passes 146/146 cases. No grammar change was required.
- Phase 6 — Nested expressions and method chains: added `test/corpus/nested_expressions_and_method_chains.txt` with eleven valid cases covering parenthesized call receivers, subscript receivers, optional method chains, computed indexes containing calls, tagged-template receivers, top-level `await` chains, call-on-call results, precedence-sensitive arithmetic arguments, conditional arguments, nested object/array arguments, and deeply nested call arguments. Generated and reviewed all expected trees in an isolated copy before installing the corpus file. The filtered corpus passes 11/11 cases and the full corpus passes 157/157 cases. While generating trees, the local Node binding was found to be stale relative to the regenerated parser; rebuilt it from the current `src/parser.c` and added a precedence-sensitive parse assertion to `bindings/node/binding_test.js` so binding tests verify current CST behavior rather than only loading the addon. No grammar change was required.
- Phase 6 — Query compilation and capture tests: audited `make test-query` and expanded `make test-query-execution` from 12 to 25 assertions so every official capture name is covered at least once: all 16 `highlights.scm` captures and all 5 `locals.scm` captures. Added grammar-derived probe queries for keywords, delimiter and bracket punctuation, operators, comments, function declaration names, member properties, expression nodes, constructors, scopes, assignment definitions, and catch parameters. Added a permanent wrong-capture negative control to `test-query-execution`; it fails when the expected capture name is absent. `make test-query` passes with both official queries compiled, 25 role assertions, both compilation negative controls rejected, the wrong-capture negative control rejected, and 1,096 deterministic captures across 1,096 ranges. A capture-name coverage check confirmed that all 21 official capture names appear in execution assertions, with no unasserted or spurious names. No query or grammar change was required.
- Phase 6 — Incremental parsing tests: audited `make test-incremental` and the 20-sequence catalog, then added `array-bracket-repair` to cover a temporary missing `]` inside a nested `arrange` argument. The harness now validates catalog structure (unique IDs, known fixtures, non-empty edit lists) and rejects sequences whose final source still contains `ERROR` or `MISSING`, in addition to per-step incremental/fresh CST equivalence. The full catalog passes 21/21 sequences, 29/29 steps, and 21/21 clean final-source comparisons, with 5 malformed intermediate steps. Negative controls in an isolated copy confirmed that duplicate IDs and a malformed final source are rejected. Updated both incremental docs and the test-strategy index; no grammar change was required.
- Phase 6 — Node.js binding tests: expanded `bindings/node/binding_test.js` from two tests to seven. In addition to loading the addon and checking the precedence-sensitive tree, the suite now verifies that `nodeTypeInfo` equals the generated `src/node-types.json`, reads representative declaration/call/member fields through the public node API, preserves a string argument around an incomplete call with a synthesized `)`, executes a grammar-derived query, and compares an incrementally reparsed tree with a fresh parse after replacing a numeric literal. `make test-node` passes 7/7 tests. Updated the test-strategy index and CI description; no binding, query, or grammar change was required.
- Phase 6 — Generated-artifact consistency: audited `make check-generated` and hardened it to compare regenerated `src/parser.c`, `src/grammar.json`, `src/node-types.json`, and `src/tree_sitter` against `HEAD` instead of only the index, so staged generated changes cannot pass silently. The clean gate passes. An isolated negative copy changed the `catch` grammar token to `catching`, regenerated artifacts, and failed with `exit=2` and `Generated artifacts are out of sync; run 'make generate'.` Updated `docs/ci.md` and `docs/test-strategy.md`; no grammar or generated artifact changed in the working tree.
- Phase 6 — Package integrity: added `scripts/check_package_integrity.py` and `make test-package`, included in `verify-all` and therefore `make ci`. The checker runs `npm pack --dry-run --json --ignore-scripts`, verifies name/version/license consistency with `tree-sitter.json`, checks a 17-file required set, rejects 12 forbidden artifact patterns, and compares every packed file size against the local file. The baseline pack exposed `src/parser.o` from the broad `src/**` allowlist; `package.json` now lists generated sources explicitly and the packaged surface is 18 files. An isolated negative copy restoring `src/**` failed with `exit=1` and reported both the broad pattern and `src/parser.o`. Updated CI and test-strategy documentation. No grammar change was required.
- Phase 6 — Regression coverage: audited discovered defects and added `test/fixtures/regression_inventory.json`, `scripts/check_regression_coverage.py`, and `make test-regressions` in `verify` and therefore `make ci`. The inventory records 14 bugs with 61 permanent regression assertions and 3 documented exclusions, covering parser, recovery, query, binding, incremental, build-gate, packaging, and test-tooling defects. The checker validates case and test names, artifact existence, required or absent text, and unique IDs across both sections. A temporary manifest negative control renamed one corpus case and failed with `exit=1`. Added `docs/regression-coverage.md` and linked it from the documentation indexes, test strategy, CI notes, and README. This satisfies the Phase 6 acceptance criterion that no known correctness regression remains untracked. No grammar change was required.
- Phase 6 — Benchmark fixtures: added `benchmarks/fixtures/manifest.json`, `scripts/generate_benchmark_fixtures.py`, and `make benchmark-fixtures` / `make check-benchmark-fixtures`, with the check included in `verify` and `make ci`. The manifest records five fixtures totaling 107,480 bytes: two committed representative compositions, a 2,000-declaration synthetic document, a 512-deep call chain, and a 300-block malformed stress input. Generated fixtures derive from a fixed seed and explicit parameters; the checker verifies byte size, SHA-256, and exact regeneration. All four clean fixtures parse with CLI 0.27.2, and the pathological fixture exits nonzero with 498 `ERROR` nodes. A negative control appending a newline to the deep fixture failed with `exit=1` and passed after restoration. Added `docs/benchmarking.md` and linked it from the documentation indexes, test strategy, CI notes, and README. No grammar change was required.
- Phase 6 — Representative compositions: closed the fixture-selection item using the representative entries in `benchmarks/fixtures/manifest.json`. `test/fixtures/test.strdl` and `test/fixtures/test-local.strdl` are the canonical fixtures used by query execution (`Makefile` `FIXTURES`) and the incremental catalog (`test/fixtures/incremental_sequences.json`), and both parse cleanly with CLI 0.27.2. A temporary manifest negative control that changed `representative-main` SHA-256 failed with `exit=1`. Latency measurement remains a separate roadmap item; no grammar change was required.
- Phase 6 — Synthetic large documents: closed the fixture-selection item using `benchmarks/fixtures/generated/synthetic-large.strdl`, generated from the manifest's fixed seed and `declarations: 2000` parameter. The 95,393-byte fixture contains exactly 2,000 generated declarations and parses cleanly with CLI 0.27.2. A temporary manifest negative control that changed the declaration count to 1,999 failed with `exit=1` because the committed file no longer regenerated from the manifest parameters. Latency measurement remains a separate roadmap item; no grammar change was required.
- Phase 6 — Deeply nested expressions: closed the fixture-selection item using `benchmarks/fixtures/generated/deeply-nested.strdl`, generated from the manifest's `depth: 512` parameter. The 1,639-byte fixture contains a 512-level `s(` call chain around `note("c3")` and parses cleanly with CLI 0.27.2. A temporary manifest negative control that changed the depth to 511 failed with `exit=1` because the committed file no longer regenerated from the manifest parameters. Latency measurement remains a separate roadmap item; no grammar change was required.
- Phase 6 — Pathological input: closed the fixture-selection item using `benchmarks/fixtures/generated/pathological.strdl`, generated from the manifest's `blocks: 300` parameter and marked `expected_clean: false`. The 7,447-byte fixture contains exactly 300 malformed blocks, exits nonzero, and produces 498 `ERROR` nodes with no `MISSING` nodes under CLI 0.27.2, as intended for stress testing. A temporary manifest negative control that changed the block count to 299 failed with `exit=1` because the committed file no longer regenerated from the manifest parameters. Latency measurement remains a separate roadmap item; no grammar change was required.
- Phase 6 — Fresh parsing latency: added `scripts/bench_fresh.js` and `make bench-fresh`, with `BENCH_ITERATIONS`, `BENCH_WARMUP`, `BENCH_FIXTURE`, and `BENCH_OUTPUT` overrides. The harness validates fixture hashes and `expected_clean`, times only `Parser.parse`, and reports min, mean, P50, P95, P99, and max in milliseconds. A 15-iteration run on Node v26.13.1, tree-sitter 0.25.1, linux/x64 with 24 logical CPUs produced P99 values of 0.549940 ms for representative-main, 0.039735 ms for representative-local, 10.427943 ms for synthetic-large, 0.415580 ms for deeply-nested, and 2.034242 ms for pathological. Negative controls for a wrong SHA-256 and a flipped `expected_clean` both failed with `exit=1`; a filtered JSON report was written and validated. This is a measurement tool, not a committed baseline or CI gate. No grammar change was required.
- Phase 6 — Incremental parsing latency: extracted shared benchmark helpers into `scripts/bench_common.js`, refactored `scripts/bench_fresh.js` onto them, and added `scripts/bench_incremental.js` with `make bench-incremental`. It replays the 21-sequence catalog with `BENCH_ITERATIONS`, `BENCH_WARMUP`, `BENCH_SEQUENCE`, `BENCH_CATEGORY`, and `BENCH_OUTPUT` overrides, times `tree.edit` plus incremental `Parser.parse`, and reports min, mean, P50, P95, P99, and max per step and per replay. Every step is compared with a fresh parse, and final `hasError` is checked against the manifest. A 15-replay run on Node v26.13.1, tree-sitter 0.25.1, linux/x64 with 24 logical CPUs covered 29 steps and 435 fresh comparisons with no mismatch; replay-total P99 values ranged from 0.010771 ms for compact-set-cps to 0.414387 ms for method-chain-insertion. A catalog negative control with `occurrence: 99` and a manifest negative control with a wrong SHA-256 both failed with `exit=1`; filtered JSON and category controls produced valid reports. This is a measurement tool, not a committed baseline or CI gate. No grammar change was required.
- Phase 6 — Memory consumption: added `scripts/bench_memory.js` and `make bench-memory`, with `BENCH_MODE`, `BENCH_ITERATIONS`, `BENCH_WARMUP`, `BENCH_FIXTURE`, `BENCH_SEQUENCE`, `BENCH_CATEGORY`, and `BENCH_OUTPUT` overrides. The harness runs Node with `--expose-gc`, forces GC around retained parse trees, reports V8 heap/RSS deltas and sampled peaks, and compares every incremental step with a fresh parse. A 15-iteration run on Node v26.13.1, tree-sitter 0.25.1, linux/x64 with 24 logical CPUs covered 5 fresh fixtures and 21 incremental sequences; retained heap per tree was 183–870 bytes for fresh fixtures and 282–2,291 bytes for incremental replays. Negative controls without `--expose-gc`, with an invalid catalog occurrence, with a wrong fixture SHA-256, and with an invalid mode all failed with `exit=1`; filtered JSON and category controls produced valid reports. Heap values are JS heap after GC, while native tree memory is reflected primarily in process RSS, so results are not baselines or CI gates. No grammar change was required.
- Phase 6 — Percentile reporting: closed the item by adding a dedicated `Percentile reporting` section to `docs/benchmarking.md`. Separate `BENCH_OUTPUT` reports were generated for fresh and incremental parsing; they contain five fresh fixture stats and 21 incremental replay-total stats respectively, with finite P50/P95/P99/max values ordered `P50 <= P95 <= P99 <= max`. The section records the interpolation method, the distinction between fresh parse samples and incremental replay totals, and one observed table for each mode without treating them as baselines. Temporary report copies with a deleted fresh `p95Ms` and a null incremental `p50Ms` failed validation with `exit=1`. No harness or grammar change was required.
- Phase 6 — Benchmark environment: added a dedicated `Benchmark environment` section to `docs/benchmarking.md` with OS, kernel, CPU, memory, Node/V8/OpenSSL, npm, Tree-sitter CLI/runtime, package, and commit details, plus reproduction commands. A generated `BENCH_OUTPUT` report reproduced the runtime subset exactly, and the remaining values were checked against system and runtime sources. A temporary report copy with `cpuCount` changed to 23 failed validation with `exit=1`. The record notes that measurements were taken under normal desktop load without CPU affinity or workload isolation. No harness or grammar change was required.
- Phase 6 — Baseline results: added `benchmarks/results/baseline.json`, `scripts/baseline_results.js`, `make build-benchmark-baseline`, and `make check-benchmark-baseline`. The 67,191-byte version-1 artifact records one coherent 15-sample/two-warmup session at commit `aae76dc` with five fixtures, 21 sequences, 29 edit steps, raw latency samples, full memory results, source metadata, and the basic environment. `make check-benchmark-baseline` is wired into `make verify` and `make ci` as a structural check only; it enforces no performance threshold. Negative controls that changed the version, nulled a fresh P50, removed a fixture, changed the baseline CPU count, invalidated a source timestamp, changed a memory result mode, and changed a source environment all failed with `exit=1`; the committed artifact contains no machine-specific paths. No grammar or generated-parser change was required.
- Phase 6 — Regression investigation: added a `compare` command to `scripts/baseline_results.js` and `make compare-benchmark-baseline` as a local-only workflow. It validates the baseline and three current reports, records environment/configuration agreement, pairs every fresh/incremental latency and memory metric with baseline/current values, deltas, and ratios, and lists increases as investigation candidates without thresholds or pass/fail status. A new full session matched the baseline environment and configuration but reported 80 increases; `make ci` passed and no parser-surface files changed from `aae76dc` to `HEAD`. Isolated reruns of the largest increases preserved CST checksums and minimum latencies while raising only outlier maxima; memory per-tree values stayed stable or moved by allocator-sized RSS steps. The increases were treated as run-to-run variance under normal desktop load, not a code regression. Negative controls produced `environmentComparison.matches: false` and `configComparison.matches: false` with `exit=0`, while a null fresh P50 and a tampered baseline version failed with `exit=1`. No grammar or generated-parser change was required.
- Phase 6 — Performance budgets: added `scripts/benchmark_budgets.js`, `benchmarks/results/budgets.json`, `make build-benchmark-budgets`, and `make check-benchmark-budgets`. After the user selected the observed-envelope rule, two additional complete measurement sessions were run on the same environment and configuration as the committed baseline. Budgets use the highest observed P50 and P95, the highest single sample for P99, and highest observed memory values across the three sessions; each budget records its observations and source session. The 51,511-byte artifact covers all 52 cases and contains no `/tmp/` paths. `make check-benchmark-budgets` is part of `make verify` and `make ci` as a structural check only; no current timing is gated. Negative controls failed with `exit=1` for a changed version, a non-maximum budget, a wrong source session, a removed case, shortened observations, a tampered top-level environment, a tampered session environment, a build-time session environment mismatch, and a build-time configuration mismatch. No grammar or generated-parser change was required.
- Phase 6 — Failure classification: added a `classification` object to comparison reports with `correctness.gates: true`, `performance.gates: false`, the gating guards, and structured non-gating warning counts and fields for environment mismatches, configuration mismatches, and observed increases. The CLI prints the gating policy and non-gating warning count. Documentation in `docs/benchmarking.md`, `docs/test-strategy.md`, and `docs/ci.md` now states that all `make ci` checks are correctness gates while timing deltas are non-gating warnings. A report with 80 increases and matching metadata exited `0`; CPU-count and warmup mismatch controls also exited `0` with the corresponding warning fields populated. A corrupted current report exited `1` and wrote no comparison. Benchmark guard controls with a tampered fixture hash and a tampered edit occurrence exited `1`. No grammar or generated-parser change was required.
- Phase 6 — Incremental tests in CI: added `test-incremental` to `make verify`, so `make ci` and both Node 22/24 CI matrix jobs run the complete CLI-level incremental/fresh equivalence catalog. The harness uses only Python standard-library modules and the pinned Tree-sitter CLI installed by `npm ci`. A clean run completed in 1.372 s with 21/21 sequences, 29 steps, 5 malformed intermediates, and 21/21 final-source comparisons. Temporary catalog negative controls with a duplicate sequence ID and an unknown fixture key both exited nonzero (`2`), confirming the gate rejects catalog invariant violations. Documentation now states that the unfiltered catalog is gating while `INCREMENTAL_FILTER` remains a local convenience. No grammar or generated-parser change was required.
- Phase 6 — Formatting and static checks in CI: installed pinned Prettier `3.10.1` as a dev dependency and pinned Ruff `0.17.6` in `requirements-dev.txt`, with `.prettierrc.json`, `.prettierignore`, and `[tool.ruff]` configuration. Added `make format`, `make check-format`, `make check-static`, and `make install-dev`, wired the two check targets into `make verify`/`make ci`, and added a pinned `.venv` install step to the GitHub Actions workflow. Generated parser files, benchmarks, fixture payloads, lockfiles, and `AGENTS.md` are excluded from formatting. The one-time format pass changed style only across non-generated sources and applied one safe Ruff fix; grammar, generated parser artifacts, queries, and test fixtures are unchanged. `make format`, `make check-format`, `make check-static`, and `make ci` all passed. Negative controls with misformatted JS and Python files, an unused import, and invalid shell syntax each failed the corresponding gate and passed after restoration. No grammar or generated-parser change was required.
- Phase 6 — Hardware-variance-aware reporting: added `scripts/performance_report.js`, `make performance-report`, and a Node 24 CI step after `make ci`. The report reuses baseline comparison and observed-envelope budgets, checks comparability against both the baseline and budget sessions, and evaluates 182 metrics (5 fresh and 21 incremental latency cases times P50/P95/P99, plus 5 and 21 memory cases times four retained/peak metrics). A clean comparable session reported 139 within-envelope, 43 above-envelope, and 0 non-comparable metrics with exit `0`; above-envelope values remain warnings. CPU-count and warmup mismatch controls reported `cpuCount`/`warmup` differences with all 182 verdicts non-comparable and exit `0`. A corrupted fresh report and a budget missing a case each exited `1` and wrote no report. `make performance-report`, 138 local Markdown links, and `make ci` passed. A follow-up made stdout TTY-aware with `auto`/`terminal`/`markdown`/`json` formats and `NO_COLOR` support while keeping Markdown for CI logs and `--output`; explicit formats, a pseudo-terminal auto detection control, and file outputs were verified. A follow-up shared the terminal helpers with `bench-fresh`, `bench-incremental`, and `bench-memory`; pseudo-terminal runs showed compact case summaries while redirected output kept the original fixed-width tables. A further follow-up added a stdlib-only Python helper to every custom check/test script. Pseudo-terminal runs appended compact status summaries to query compilation, query execution, registration, determinism, locals-definition, package, regression, benchmark-fixture, and incremental-equivalence checks; redirected output and failure diagnostics were unchanged, and `NO_COLOR` removed all ANSI sequences. No grammar or generated-parser change was required.
- Phase 6 — Automatic test-layer verification: audited the CI workflow and `make` aggregate targets against the test-strategy index. `.github/workflows/ci.yml` parses successfully, runs `make ci` on the Node 22 and 24 matrix, and runs `make performance-report` on Node 24 after the gate. `make ci` was executed locally with exit `0` and covered generated-artifact sync, formatting, static analysis, full corpus including recovery cases, unfiltered incremental/fresh equivalence, every query layer, regression inventory, benchmark fixture/baseline/budget structural checks, Node.js binding behavior, npm package integrity, and the C library build. Non-Node binding validation remains an explicit Phase 7 gap. No grammar, generated-parser, or workflow change was required.
- Phase 6 — Baseline reproduction: committed the three original source reports under `benchmarks/results/baseline-sources/` and added `scripts/baseline_results.js reproduce` plus `make reproduce-benchmark-baseline`, wired into `make verify` and therefore `make ci`. The command rebuilds from the committed reports using the baseline's recorded commit and generation timestamp and requires exact structural equality with `benchmarks/results/baseline.json`. A clean reproduction exited `0`; tampering with a source report timestamp failed with `exit=1` and the explicit mismatch message. The source reports contain no `/tmp/` paths. Updated the benchmarking, test-strategy, and CI docs. No grammar or generated-parser change was required.
- Phase 7 — Clean Node.js binding build: added `scripts/check_node_clean_build.py` and `make test-node-clean-build`, wired into `verify-all` and therefore `make ci`. The checker copies only tracked working-tree files into a temporary clean directory, rejects pre-existing `build/`, `node_modules/`, `prebuilds/`, and compiled artifacts, runs `npm ci --offline` from the existing npm cache, verifies the generated parser files remain byte-identical, requires the compiled addon, and runs `npm test` in that directory. A clean run copied 154 tracked files, compiled `build/Release/tree_sitter_strudel_binding.node`, and passed all seven binding tests with `exit=0`. An earlier version of the artifact check that counted the node-gyp `obj.target` intermediate as a second addon failed with `exit=1`; the checker now excludes that intermediate and accepts the single release addon. Updated CI, test-strategy, compatibility, and README documentation. No grammar or generated-parser change was required.
- Phase 7 — Generated parser runtime: added `scripts/check_generated_runtime.py` and `make test-generated-runtime`, wired into `verify-all` and therefore `make ci`. The checker copies only runtime sources and committed generated artifacts, explicitly omits `grammar.js`, `scripts/`, `test/`, `benchmarks/`, and the Tree-sitter CLI, removes development and peer dependencies from the temporary package, installs the pinned tree-sitter runtime from the existing npm cache with `npm install --offline`, verifies the generated files remain byte-identical, and parses both representative fixtures through the compiled addon. A clean run parsed `test/fixtures/test.strdl` and `test/fixtures/test-local.strdl` with `exit=0`. Temporary negative controls that injected `grammar.js` or a `tree-sitter-cli` dependency into the runtime copy were rejected with `exit=1`. The two representative compositions were moved from the repository root to `test/fixtures/`, and all manifest, catalog, inventory, Makefile, script, and documentation references were updated. Updated CI, test-strategy, compatibility, and README documentation. No grammar or generated-parser change was required.
- Phase 7 — C binding audit: added [binding audit](binding-audit.md#c-binding--audited-2026-11-26) with implementation, build, metadata, test, and distribution findings plus a C-specific retention decision. Verified that the header and generated parser agree on `tree_sitter_strudel()` and ABI 15, that `make build` produces static/shared libraries and pkg-config metadata, and that a clean tracked-source CMake 4.5.1 configure/build/install produces the shared library, header, metadata, and queries. Added `test/c/binding_test.c`, `scripts/check_c_binding.py`, and `make test-c`, wired into `verify-all` and therefore `make ci`; a clean check compiled and linked the symbol and confirmed a non-null language pointer with `exit=0`. A temporary negative control using an undefined symbol failed with `exit=1`. Recorded deferred gaps: npm does not publish the C binding, Makefile/CMake versions are `1.3.0` versus `1.5.0` in package metadata, the tracked pkg-config file is stale, CMake can regenerate `src/parser.c` in-tree, and `cmake --install --prefix` does not rewrite the configured pkg-config prefix. Updated CI, test-strategy, compatibility, README, and binding-audit documentation. No grammar or generated-parser change was required.
- Phase 7 — Go binding audit: added [Go audit](binding-audit.md#go-binding--audited-2026-11-26) covering cgo implementation, shallow load test, `tree-sitter.json` metadata, module state, ABI declaration, and distribution exposure. Confirmed that only `binding.go` and `binding_test.go` are tracked and that no `go.mod` or `go.sum` exists in the working tree or Git history. The recorded Go 1.27.4 / `go-tree-sitter` 0.25.0 temporary-module pass remains the only execution evidence; it was not repeated because no Go toolchain is installed, and installing one would require explicit approval. Retained Go as a source-level, source-only binding; adding module metadata, a Go CI leg, or disabling the binding is deferred pending an explicit compatibility and distribution decision. Updated compatibility, repository-assessment, roadmap, and test-strategy documentation. No code, grammar, or generated-parser change was required.
- Phase 7 — Python binding audit: added [Python audit](binding-audit.md#python-binding--audited-2026-11-26) covering the capsule API, setuptools build, PyPI packaging, typed query exports, and the existing shallow load test. Added `scripts/check_python_binding.py` and `make test-python`, wired into `verify-all` and therefore `make ci`. The checker builds the extension into a temporary tree with `--egg-base` isolated from the checkout, verifies `language()` returns a `PyCapsule` named `tree_sitter.Language` with a non-null pointer, and loads both official query exports. A missing-capture negative control failed with `exit=1`. Retained the Python binding as an officially distributed integration; recorded version mismatch, optional runtime dependency, and shallow behavioral coverage as deferred gaps. Updated CI, compatibility, repository-assessment, roadmap, README, and test-strategy documentation. No grammar or generated-parser change was required.
