# Query audit

This document records the Phase 5 audit of `queries/highlights.scm` against the public syntax-tree API exposed by [src/node-types.json](../src/node-types.json) and defined by [grammar.js](../grammar.js). It owns the evidence for the roadmap item “Audit `highlights.scm` against the current public syntax tree.”

The initial audit covered structural validity only. The follow-up section below records the capture-specificity changes made for the next roadmap item. Capture-name semantics and documentation remain separate roadmap items.

## Method

The audit used three independent checks:

1. Compared every top-level pattern in `queries/highlights.scm` with the named node types, field names, and token spellings in the current grammar API.
2. Compiled and executed the query against the committed fixtures:

   ```sh
   node_modules/.bin/tree-sitter query queries/highlights.scm test.strdl test-local.strdl
   make test-query
   ```

3. Verified that compilation actually validates names by compiling two temporary negative controls:
   - `(nonexistent_node) @foo` failed with `Invalid node type "nonexistent_node"`.
   - `(string bogus: (identifier)) @foo` failed with `Invalid field name "bogus"`.

Because the committed query compiled successfully under the same compiler, every node type and field name it references exists in the current grammar.

## Result

`queries/highlights.scm` contains 40 top-level patterns (indices 0–39). All compiled and executed. No stale JavaScript-only node names or invalid field names remain after the Phase 3 syntax-tree refactor.

### Named nodes referenced

All named nodes used by query patterns are present in `src/node-types.json`:

| Pattern area | Nodes used | Status |
| --- | --- | --- |
| Literals | `string`, `number`, `comment` | Valid |
| Declarations and bindings | `variable_declarator`, `function_declaration`, `import_specifier`, `formal_parameters`, `array_pattern`, `assignment_pattern`, `arrow_function` | Valid |
| Statements | `labeled_statement` | Valid |
| Calls and access | `call_expression`, `member_expression`, `subscript_expression` | Valid |
| Assignments and properties | `assignment_expression`, `pair` | Valid |
| Expression context | `binary_expression`, `unary_expression`, `conditional_expression`, `template_substitution` | Valid |
| Containers | `object`, `array` | Valid |
| Fallback | `identifier` | Valid |

### Fields referenced

All fields used by query patterns are present in `src/node-types.json`:

`name`, `parameter`, `parameters`, `element`, `left`, `label`, `function`, `property`, `index`, `key`, `expression`.

Wildcard children in `subscript_expression` and `template_substitution` expressions are valid and require no field claim beyond the existing `index` and `expression` fields.

### Tokens referenced

Keyword, punctuation, and operator token spellings used by the query were checked against `grammar.js`. All referenced tokens exist.

The grammar also contains tokens that the current query does not capture:

- `?.` — optional-chaining operator token.
- `${` and the closing `}` of template substitutions — template-delimiter tokens.

The `.` and `?` punctuation patterns do not match `?.` because it is a single anonymous token.

## Fixture execution evidence

Executing the full highlight query against `test.strdl` and `test-local.strdl` produced these capture counts:

| Capture | Matches |
| --- | ---: |
| `punctuation.bracket` | 294 |
| `variable` | 211 |
| `punctuation.delimiter` | 185 |
| `property` | 122 |
| `number` | 91 |
| `string` | 50 |
| `function.method` | 45 |
| `function.call` | 27 |
| `operator` | 16 |
| `constructor` | 16 |
| `function.audio` | 13 |
| `keyword` | 10 |
| `comment` | 5 |
| `expression` | 4 |
| `label` | 3 |
| `function.pattern` | 3 |
| `variable.parameter` | 2 |
| `function.control` | 2 |

Several structurally valid patterns produced no captures on these fixtures: `function.declaration`, import-related captures, and the API-name groups for effects, envelopes, time, utilities, MIDI, and samples. This is fixture coverage information, not evidence that those patterns are invalid.

## Findings

1. **No structural drift remains.** The refactored CST node and field names are reflected correctly in `highlights.scm`; the query is compatible with the current public tree API.

2. **Overlapping captures are widespread.** Generic `(identifier) @variable` also captures identifiers already captured as function calls, methods, properties, labels, parameters, and declarations. API-name-specific patterns also overlap with `function.call`. This is left for the specificity and determinism item.

