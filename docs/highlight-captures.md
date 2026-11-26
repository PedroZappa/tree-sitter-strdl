# Highlight captures

This document is the authoritative reference for capture names emitted by [`queries/highlights.scm`](../queries/highlights.scm). It owns the Phase 5 roadmap item “Document every highlight capture name and intended meaning.”

The capture set describes syntactic roles in the public concrete syntax tree. It does not identify Strudel API functions or infer runtime meaning. Mini-notation remains ordinary string content and is captured only through the surrounding JavaScript syntax. See [Queries](queries.md) for the full official query inventory.

## Capture names

| Capture                  | Meaning                                                                           | Captured nodes or tokens                                                                                                                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@keyword`               | JavaScript keyword token.                                                         | `var`, `let`, `const`, `function`, `return`, `try`, `catch`, `import`, `export`, `default`, `from`, `as`, `new`, `await`.                                                                                                                                                                                       |
| `@punctuation.delimiter` | Delimiter token that separates syntax elements.                                   | `.`, `?.`, `,`, `:`, `;`, `?`, `${`.                                                                                                                                                                                                                                                                            |
| `@punctuation.bracket`   | Opening or closing bracket token.                                                 | `(`, `)`, `[`, `]`, `{`, `}`. Braces may delimit objects or blocks; the token itself is captured without semantic disambiguation.                                                                                                                                                                               |
| `@operator`              | Operator token.                                                                   | `=`, `=>`, `...`, `!`, `<`, `>`, `<=`, `>=`, `==`, `===`, `!=`, `!==`, `+`, `-`, `*`, `/`.                                                                                                                                                                                                                      |
| `@string`                | Quoted string literal.                                                            | Every `(string)` node, including mini-notation strings and module sources. Template strings are not `(string)` nodes and are not captured here.                                                                                                                                                                 |
| `@number`                | Numeric literal.                                                                  | Every `(number)` node.                                                                                                                                                                                                                                                                                          |
| `@comment`               | Line or block comment.                                                            | Every `(comment)` node.                                                                                                                                                                                                                                                                                         |
| `@variable`              | Identifier in a value, binding, or reference position.                            | Declaration names and values; import names and aliases; assignment targets and values; member and subscript objects; subscript indices; object values and computed keys; binary, unary, await, call, array, spread, parenthesized, conditional, template, return, export, and expression-statement identifiers. |
| `@variable.parameter`    | Identifier that binds a function or catch parameter.                              | `formal_parameters` parameters, `array_pattern` elements, `assignment_pattern` defaults, single-identifier arrow parameters, and `try_statement` catch parameters. The parameter container nodes are not captured.                                                                                              |
| `@function.declaration`  | Name of a named function declaration.                                             | The `name` identifier of `(function_declaration)`.                                                                                                                                                                                                                                                              |
| `@function.call`         | Identifier that invokes a call or tags a template.                                | The `function` identifier of `(call_expression)` and the `tag` identifier of `(tagged_template_expression)`.                                                                                                                                                                                                    |
| `@function.method`       | Member expression used as the callee of a call.                                   | The entire `(member_expression)` node in `call_expression.function`. Child object and property identifiers keep their own `@variable` and `@property` captures.                                                                                                                                                 |
| `@property`              | Property name in member access or an object literal.                              | The `property` identifier of `(member_expression)` and the identifier `key` of `(pair)`. String and number pair keys retain `@string` or `@number` instead of receiving a second capture.                                                                                                                       |
| `@expression`            | Expression node whose role is not already represented by a more specific capture. | Whole `binary_expression`, `unary_expression`, and `conditional_expression` nodes; selected non-literal, non-identifier template substitution expressions.                                                                                                                                                      |
| `@constructor`           | Identifier used as a constructor in a `new` expression.                           | The identifier `constructor` of `(new_expression)`. Object and array literals are not constructors for this capture.                                                                                                                                                                                            |
| `@label`                 | Label of a labeled statement.                                                     | The `label` identifier of `(labeled_statement)`.                                                                                                                                                                                                                                                                |

## Determinism

A source range must receive at most one capture from `highlights.scm`. Contextual identifier patterns replaced the previous generic `(identifier) @variable` fallback, and `scripts/check_query_determinism.py` enforces the rule in `make test-query`.

Nested captures on different nodes are valid. For example, `object.method()` emits `@function.method` for the whole member expression and `@variable`/`@property` for its child identifiers. Likewise, a binary expression emits `@expression` for the whole node and contextual captures for identifier operands. Editors that highlight by byte range should apply their own capture-priority policy; the query guarantees one capture per node range, not that nested node ranges never overlap.

See [query audit](query-audit.md) for the structural audit, before/after capture counts, and verification evidence.

## Scope boundary

The following Strudel API-name capture groups were removed because they encode semantic aliases rather than syntax:

- `@function.control`
- `@function.audio`
- `@function.pattern`
- `@function.effect`
- `@function.envelope`
- `@function.time`
- `@function.utility`
- `@function.midi`
- `@function.sample`

The generic identifier fallback and broad parameter/container captures were also removed. Capture names in the table above are the official highlight query API. Renaming a capture, changing its syntactic meaning, or reintroducing API-name-specific captures is a breaking query API change and must be documented here.

## Verification

- Capture inventory: `grep -oE '@[a-zA-Z0-9_.-]+' queries/highlights.scm | sort -u`; all 16 emitted names are listed above.
- `make test-query` compiles and executes every official query, then checks duplicate captures against `test.strdl`, `test-local.strdl`, and `test/query/determinism.strdl`.
- `tree-sitter parse test/query/determinism.strdl` reports no `ERROR` or `MISSING` nodes.
