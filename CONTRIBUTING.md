# Contributing

This guide describes how to propose changes to `tree-sitter-strdl`. [AGENTS.md](AGENTS.md) owns the project's authoritative requirements and phase definitions, [docs/roadmap.md](docs/roadmap.md) records what has been verified, and the [Makefile](Makefile) is the canonical command entry point.

The parser is intentionally limited to syntax recognition and the public concrete syntax tree (CST). Do not add semantic analysis, symbol resolution, Strudel API metadata, mini-notation parsing, runtime evaluation, or editor-specific language intelligence.

## Sources of truth

- [`grammar.js`](grammar.js) is the authoritative grammar definition.
- Generated files under [`src/`](src/) are committed artifacts. Never hand-edit them; regenerate them with the pinned Tree-sitter CLI.
- [`tree-sitter.json`](tree-sitter.json) is the canonical package metadata source.
- Captured node and field names in [`src/node-types.json`](src/node-types.json) are a public API; changes require review and documentation.
- The [documentation index](docs/README.md) identifies the owning document for each topic.

## Before starting

1. Read the relevant phase, checklist item, and acceptance criteria in the [roadmap](docs/roadmap.md).
2. Set up the pinned toolchain described in the [development environment](docs/development-environment.md#initial-setup):

   ```sh
   npm ci
   python3 -m venv .venv
   .venv/bin/pip install -r requirements-dev.txt
   ```

3. Run `make help` for the available targets and common override hints; consult the [Makefile](Makefile) for exact variable names.
4. Inspect `git status --short` and preserve unrelated working-tree changes.
5. Create a focused branch. Phase work uses `phase/<number>-<slug>` branches created from the corresponding phase tag; ordinary fixes and documentation changes can use a descriptive topic branch.

Discuss significant architectural, compatibility, licensing, or release decisions before implementation. Do not change the project license, add an unrelated dependency, or change a published API as an incidental part of another fix.

## Make the change

### Grammar and CST

- Change `grammar.js`, then run `make generate`. Commit the regenerated artifacts with the grammar change.
- Keep rules composable and JavaScript-like. Do not hardcode Strudel API function names into grammar rules.
- Keep mini-notation opaque as ordinary string content.
- Treat node names, field names, tree shape, precedence, and intentional conflicts as public behavior. Document non-obvious decisions in [grammar architecture](docs/grammar-architecture.md).
- Add or update explicit corpus expectations for every syntax, recovery, or precedence change. Do not weaken expected trees merely to make a parse pass.

### Tests, queries, and regressions

- Add corpus cases for valid, malformed, and incomplete syntax as appropriate.
- Add query assertions when capture names or matching rules change, and update the authoritative capture documentation.
- Add an incremental sequence when an edit pattern needs coverage.
- Extend binding or package checks when the affected surface changes.
- Every discovered bug must produce a permanent regression artifact or a documented exclusion in [regression coverage](docs/regression-coverage.md).
- For a new correctness invariant, include a negative control where practical and record the observed failure in the change evidence.

### Documentation and roadmap

- Update the document that owns the behavior rather than duplicating detail across files.
- Mark a roadmap item complete only after its acceptance criteria and verification evidence are present.
- Update `docs/roadmap.md` in the same change, including a short [verification log](docs/roadmap.md#verification-log) entry for checked items.
- Update [`CHANGELOG.md`](CHANGELOG.md) for user-visible changes under the `Unreleased` section when the change affects consumers, release behavior, or documented guarantees.
- Report limitations honestly; a task is not complete because its implementation merely appears to work.

### Dependencies and toolchains

Keep dependency pins in `package-lock.json`, `requirements-dev.txt`, and `Cargo.lock` deliberate and reviewed. Prefer repository-local tools selected by the Makefile. Keep Python build tooling inside `.venv`; do not install it globally. Changes to supported runtimes, parser ABI, or tool versions require the review described in [compatibility](docs/compatibility.md).

## Validate locally

Use the narrowest relevant target while iterating, then run the complete gate:

```sh
make format          # local auto-fix; CI checks formatting
make test
make test-query
make test-incremental
make test-node
make ci
```

`make ci` also checks generated-artifact consistency, static analysis, regression coverage, benchmark artifacts, clean builds, the generated parser without `grammar.js`, C/Python/Rust/Swift binding surfaces, version alignment, npm package contents, and tarball installation. See [CI](docs/ci.md#what-make-ci-runs) for the exact ordered gate.

If a toolchain is unavailable, run every applicable targeted gate and state the gap explicitly; never skip, weaken, or delete a failing test to obtain a green result. Local macOS Swift validation requires XCTest from a full Xcode installation, and stale Node addons should be diagnosed with `make test-node-clean-build`; see [development environment](docs/development-environment.md#tool-selection-and-environment-notes).

Run `make performance-report` for informational latency and memory observations when performance may be affected. The report accounts for hardware and configuration differences, and no timing value gates a build. Measurement procedures are in [benchmarking](docs/benchmarking.md#procedure-map).

After committing a grammar change, run `make check-generated` to confirm that the committed artifacts still match a fresh regeneration.

## Commits

The current history uses Conventional Commits. Prefer a concise imperative subject of the form `type(scope): summary`, with explanatory body text when the reason or evidence is not obvious:

```text
feat(grammar): add optional chaining
fix(ci): use venv python for binding checks
docs(grammar): document public fields
test(node): verify clean binding build
```

Keep each commit focused and include generated artifacts, tests, documentation, and roadmap evidence with the behavior they support. Do not commit secrets, machine-specific configuration, unrelated formatting churn, or stale generated files.

## Pull requests

A pull request should include:

- the linked roadmap item and the problem being solved;
- the changed behavior and any public CST, query API, or compatibility impact;
- commands run and their results, including any unavailable toolchains;
- confirmation that generated artifacts are synchronized, where relevant;
- documentation and regression changes;
- known limitations and decisions needing reviewer attention.

CI runs on pull requests and pushes to `main` with Node.js 22 and 24 on Ubuntu 24.04, and runs the informational performance report on the Node 24 leg. Wait for the correctness gate to pass before merging. Review CI failures as correctness problems; performance warnings do not by themselves fail the build.

## Releases and tags

Maintainers create phase-complete and release tags only after the applicable acceptance criteria pass and all tracked version metadata agrees with the tag. Run `make check-generated`, `make test-package`, and `make test-tarball-install` before pushing a tag; the publish workflow repeats those checks against the tagged commit and blocks every publication job when generated artifacts, package contents, or installed-package parsing fail. Tags use annotated `vMAJOR.MINOR.PATCH` names; see [versioning and phase tags](docs/roadmap.md#versioning-and-phase-tags). Publishing is triggered by tag push, so tag pushes require explicit release authorization. Ordinary commits must not publish packages, and no one should push a release tag as a routine part of implementation work.
