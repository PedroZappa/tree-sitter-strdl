# AGENTS.md — Tree-sitter Strudel

## 1. Project Mission

This repository develops and maintains a production-quality Tree-sitter grammar for Strudel.

The project provides a reliable, efficient, incremental parser that exposes a predictable concrete syntax tree (CST) for Strudel compositions.

The grammar must be independently usable by editors, language servers, development tools, and other Tree-sitter consumers.

### Core responsibilities

- Define and maintain the Strudel-oriented grammar.
- Generate and maintain Tree-sitter parser artifacts.
- Expose a stable and well-designed syntax tree.
- Support incremental parsing and resilient error recovery.
- Provide editor-facing syntax queries.
- Maintain comprehensive parser tests.
- Establish and monitor parser performance.
- Distribute the grammar as an independently versioned package.

### Explicitly out of scope

This repository must not implement:

- Semantic analysis.
- Type inference.
- Symbol resolution.
- Strudel API metadata management.
- Mini-notation parsing.
- Runtime evaluation.
- LSP functionality.
- Editor-specific language intelligence.

These responsibilities belong in downstream tools, particularly the Strudel LSP.

Maintain strict separation between syntactic parsing and semantic interpretation.

---

## 2. Language Coverage

The grammar targets a modern JavaScript subset relevant to real-world Strudel compositions.

Target ES2020+ constructs where relevant, without claiming complete ECMAScript compatibility.

### Required syntax coverage

Investigate and implement support for:

- Variable declarations (`var`, `let`, `const`).
- Assignments and expressions.
- Function calls and nested calls.
- Member expressions and method chaining.
- Arrow functions and callbacks.
- Function parameters.
- Arrays and objects.
- Object properties and shorthand properties.
- Destructuring.
- Spread and rest syntax.
- Arithmetic expressions.
- Logical and comparison expressions.
- Unary expressions.
- Conditional expressions.
- Optional chaining.
- Nullish coalescing.
- Template literals and interpolation.
- Single-quoted and double-quoted strings.
- Comments.
- Parenthesized expressions.
- Relevant import/export syntax.

This list establishes the desired coverage, not an instruction to implement every feature without verifying its relevance to Strudel.

### Language compatibility principles

- Prefer syntax demonstrated in actual Strudel compositions.
- Follow established JavaScript grammar conventions.
- Avoid implementing unrelated ECMAScript features.
- Avoid duplicating the full ECMAScript specification.
- Do not hardcode Strudel API function names into grammar rules.
- Keep grammar rules composable and extensible.

### Mini-notation

Mini-notation is opaque string content.

For example:

```javascript
s("bd sd [hh hh] bd")
note("c3 e3 g3")
```

The grammar must parse these as ordinary JavaScript string literals and expose their surrounding expression structure.

Do not implement mini-notation parsing or specialized mini-notation semantics.

A future dedicated parser may consume the string nodes independently.

---

## 3. Grammar Architecture

Use the native Tree-sitter JavaScript grammar DSL.

### Source of truth

`grammar.js` is the authoritative grammar definition.

Generated artifacts must never be treated as independent sources of truth.

### Architecture requirements

- Follow established Tree-sitter conventions.
- Prefer intuitive and composable grammar rules.
- Preserve meaningful JavaScript-like syntax structure.
- Use explicit fields for important structural relationships.
- Prefer meaningful named nodes where useful to consumers.
- Maintain consistent node naming conventions.
- Avoid unnecessary external scanners.
- Avoid custom grammar-generation infrastructure unless justified.

### Precedence and ambiguity

- Define precedence explicitly where necessary.
- Define associativity deliberately.
- Prefer deterministic parsing.
- Declare only justified grammar conflicts.
- Avoid unnecessary GLR conflict resolution.
- Document non-obvious precedence and conflict decisions.
- Add regression tests for intentional ambiguities.

### Syntax tree API

The syntax tree is a public interface consumed by downstream projects.

It must expose sufficient structural detail for:

- Function calls and identifiers.
- Arguments and argument lists.
- Member expressions and method chains.
- Literals.
- Arrays and objects.
- Arrow functions and parameters.
- Binary and unary expressions.
- Parenthesized expressions.
- Variable declarations.
- Assignments.

Maintain stable, documented node names and field names.

Changes to the public syntax tree must be treated as API changes.

Review generated `node-types.json` changes whenever grammar modifications affect the syntax tree.

Do not introduce Strudel-specific semantic interpretations into syntax nodes.

---

## 4. Error Recovery and Incremental Parsing

