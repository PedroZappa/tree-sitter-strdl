# Compatibility

This document records the supported Tree-sitter tooling and runtime versions after the parser moved to ABI 15.

## Parser ABI

- Generated parser ABI: **15** (`LANGUAGE_VERSION 15` in `src/parser.c`).
- Tree-sitter runtimes older than 0.25 cannot load ABI 15 parsers.
- Consumers using a runtime older than 0.25 must upgrade or use an older release of this grammar.

This is a compatibility-breaking change for consumers on pre-0.25 runtimes.

## Generator tooling

| Tool | Requirement | Notes |
| --- | --- | --- |
| Tree-sitter CLI | `0.27.2`, pinned in `devDependencies` | Generate artifacts with this exact version. |
| Parser ABI target | ABI 15 | CLI 0.27.2 generates ABI 15 by default. |
| Generated artifacts | Committed under `src/` | Never hand-edit generated files. |

Regenerate with:

```sh
tree-sitter generate
```

## Runtime support matrix

| Binding | Declared requirement | Validation version | Result |
| --- | --- | --- | --- |
| Node.js | peer `tree-sitter: ^0.25.0` | `tree-sitter` 0.25.1, Node.js 26.8.2 | Passed `npm test` |
| Python | optional extra `tree-sitter~=0.25.0` | `tree-sitter` 0.25.2, Python 3.15.2 | Passed `bindings/python/tests/test_binding.py` |
| Rust | dev-dependency `tree-sitter = "0.25.8"` | Not run; cargo unavailable | Not verified in this environment |
| Go | `github.com/tree-sitter/go-tree-sitter` v0.25.0 resolved by the temporary test module | Go 1.27.4 | Passed `go test` in a module-aware temporary copy |
| Swift | `SwiftTreeSitter` `from: "0.10.0"` | Resolved SwiftTreeSitter 0.25.0 and tree-sitter 0.25.10 | `swift build` passed; `swift test` blocked by missing XCTest |
| C | No Tree-sitter runtime dependency declared | Not separately built | ABI validation covered by CLI tests |

`~=0.25.0` is used for Python because plain `~=0.25` permits any 0.x release up to 1.0.

## Validation performed

On 2026-11-25:

- `tree-sitter generate` succeeded with CLI 0.27.2.
- A second regeneration with `node_modules/.bin/tree-sitter generate` produced byte-identical `src/parser.c`, `src/grammar.json`, `src/node-types.json`, and `src/tree_sitter/array.h`.
- `tree-sitter test` passed all 7 corpus tests.
- `npm test` passed after installing npm dependencies.
- `tree-sitter query --quiet queries/highlights.scm test-local.strdl` succeeded.
- `tree-sitter query --quiet queries/locals.scm test-local.strdl` succeeded.
- Python binding test passed in an isolated virtual environment.
- Go binding test passed in a temporary module using `go-tree-sitter` v0.25.0.
- Swift library build passed.

Query commands emitted a parser-directory warning but compiled and executed successfully.

## Known limitations

- Rust tests were not run because `cargo` is unavailable in this environment.
- Swift tests were not run successfully because XCTest could not be resolved by the installed command-line tools.
- `npm install` emitted script-allowlist warnings, but the pinned local CLI was executable and was used for the final regeneration check.

## Policy

- Pin the CLI version used to generate committed artifacts.
- Raise the minimum supported runtime only after testing bindings against it.
- Document ABI or runtime-floor changes as breaking changes.
- Keep generated artifacts synchronized with `grammar.js` and the pinned CLI.