3. **API-name-specific groups are semantic aliases.** The `function.control`, `function.audio`, `function.pattern`, `function.effect`, `function.envelope`, `function.time`, `function.utility`, `function.midi`, and `function.sample` patterns hardcode Strudel names. They are structurally valid but require the separate scope decision.

4. **Parameter-container captures are broad.** `(formal_parameters)`, `(array_pattern)`, and `(assignment_pattern)` are captured wholesale as `@variable.parameter`, while their individual bindings are also captured. This needs review under capture specificity.

5. **Some syntax tokens lack punctuation coverage.** Optional chaining and template-substitution delimiters are not currently captured. This is a syntax-highlighting completeness gap, not a query-compilation error.

6. **Fixture coverage is uneven.** Several valid patterns are unexercised by `test.strdl` and `test-local.strdl`. Query execution tests should use additional representative fixtures.

## Decision

No grammar change and no `highlights.scm` change was required for this audit item. The query is structurally aligned with the current public syntax tree.

Follow-up work is tracked by the remaining Phase 5 roadmap items:

- specificity and determinism: overlapping captures, broad parameter captures, and missing token coverage;
- API-name decision and semantic-analysis removal: hardcoded Strudel name groups;
- capture documentation: stable meanings for every capture;
- query tests: compilation and execution coverage against representative fixtures.

## Specificity and determinism follow-up

### Scope decision

Hardcoded Strudel API names were removed from `highlights.scm`. They are semantic aliases layered on ordinary JavaScript syntax, so they do not belong in this syntax grammar's official query surface. The query now assigns captures by syntactic context only.

### Query changes

- Removed the generic `(identifier) @variable` fallback. Every identifier capture now comes from a contextual parent pattern.
- Removed all `@function.control`, `@function.audio`, `@function.pattern`, `@function.effect`, `@function.envelope`, `@function.time`, `@function.utility`, `@function.midi`, and `@function.sample` groups that matched hardcoded API names.
- Replaced broad `(formal_parameters)`, `(array_pattern)`, and `(assignment_pattern)` captures with patterns for their individual bindings.
- Added contextual identifier patterns for declaration values, aliases, assignment defaults, arrow bodies, catch parameters, call tags, member objects, subscript objects and indices, assignment values, object values, computed keys, operands, arguments, spread values, parenthesized expressions, conditional branches, template substitutions, return values, export values, and bare expression statements.
- Replaced broad `(object) @constructor` and `(array) @constructor` captures with a direct `new_expression` constructor capture.
- Added `?.` and `${` punctuation patterns. The closing `}` of a template substitution remains part of the grammar's template token structure and is not separately captured.

### Determinism rule

A source range must receive at most one capture. Nested captures on different nodes remain valid because they describe different syntax nodes, but the same node must not be claimed by both a specific and a generic pattern.

`scripts/check_query_determinism.py` parses `tree-sitter query` output and fails when a file/range pair has more than one capture. It is wired into `make test-query`, so the existing CI and local verification gates enforce determinism.

### Before and after evidence

Before the specificity changes, executing `highlights.scm` against `test.strdl` and `test-local.strdl` produced 1,099 capture events over 917 ranges, with 164 ranges receiving multiple captures. The dominant overlap was `property` plus `variable` (122 ranges); API-name aliases also overlapped `function.call` and `variable`.

After the changes, the two original fixtures produce 901 captures across 901 ranges, with zero duplicate ranges. Final capture counts for those two fixtures are:

| Capture | Matches |
| --- | ---: |
| `punctuation.bracket` | 294 |
| `punctuation.delimiter` | 185 |
| `property` | 122 |
| `number` | 91 |
| `string` | 50 |
| `variable` | 47 |
| `function.method` | 45 |
| `function.call` | 27 |
| `operator` | 16 |
| `keyword` | 10 |
| `comment` | 5 |
| `expression` | 4 |
| `label` | 3 |
| `variable.parameter` | 2 |

A temporary negative-control query containing `(identifier) @variable` and `(identifier) @function.call` was rejected by the determinism checker, confirming that the check detects duplicate captures.