Parser resilience is a first-class architectural requirement.

The grammar must remain useful while users are actively editing compositions.

### Error recovery requirements

Support incomplete and malformed input wherever Tree-sitter permits:

- Unfinished function calls.
- Incomplete expressions.
- Missing delimiters.
- Incomplete argument lists.
- Partially typed arrow functions.
- Incomplete declarations.
- Unfinished strings and templates where recoverable.
- Malformed nested structures.

Preserve valid syntax around malformed regions.

Minimize cascading errors and avoid destroying useful syntax-tree information.

Do not sacrifice valid-code correctness merely to make malformed input appear valid.

### Incremental parsing

Incremental parsing must be efficient and correct.

The resulting syntax tree after incremental edits must be equivalent to a fresh parse of the same final source.

Implement automated tests covering realistic editing sequences.

---

## 5. Syntax Queries

Queries are a first-class part of the project.

Maintain official, tested queries in `queries/`.

### Initial query responsibilities

- `highlights.scm`: syntax highlighting.
- `locals.scm`: scopes, definitions, and references.
- `injections.scm`: language injections only when justified by actual requirements.

Additional query files may be introduced when they provide useful structural captures.

### Query requirements

- Follow established Tree-sitter query conventions.
- Maintain stable capture names.
- Document capture names and intended meanings.
- Test query compilation and execution.
- Avoid duplicating semantic analysis.
- Avoid editor-specific assumptions.
- Keep query behavior consistent with the public syntax tree API.

---

## 6. Testing Strategy

Use comprehensive, multi-layer testing.

### 6.1 Corpus tests

Maintain Tree-sitter corpus tests covering:

- Valid syntax.
- Individual language constructs.
- Nested expressions.
- Function calls and method chaining.
- Modern JavaScript syntax.
- Complex Strudel compositions.
- Malformed code.
- Incomplete code.
- Ambiguous constructs.

Expected syntax trees must be explicit and reviewed.

### 6.2 Query tests

Test:

- Query compilation.
- Highlight captures.
- Locals and scope captures.
- Structural queries.
- Query behavior against representative compositions.

### 6.3 Regression tests

Every discovered parsing bug must produce a permanent regression test.

Avoid unintended changes to existing syntax-tree structures.

### 6.4 Real-world fixtures

Maintain representative Strudel compositions as test fixtures.

Use actual documented examples and real-world compositions rather than relying exclusively on artificially constructed examples.

### 6.5 Incremental parsing tests

Simulate document edits.

Compare incremental parsing results against fresh parsing results for identical final source.

Cover insertions, deletions, replacements, nested edits, and malformed intermediate states.

### 6.6 Build and compatibility tests

Validate:

- Grammar generation.
- Generated artifact consistency.
- Node.js bindings.
- Supported Tree-sitter runtime versions.
- Package integrity.

---

## 7. Performance Engineering

Performance is a first-class architectural requirement.

Do not postpone performance engineering until the grammar is feature-complete.

### Required benchmarks

Measure:

1. Fresh parsing latency.
2. Incremental parsing latency.
3. Memory consumption.
4. Large-document behavior.
5. Deeply nested expressions.
6. Pathological input behavior.

Use both representative Strudel compositions and synthetic stress-test fixtures.

### Latency metrics

Track:

- P50.
- P95.
- P99.

Measure fresh and incremental parsing separately.

### Performance regression monitoring

- Maintain reproducible benchmark fixtures.
- Record baseline measurements.
- Monitor performance changes over time.
- Investigate regressions.
- Avoid optimizing based exclusively on average execution time.
- Account for CI hardware variability.
- Distinguish correctness failures from performance warnings.

Establish performance budgets after measuring realistic baselines.

Do not invent arbitrary performance thresholds.

---

## 8. Compatibility and Distribution

Target the latest stable Tree-sitter CLI and runtime.

### Compatibility policy

- Pin development tooling for reproducible builds.
- Establish a documented minimum supported runtime version.
- Validate generated parser compatibility.
- Avoid unnecessary legacy compatibility.
- Document breaking changes.
- Test compatibility before changing supported versions.

### Package architecture

Maintain a conventional Tree-sitter grammar package with:

- Grammar source.
- Generated parser artifacts.
- Tree-sitter metadata.
- Node.js bindings.
- Official queries.
- Package configuration.
- Tests and documentation.

Node.js is the primary first-class binding and distribution target.

Keep the grammar itself independent of Node.js.

Existing bindings for other languages must be audited before deciding whether to retain, maintain, or remove them. Do not delete existing integrations without evaluating their use and consequences.

