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

Phase 2 is complete and tagged `v1.3.0`. Phase 3 evidence collection, the sourced coverage matrix, and the evidence-driven structured refactor are complete. Phase 4 is complete and tagged `v1.4.0`; the next work is Phase 5 queries.

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
- [ ] Add query documentation under `docs/`.

### Phase 5 acceptance criteria

- [ ] Every official query compiles and executes against representative fixtures.
- [ ] Capture names and meanings are documented.
- [ ] Query behavior matches the public syntax-tree API.
- [ ] Queries avoid editor-specific assumptions and semantic-analysis responsibilities.
- [x] Packaged queries are present in published package contents.

---

## Phase 6 — Testing and performance

**Deliverable:** measurable correctness and performance standards.

### Multi-layer testing

- [ ] Create a documented test strategy index.
- [ ] Expand corpus tests for valid syntax.
- [ ] Expand corpus tests for malformed and incomplete code.
- [ ] Add tests for every supported modern JavaScript construct.
- [ ] Add tests for nested expressions and method chains.
- [ ] Add query tests for compilation and captures.
- [ ] Add incremental parsing tests.
- [ ] Add Node.js binding tests.
- [ ] Add generated-artifact consistency checks.
- [ ] Add package integrity checks.
- [ ] Ensure every discovered bug produces a regression test.

### Performance infrastructure

- [ ] Create reproducible benchmarking fixtures.
- [ ] Use representative Strudel compositions.
- [ ] Use synthetic large documents.
- [ ] Use deeply nested expressions.
- [ ] Use pathological input for stress testing.
- [ ] Add fresh-parsing latency measurement.
- [ ] Add incremental-parsing latency measurement.
- [ ] Add memory-consumption measurement.
- [ ] Record P50, P95, and P99 separately for fresh and incremental parsing.
- [ ] Record benchmark hardware and software environment.
- [ ] Store baseline results in the repository.
- [ ] Investigate regressions rather than ignoring them.
- [ ] Establish performance budgets only after realistic baselines exist.
- [ ] Distinguish correctness failures from performance warnings.

### CI validation

- [x] Run grammar generation in CI.
- [x] Check generated-file consistency in CI.
- [x] Run corpus tests in CI.
- [x] Run query tests in CI.
- [x] Run Node.js binding tests in CI.
- [ ] Run incremental parsing tests in CI.
- [ ] Run formatting and static checks in CI.
- [x] Run compatibility checks in CI (Node.js 22 and 24 matrix).
- [ ] Run performance checks with hardware-variance-aware reporting.

See [CI](ci.md) for the workflow, commands, and remaining gaps.

### Phase 6 acceptance criteria

- [x] Test layers and commands are documented.
- [ ] All required test layers run automatically.
- [ ] Baselines are reproducible and committed.
- [ ] Performance budgets, if any, are based on measured baselines.
- [ ] No known correctness regression remains untracked.

---

## Phase 7 — Packaging and compatibility

**Deliverable:** an independently distributable grammar package.

### Node.js and bindings

