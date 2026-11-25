# Query audit

This document records the Phase 5 audit of `queries/highlights.scm` against the public syntax-tree API exposed by [src/node-types.json](../src/node-types.json) and defined by [grammar.js](../grammar.js). It owns the evidence for the roadmap item “Audit `highlights.scm` against the current public syntax tree.”

The audit covers structural validity only. Capture precision, capture-name semantics, API-name-specific highlighting, and semantic-analysis boundaries are separate roadmap items.

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

## Verification log

- `node_modules/.bin/tree-sitter query queries/highlights.scm test.strdl test-local.strdl` — compiled and executed successfully; 40 patterns reached output.
- `make test-query` — passed.
- Negative controls for unknown node type and unknown field name — both failed as expected, confirming that successful compilation validates names.