### Generated artifacts

Commit required generated parser artifacts to Git.

Requirements:

- Regenerate artifacts after grammar changes.
- Never manually modify generated parser files.
- Keep generated files synchronized with `grammar.js`.
- Verify consistency in CI.
- Do not maintain duplicate parser implementations.

Consumers should not need to regenerate the parser to use the distributed package.

---

## 9. Repository Organization

Follow current standard Tree-sitter repository conventions.

Expected areas include:

- Grammar source.
- Generated parser.
- Bindings.
- Queries.
- Corpus tests.
- Additional test fixtures.
- Benchmark infrastructure.
- Documentation.
- CI configuration.

Use pragmatic extensions when they improve organization.

Avoid unnecessary abstractions and duplicated infrastructure.

The agent may reorganize existing files when justified, but must preserve functionality and investigate dependencies before removing existing components.

---

## 10. Language Evolution and Authoritative References

Use the following evidence hierarchy:

1. Official Strudel documentation.
2. Actual Strudel source code and runtime.
3. Official Strudel examples and tutorials.
4. Maintained community examples.
5. ECMAScript specifications and established JavaScript grammar references.

### Evolution policy

- Track relevant Strudel language changes.
- Introduce grammar changes when actual syntax requirements emerge.
- Preserve compatibility with existing compositions.
- Document intentional incompatibilities.
- Add regression fixtures for newly supported constructs.
- Avoid coupling grammar rules to Strudel API function names.
- Do not chase experimental features without evidence of their relevance.

Distinguish documented language syntax from incidental runtime implementation behavior.

Record evidence supporting significant new syntax requirements.

---

## 11. Documentation

Maintain comprehensive developer and consumer documentation.

### README.md

Document:

- Project purpose.
- Scope and limitations.
- Installation.
- Usage.
- Supported syntax.
- Compatibility requirements.
- Basic parsing examples.

### Grammar documentation

Document:

- Grammar architecture.
- Important node types.
- Public fields.
- Precedence.
- Intentional conflicts.
- Error recovery considerations.

### Query documentation

Document:

- Available query files.
- Capture names.
- Capture conventions.
- Compatibility expectations.

### Development documentation

Document:

- Development environment.
- Build and generation procedures.
- Testing.
- Benchmarking.
- Contribution workflow.

### Compatibility documentation

Document:

- Supported Tree-sitter versions.
- Minimum runtime version.
- Package compatibility.
- Syntax coverage policy.
- Breaking change policy.

Document significant architectural decisions without creating unnecessary documentation for trivial implementation details.

Documentation must describe actual implementation and verified behavior.

---

## 12. CI/CD and Release Management

Maintain comprehensive automated CI.

### Pull request and push validation

Validate:

- Grammar generation.
- Generated-file consistency.
- Corpus tests.
- Query compilation and tests.
- Node.js binding builds and tests.
- Formatting and static checks.
- Incremental parsing correctness.
- Compatibility.
- Performance regressions.

### Release policy

- Use versioned releases.
- Validate package contents before publishing.
- Maintain release notes and a changelog.
- Publish npm packages through controlled workflows.
- Never publish automatically from ordinary commits.
- Require explicit release authorization.

CI performance checks must account for hardware variability.

---

## 13. Licensing and Provenance

Licensing compliance is mandatory.

Before substantial implementation or reuse of external code:

- Verify the repository's authoritative license.
- Investigate discrepancies between license declarations.
- Verify compatibility of external grammar code.
- Preserve copyright and attribution notices.
- Document reused code and assets.
- Verify dependency licenses.
- Distinguish inspiration from actual code reuse.

Never assume that an existing license declaration is correct.

**Do not change, select, or replace the project license without explicit approval.**

Stop and request clarification whenever licensing compatibility is uncertain.

---

## 14. Implementation Roadmap

Implement the project through explicit phases.

### Phase 1 — Repository audit

- Inspect the complete repository.
- Understand the current grammar.
- Identify obsolete or duplicated infrastructure.
- Audit existing bindings.
- Review dependencies.
- Investigate licensing.
- Inspect tests, queries, and generated artifacts.
- Establish functional and performance baselines.

Deliverable: documented repository assessment and implementation plan.

### Phase 2 — Grammar foundation

- Establish grammar architecture.
- Define the core language structure.
- Establish node naming and field conventions.
- Define precedence and ambiguity handling.
- Validate basic syntax coverage.

Deliverable: stable grammar foundation.

### Phase 3 — Language coverage