- [ ] Verify the Node.js binding build from a clean environment.
- [x] Run Node.js binding tests.
- [ ] Verify generated parser files are usable without regeneration.
- [ ] Audit the C binding.
- [ ] Audit the Go binding.
- [ ] Audit the Python binding.
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
- [ ] Add query documentation with capture names and conventions.
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
- Phase 1 — Establish representative and stress fixtures: used `test.strdl` plus temporary generated large, deep, malformed, x10, and x100 fixtures with recorded generation commands on 2026-11-25; evidence: [docs/repository-assessment.md](repository-assessment.md#fixtures).
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
- Phase 2 — Query compilation: `node_modules/.bin/tree-sitter query --quiet --grammar-path . queries/highlights.scm test.strdl` and the equivalent `locals.scm` command completed successfully with CLI 0.27.2.
- Phase 2 — Representative fixture: `node_modules/.bin/tree-sitter parse test.strdl` produced no `ERROR` or `MISSING` nodes after regeneration.
- Phase 2 — Version tag: aligned tracked version metadata to `1.3.0` and created annotated tag `v1.3.0` on 2026-11-25; no tag was pushed.
- Phase 3 — Official documentation evidence: collected 33 syntax examples from Codeberg `uzu/strudel` `website/src/pages/**/*.mdx`, imported package docs, `website/src/examples.mjs`, and `packages/web/README.md` on 2026-11-25; each example is linked to its source in [syntax-evidence.md](syntax-evidence.md). Only user-facing Strudel/JavaScript code was collected; MDX infrastructure and mini-notation internals were excluded.
- Phase 3 — Source/runtime evidence: inspected `packages/transpiler` (`transpiler.mjs`, `index.mjs`, four plug-ins, `test/transpiler.test.mjs`) and `packages/core` (`evaluate.mjs`, `repl.mjs`) from Codeberg `main` on 2026-11-25; recorded 18 S-IDs in [syntax-evidence.md](syntax-evidence.md). Confirms Acorn `ecmaVersion: 2022` with `allowAwaitOutsideFunction: true`, label rewriting, mini/tag plug-ins, and observed ternary/template-interpolation inputs. The commented-out destructuring/`import()` test is marked inactive evidence.
- Phase 3 — Examples/tutorials evidence: inspected `examples/codemirror-repl/tunes.mjs`, `examples/minimal-repl/tune.mjs`, `test/testtunes.mjs`, `website/src/repl/tunes.mjs`, and tutorial pages `learn/lfo.mdx`, `learn/mondo-notation.mdx`, `recipes/arpeggios.mdx`, `understand/cycles.mdx`, and `workshop/motors.mdx` from Codeberg `main` on 2026-11-25; recorded 18 E-IDs in [syntax-evidence.md](syntax-evidence.md). Adds active evidence for `new` expressions, two-parameter arrows, unary minus, nested object/array literals, and member calls on string literals. Object spread and logical OR occur only in commented-out fixtures (E18).
- Phase 3 — Community evidence: checked repository activity via the GitHub API and inspected user-facing pattern/helper code from `Coriou/strasbeat`, `edcrub/edcrub.github.io`, and `calvinw/strudel-llm-docs`, plus the dated GoSuraj GSB post, on 2026-11-25; recorded seven C-IDs in [syntax-evidence.md](syntax-evidence.md). Adds active evidence for `var`, assignment statements, `export default`, named `function` declarations with default parameters, array destructuring in arrow parameters, object spread, and `try`/`catch`.
- Phase 3 — Coverage matrix: recorded M01–M45 with evidence IDs, current status, grammar/corpus audit, next action, intentional exclusions, and deferred constructs in [syntax-coverage-matrix.md](syntax-coverage-matrix.md) on 2026-11-25.
- Phase 3 — Audit current coverage: inspected `grammar.js`, `src/node-types.json`, and committed corpus tests at `2d9b706`, then parsed 43 temporary probes under `/tmp/opencode/coverage-probes` with `node_modules/.bin/tree-sitter parse` using CLI 0.27.2 on 2026-11-25. Error-free `await`, `new`, `export const`, `export default`, and tagged-template probes were reviewed with `--cst` and classified as structurally missing. No grammar or generated files changed.
- Phase 3 — Structured grammar refactor: replaced wrapper-heavy expression/statement rules with composable JavaScript-like rules, added named fields, explicit parenthesized/interpolation nodes, and seven justified GLR conflicts on 2026-11-25. Regenerated with `node_modules/.bin/tree-sitter generate` using CLI 0.27.2. `src/node-types.json` changed from 20 named nodes/7 fields to 40 named nodes/31 fields; the public CST change is documented in [grammar-architecture.md](grammar-architecture.md).
- Phase 3 — Corpus and query validation: `node_modules/.bin/tree-sitter test --update` rewrote all prior expected trees and added 28 cases; three unsupported logical/nullish operator cases were then removed, leaving 25 net new cases. A final `node_modules/.bin/tree-sitter test` passed 42/42 cases with CLI 0.27.2. The same command compiled and executed `queries/highlights.scm` and `queries/locals.scm` successfully after both were rewritten for the new CST.
- Phase 3 — Probe and fixture validation: all 43 temporary probes were reparsed after regeneration. Named imports were fixed to consume `from`; expected remaining errors are object destructuring, spread arguments, shorthand properties, logical operators, and nullish coalescing. `node_modules/.bin/tree-sitter parse test.strdl test-local.strdl` completed without `ERROR` or `MISSING` nodes.
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
- Phase 4 — Incremental parsing: defined 13 editing sequences in `test/fixtures/incremental_sequences.json` using `test.strdl` and `test-local.strdl`. Sequences cover insertion, deletion, replacement, nested edits, and temporary malformed states; each edit is a current-source replacement with an occurrence index. Documented the catalog in `docs/incremental-editing-sequences.md` and linked it from `docs/README.md`. Validated that all edits apply and all 13 final sources parse cleanly with `tree-sitter parse --quiet`; both repair sequences produce a `MISSING ")"` intermediate state. Equivalence harness and procedure documentation remain pending.
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
- Phase 5 — Locals audit: audited all 12 `locals.scm` patterns against `src/node-types.json` and executed the query against `test.strdl`, `test-local.strdl`, and `test/query/determinism.strdl`. Confirmed that all referenced node types and fields are valid, call identifiers are reference-only, and object keys are emitted as `@local.definition.property` plus `@local.reference`. Recorded import-alias, nested array-pattern, catch-scope, function-name-scope, and blanket-reference findings in `docs/locals-audit.md` and deferred the non-immediate follow-ups. No query change was made for the audit item.
- Phase 5 — Call identifier definitions: added `test/query/call_identifiers.scm` and `scripts/check_locals_definitions_absent.py` to `make test-query`. The grammar-derived check verified 30 call identifier ranges with no `local.definition.*` captures; a negative control adding a call definition pattern failed with `exit=1`. Updated `docs/locals-audit.md` and `docs/ci.md`. No `locals.scm` change was required because the current query already treats call identifiers as references only.
- Phase 5 — Object key definitions: removed `(pair key: (identifier) @local.definition.property)` from `locals.scm` because object property names do not introduce lexical local bindings. Added `test/query/object_keys.scm` covering identifier, string, number, and computed keys, and wired the generic absence checker into `make test-query`. Verified 23 object key ranges with zero definition captures; restoring the removed pattern in a negative control failed with `exit=1`. Updated `docs/locals-audit.md` and `docs/ci.md` and recorded `@local.definition.property` as a breaking locals query API change.
- Phase 5 — Injection evaluation: reviewed Tree-sitter injection semantics, `tree-sitter.json`, the two-query inventory, and evidence D05, D09, D20, D33, S07, S11, S12, S15, S16, S17, E10, C01, and C02. Concluded that no current construct justifies reparsing Strudel source content with another language and that `injection-regex: "^strudel$"` is a host-side declaration rather than a local query requirement. Recorded the evidence, candidate matrix, and revisit conditions in `docs/injections-evaluation.md`; no speculative query file was created.
- Phase 5 — Query compilation tests: added `scripts/check_query_compilation.py` and the `make test-query-compile` target. The checker compiles every official query without source paths and requires negative controls with an invalid node type and invalid field name to fail for the expected reasons. Both official queries compiled; both negative controls were rejected. A temporary invalid query made the checker fail with `exit=1`. `make test-query` now runs the compilation target before execution and semantic checks.
- Phase 5 — Query execution tests: added `scripts/check_query_captures.py`, the `make test-query-execution` target, and grammar-derived probe queries under `test/query/`. The check asserts that every probe-selected range in `test.strdl`, `test-local.strdl`, and `test/query/determinism.strdl` receives the expected capture. Verified nine highlight roles and three locals roles; an incorrect expected capture on call identifiers failed with `exit=1`. `make test-query` now runs compilation, execution assertions, and the existing semantic checks.
- Phase 5 — Query registration: registered `locals.scm` in `tree-sitter.json` and the legacy `package.json` metadata alongside `highlights.scm`; no injection or tag query was registered. Exposed `HIGHLIGHTS_QUERY` and `LOCALS_QUERY` from the Python and Rust bindings. Added `scripts/check_query_registration.py` and `make test-query-registration` to verify registration, query-carrying packaging rules, and binding exports. Removing the `locals` registration in a negative control failed with `exit=1`; `npm pack --dry-run --json` listed both query files. `cargo fmt --check` passed, while `cargo check --offline` could not resolve `tree-sitter-language` from the local crate cache.
