# Incremental editing sequences

This document defines the editing sequences used for incremental-parsing equivalence tests. The authoritative data is [test/fixtures/incremental_sequences.json](../test/fixtures/incremental_sequences.json).

## Fixtures

| Key | File | Role |
| --- | --- | --- |
| `representative` | [`test.strdl`](../test.strdl) | Full documented Strudel arrangement with declarations, method chains, arrows, objects, template literals, mini-notation strings, and nested calls. |
| `compact` | [`test-local.strdl`](../test-local.strdl) | Small composition probe used for short edit sequences. |

## Edit format

Each sequence starts from its fixture and applies edits in order. Every edit is a `replace` operation:

- `old`: exact text to find in the current source.
- `new`: replacement text; an empty string deletes the match.
- `occurrence`: zero-based match index among matches in the current source; defaults to `0`.

Using current-source matches rather than precomputed byte offsets keeps the sequences readable and lets a harness compute the byte range immediately before each edit.

## Sequences

| ID | Fixture | Categories | Description |
| --- | --- | --- | --- |
| `method-chain-insertion` | representative | insertion, method chain | Insert `.gain(0.9)` into the first melody chain. |
| `pattern-string-replacement` | representative | replacement, pattern string | Replace both copies of a mini-notation pattern string with a variant. |
| `declaration-deletion` | representative | deletion, declaration | Remove the unused `vox` declaration. |
| `nested-object-edits` | representative | nested edit, object literal | Change two properties inside the same `_pitchwheel` object. |
| `malformed-call-repair` | representative | malformed state, repair, call | Delete and restore the closing `)` of `setCps`. |
| `declaration-insertion` | representative | insertion, declaration | Insert a new `m3` declaration before `dr`. |
| `arrow-parameter-rename` | representative | replacement, arrow parameter | Rename both `layer` callback parameters. |
| `method-deletion` | representative | deletion, method chain | Remove a `postgain` method from the first melody chain. |
| `call-statement-insertion` | representative | insertion, call statement | Insert a top-level `s("bd sd hh sd")` call. |
| `template-content-edit` | representative | replacement, template content | Edit mini-notation content inside an opaque template literal. |
| `compact-set-cps` | compact | replacement, compact fixture | Change the tempo in the compact composition. |
| `compact-declaration-deletion` | compact | deletion, compact fixture | Remove a labeled declaration. |
| `compact-malformed-repair` | compact | malformed state, repair, compact fixture | Delete and restore a closing `)`. |
| `argument-deletion` | representative | deletion, argument, call | Remove one argument from the `slider` call. |
| `object-property-deletion` | representative | deletion, nested edit, object literal | Remove one property from the first nested `_pitchwheel` object. |

These 15 sequences cover insertion, deletion, replacement, nested edits, and temporary malformed states. Deletion coverage spans whole declarations, labeled statements, chain methods, call arguments, and nested object properties. The malformed states are intermediate inputs; each sequence ends in a complete source.

## Running comparisons

`make test-incremental` replays every sequence and compares each incremental parse tree against a fresh parse of the same final source. Set `INCREMENTAL_FILTER` to a category or sequence ID to run a subset, for example `make test-incremental INCREMENTAL_FILTER=insertion`.

The detailed equivalence-test procedure is a separate roadmap item.