- Expand modern JavaScript support.
- Validate actual Strudel composition patterns.
- Cover relevant expression and declaration constructs.
- Add representative fixtures.

Deliverable: comprehensive Strudel-oriented syntax coverage.

### Phase 4 — Error recovery and incremental parsing

- Improve incomplete-code handling.
- Validate recovery behavior.
- Implement incremental parsing tests.
- Verify equivalence against fresh parses.

Deliverable: robust editor-facing parser behavior.

### Phase 5 — Queries

- Implement highlighting.
- Implement locals.
- Evaluate injections.
- Establish stable capture conventions.
- Add query tests and documentation.

Deliverable: complete official query infrastructure.

### Phase 6 — Testing and performance

- Complete multi-layer testing.
- Establish benchmark infrastructure.
- Measure baseline performance.
- Introduce regression monitoring.
- Validate stress-test behavior.

Deliverable: measurable correctness and performance standards.

### Phase 7 — Packaging and compatibility

- Validate Node.js bindings.
- Establish supported runtime versions.
- Audit existing integrations.
- Validate package distribution.
- Verify generated artifacts.

Deliverable: independently distributable package.

### Phase 8 — Documentation and release readiness

- Complete documentation.
- Validate CI/CD.
- Verify compatibility.
- Review licensing.
- Validate release packaging.
- Prepare production-quality release.

Deliverable: independently maintainable and releasable grammar.

Phases may be adjusted when implementation reveals better approaches. Significant deviations must be explained.

Run tests continuously. Do not postpone validation until the end.

---

## 15. Agent Autonomy and Safety

The agent has high implementation autonomy.

### Authorized activities

The agent may independently:

- Inspect the repository.
- Analyze architecture.
- Modify grammar source.
- Refactor implementation.
- Reorganize project files when justified.
- Generate parser artifacts.
- Implement requested functionality.
- Add and modify tests.
- Run existing build, test, and benchmark commands.
- Update documentation.
- Investigate and fix bugs.
- Improve performance.

### Mandatory approval requirements

Stop and ask before:

- Installing dependencies or software.
- Using `sudo`.
- Deleting files or directories.
- Performing database migrations.
- Executing untrusted scripts or plugins for the first time.
- Performing operations with significant destructive consequences.

### Git permissions

- Read-only Git inspection is unrestricted.
- Every Git command that modifies repository state requires explicit per-command approval.
- Never commit without an explicit request.
- Never amend, rebase, reset, force-push, or otherwise modify Git history without explicit approval.
- After every commit, push all local branches to the GitHub remote (`git push --all origin`). The user has given a standing explicit authorization for this push as part of the commit workflow, so it does not require a separate per-command approval each time.

### Architectural decisions

When encountering a significant architectural decision not covered by this document:

1. Explain the problem.
2. Identify viable alternatives.
3. Present a recommendation and its rationale.
4. Stop and request approval when the decision materially affects architecture, compatibility, licensing, or project direction.

Do not silently introduce major architectural changes.

---

## 16. Definition of Done

A task is complete only when all applicable requirements are satisfied.

### Implementation

- Follows established architecture.
- Meets the requested behavior.
- Does not introduce unnecessary complexity.

### Testing

- Relevant tests are added or updated.
- Existing tests pass.
- Regression coverage is maintained.
- Incremental parsing remains correct where relevant.

### Grammar and queries

- Generated artifacts are synchronized.
- Query compilation succeeds.
- Public syntax-tree changes are intentional and documented.

### Performance

- Relevant performance impact is measured.
- Regressions are investigated.
- Benchmark results are reported when applicable.

### Documentation

- Relevant documentation is updated.
- Compatibility implications are documented.

### Validation honesty

Never claim that a task was tested, benchmarked, generated, or validated unless the corresponding operation was actually executed.

Clearly distinguish:

- Completed and verified work.
- Completed but unverified work.
- Outstanding work.
- Known limitations.

For milestones, all applicable acceptance criteria and CI checks must pass.

A feature is not complete merely because its implementation appears to work.

---

## 17. Guiding Principles

When making implementation decisions, prioritize in this order:

1. Correct syntax recognition.
2. Reliable syntax-tree structure.
3. Robust error recovery.
4. Correct incremental parsing.
5. Performance.
6. Maintainability.
7. Compatibility.
8. Simplicity.

Prefer evidence over assumptions.

Prefer standard Tree-sitter mechanisms over custom infrastructure.

Prefer explicit, testable behavior over implicit conventions.

Keep syntax parsing independent from semantic analysis.

Treat the grammar and its syntax tree as a public, independently maintained software interface.