A later targeted probe found one latent overlap not present in the original fixtures: a bare identifier inside `${...}` matched both `@variable` and the wildcard `@expression` template pattern. The wildcard was replaced with an explicit list of template substitution expression types that do not already have a dedicated capture. `test/query/determinism.strdl` now exercises optional chaining, template interpolation, calls, members, objects, imports, parameter defaults, and control flow. The checker reports 1,096 captures across 1,096 ranges with zero duplicates across all three determinism fixtures.

### Limitations

The two original fixtures still do not contain `?.` or `${`; those tokens are exercised by `test/query/determinism.strdl`. Capture-name meanings and breaking-change history are documented in [highlight captures](highlight-captures.md).

## Registration, packaging, and binding exports

The official query inventory is the set of `.scm` files under `queries/`: `highlights.scm` and `locals.scm`. No `injections.scm` or `tags.scm` exists, and neither is registered or exported. The [Tree-sitter configuration schema](https://tree-sitter.github.io/tree-sitter/assets/schemas/config.schema.json) defines `highlights`, `locals`, `injections`, and `tags` as the query-path registration keys.

Both official queries are registered in `tree-sitter.json` under the matching `highlights` and `locals` keys and in the legacy `tree-sitter` metadata in `package.json`. Packaging rules that carry queries use directory or wildcard inclusion, so both files are covered by npm `files`, Cargo `include`, `setup.py`, `Package.swift`, the Makefile `install` rule, and `scripts/local_install.sh`.

The Python binding exposes `HIGHLIGHTS_QUERY` and `LOCALS_QUERY` through `__getattr__`, `__all__`, and the `.pyi` stub. The Rust binding exposes `HIGHLIGHTS_QUERY` and `LOCALS_QUERY` through `include_str!`. These exports make the existing packaged query files available without inventing injection or tag queries.

`scripts/check_query_registration.py` derives the inventory from `queries/`, checks both registration surfaces and every query-carrying packaging rule, verifies the binding exports, and rejects registration of absent query kinds. It is wired into `make test-query-registration`, which `make test-query` runs. See [Queries](queries.md) for the user-facing query documentation.

## Verification log

- `node_modules/.bin/tree-sitter query queries/highlights.scm test.strdl test-local.strdl` — compiled and executed successfully; all initial patterns reached output.
- Negative controls for unknown node type and unknown field name — both failed as expected, confirming that successful compilation validates names.
- `make test-query` — passed after the specificity changes, including the new duplicate-capture check: 901 captures across 901 ranges for the two original fixtures.
- Duplicate-capture negative control — rejected as expected with `exit=1`.
- Template-substitution probe — exposed a `variable`/`expression` overlap, prompting the explicit template expression list; `tree-sitter parse test/query/determinism.strdl` now reports no `ERROR` or `MISSING` nodes.
- Final `make test-query` — 1,096 captures across 1,096 ranges with zero duplicate captures across `test.strdl`, `test-local.strdl`, and `test/query/determinism.strdl`.
- `make test-query-compile` — automated the earlier negative controls: both official queries compile, and invalid node type and invalid field name queries are rejected for the expected reasons.
- `make test-query-execution` — asserted expected highlight captures on nine grammar-derived roles: call identifiers, member-expression callees, declaration names, arrow parameters, identifier object keys, labels, substitution identifiers, strings, and numbers. A wrong expected capture on call identifiers failed with `exit=1`.
- `make test-query-registration` — verified both official queries in `tree-sitter.json`, `package.json`, all query-carrying packaging rules, and the Python/Rust binding exports; absent injection and tag queries are not registered or exported.
- Registration negative control — temporarily removing the `locals` registration from `tree-sitter.json` made the checker fail with `exit=1`.
- Absent-query negative control — temporarily adding an `injections` entry to `package.json` made the checker fail with `exit=1`.
- `npm pack --dry-run --json` — confirmed that `queries/highlights.scm` and `queries/locals.scm` are both present in the npm package file list.
- `python3 -m py_compile bindings/python/tree_sitter_strudel/__init__.py` and `cargo fmt --check` — passed. `cargo check --offline` could not resolve `tree-sitter-language` from the local crate cache, so Rust compilation was not verified offline.
