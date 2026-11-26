# Incremental editing sequences

This document defines the editing sequences used for incremental-parsing equivalence tests. The authoritative data is [test/fixtures/incremental_sequences.json](../test/fixtures/incremental_sequences.json).

## Fixtures

| Key              | File                                      | Role                                                                                                                                               |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `representative` | [`test.strdl`](../test.strdl)             | Full documented Strudel arrangement with declarations, method chains, arrows, objects, template literals, mini-notation strings, and nested calls. |
| `compact`        | [`test-local.strdl`](../test-local.strdl) | Small composition probe used for short edit sequences.                                                                                             |

## Edit format

Each sequence starts from its fixture and applies edits in order. Every edit is a `replace` operation:

- `old`: exact text to find in the current source.
- `new`: replacement text; an empty string deletes the match.
- `occurrence`: zero-based match index among matches in the current source; defaults to `0`.

Using current-source matches rather than precomputed byte offsets keeps the sequences readable and lets a harness compute the byte range immediately before each edit.

## Sequences

| ID                             | Fixture        | Categories                                       | Description                                                           |
| ------------------------------ | -------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `method-chain-insertion`       | representative | insertion, method chain                          | Insert `.gain(0.9)` into the first melody chain.                      |
| `pattern-string-replacement`   | representative | replacement, pattern string                      | Replace both copies of a mini-notation pattern string with a variant. |
| `declaration-deletion`         | representative | deletion, declaration                            | Remove the unused `vox` declaration.                                  |
| `nested-object-edits`          | representative | nested edit, object literal                      | Change two properties inside the same `_pitchwheel` object.           |
| `malformed-call-repair`        | representative | malformed state, repair, call                    | Delete and restore the closing `)` of `setCps`.                       |
| `declaration-insertion`        | representative | insertion, declaration                           | Insert a new `m3` declaration before `dr`.                            |
| `arrow-parameter-rename`       | representative | replacement, arrow parameter                     | Rename both `layer` callback parameters.                              |
| `method-deletion`              | representative | deletion, method chain                           | Remove a `postgain` method from the first melody chain.               |
| `call-statement-insertion`     | representative | insertion, call statement                        | Insert a top-level `s("bd sd hh sd")` call.                           |
| `template-content-edit`        | representative | replacement, template content                    | Edit mini-notation content inside an opaque template literal.         |
| `compact-set-cps`              | compact        | replacement, compact fixture                     | Change the tempo in the compact composition.                          |
| `compact-declaration-deletion` | compact        | deletion, compact fixture                        | Remove a labeled declaration.                                         |
| `compact-malformed-repair`     | compact        | malformed state, repair, compact fixture         | Delete and restore a closing `)`.                                     |
| `argument-deletion`            | representative | deletion, argument, call                         | Remove one argument from the `slider` call.                           |
| `object-property-deletion`     | representative | deletion, nested edit, object literal            | Remove one property from the first nested `_pitchwheel` object.       |
| `method-name-replacement`      | representative | replacement, member expression, method chain     | Change `lp` to `hp` in the first melody chain.                        |
| `nested-call-edit`             | representative | nested edit, call, method chain                  | Edit values inside a nested call used as a `velocity` argument.       |
| `nested-arrow-body-edit`       | representative | nested edit, arrow function                      | Edit an argument inside a `layer` arrow body.                         |
| `object-brace-repair`          | representative | malformed state, repair, object literal          | Delete and restore the closing `}` of an object literal.              |
| `string-quote-repair`          | compact        | malformed state, repair, string, compact fixture | Delete and restore a closing `"` through an unterminated string.      |
| `array-bracket-repair`         | representative | malformed state, repair, array, nested edit      | Delete and restore a closing `]` inside the `arrange` call.           |

These 21 sequences cover insertion, deletion, replacement, nested edits, and temporary malformed states. Deletion coverage spans whole declarations, labeled statements, chain methods, call arguments, and nested object properties. Replacement coverage spans string contents, template contents, binding identifiers, member-expression method names, and numeric literals. Nested-edit coverage spans object literals, nested call arguments, arrow-function bodies, and array elements inside `arrange`. Malformed-state coverage spans missing call parentheses, missing object braces, unterminated strings, and missing array brackets. Each sequence ends in a complete source, which the harness now enforces.

## Running comparisons

`make test-incremental` replays every sequence one edit at a time. After each edit it compares the incremental parse tree (all edits through that step applied to the original fixture) against a fresh parse of the source at that step. This checks intermediate states, including malformed ones, rather than only the final source. The summary reports both all step comparisons and the final-source comparison separately, so final-state equivalence is explicit. Set `INCREMENTAL_FILTER` to a category or sequence ID to run a subset, for example `make test-incremental INCREMENTAL_FILTER=malformed-state`.

See [incremental equivalence test procedure](incremental-equivalence-procedure.md) for the full comparison procedure, pass/fail rules, output format, and limitations.
