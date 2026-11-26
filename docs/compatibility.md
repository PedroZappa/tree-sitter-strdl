# Compatibility

This document records the supported Tree-sitter tooling and runtime versions after the parser moved to ABI 15.

## Parser ABI

- Generated parser ABI: **15** (`LANGUAGE_VERSION 15` in `src/parser.c`).
- Tree-sitter runtimes older than 0.25 cannot load ABI 15 parsers.
- Consumers using a runtime older than 0.25 must upgrade or use an older release of this grammar.

This is a compatibility-breaking change for consumers on pre-0.25 runtimes.

## Generator tooling

| Tool                | Requirement                                | Notes                                                          |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Tree-sitter CLI     | `0.27.2`, pinned in `devDependencies`      | Generate artifacts with this exact version.                    |
| Parser ABI target   | ABI 15                                     | CLI 0.27.2 generates ABI 15 by default.                        |
| Generated artifacts | Committed under `src/`                     | Never hand-edit generated files.                               |
| Prettier            | `3.10.1`, pinned in `devDependencies`      | Formatting gate for non-generated JS/JSON/YAML/Markdown files. |
| Ruff                | `0.17.6`, pinned in `requirements-dev.txt` | Formatting and lint gate for Python sources.                   |

Regenerate with:

```sh
tree-sitter generate
```

## Runtime support matrix

| Binding | Declared requirement                                                                  | Validation version                                      | Result                                                       |
| ------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| Node.js | peer `tree-sitter: ^0.25.0`                                                           | `tree-sitter` 0.25.1, Node.js 26.8.2 and 26.13.1        | Passed `npm test` and a clean tracked-source build           |
| Python  | optional extra `tree-sitter~=0.25.0`                                                  | `tree-sitter` 0.25.2, Python 3.15.2                     | Passed `bindings/python/tests/test_binding.py`               |
| Rust    | dev-dependency `tree-sitter = "0.25.8"`                                               | Not run; cargo unavailable                              | Not verified in this environment                             |
| Go      | `github.com/tree-sitter/go-tree-sitter` v0.25.0 resolved by the temporary test module | Go 1.27.4                                               | Passed `go test` in a module-aware temporary copy            |
| Swift   | `SwiftTreeSitter` `from: "0.10.0"`                                                    | Resolved SwiftTreeSitter 0.25.0 and tree-sitter 0.25.10 | `swift build` passed; `swift test` blocked by missing XCTest |
| C       | No Tree-sitter runtime dependency declared                                            | Not separately built                                    | ABI validation covered by CLI tests                          |

GitHub Actions validates the Node.js binding on Node.js 22 and 24 for pull requests and pushes to `main`; see [CI](ci.md).

`~=0.25.0` is used for Python because plain `~=0.25` permits any 0.x release up to 1.0.

## Validation performed

On 2026-11-25:

- `tree-sitter generate` succeeded with CLI 0.27.2 before and after the Phase 3 structured refactor.
- A second regeneration before the refactor produced byte-identical `src/parser.c`, `src/grammar.json`, `src/node-types.json`, and `src/tree_sitter/array.h`.
- `tree-sitter test` passed all 42 current corpus cases with CLI 0.27.2.
- `tree-sitter test` also compiled and executed both official query files successfully.
- `tree-sitter parse test.strdl test-local.strdl` completed without `ERROR` or `MISSING` nodes after the refactor.
- `npm test` passed with `tree-sitter` 0.25.1 on Node.js 26.8.2 and, after a clean tracked-source `npm ci --offline` rebuild, on Node.js 26.13.1 (ABI 147). The clean build verified that committed parser artifacts remained byte-identical.

Query commands emitted a parser-directory warning but compiled and executed successfully.

## Known limitations

- npm 11 in this environment blocks dependency install scripts for `tree-sitter` and `tree-sitter-cli` by default; the project's own install script still compiled the addon, and the clean build's `npm test` run loaded the runtime successfully.
- Rust tests were not run because `cargo` is unavailable in this environment.
- Swift tests were not run successfully because XCTest could not be resolved by the installed command-line tools.
- `npm install` emitted script-allowlist warnings, but the pinned local CLI was executable and was used for the final regeneration check.

## Policy

- Pin the CLI version used to generate committed artifacts.
- Raise the minimum supported runtime only after testing bindings against it.
- Document ABI or runtime-floor changes as breaking changes.
- Keep generated artifacts synchronized with `grammar.js` and the pinned CLI.
