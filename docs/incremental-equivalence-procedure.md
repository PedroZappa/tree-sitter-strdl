# Incremental equivalence test procedure

This document describes how `tree-sitter-strdl` verifies that incremental parsing produces the same concrete syntax tree (CST) as a fresh parse of the same source. It owns the procedure for the Phase 4 roadmap item "Document the equivalence test procedure."

## Guarantee under test

For every recorded editing sequence and every step in it, the tree produced by applying all edits through that step to a previously parsed fixture must equal the tree produced by parsing the resulting source from scratch. This is checked at the final step as well as at intermediate steps, including steps whose source is temporarily malformed.

The check is about tree equivalence only. It does not judge whether error recovery is good, and it does not measure parsing latency.

## Inputs

| File                                                                                      | Role                                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`test/fixtures/incremental_sequences.json`](../test/fixtures/incremental_sequences.json) | Authoritative catalog of sequences and edits.                |
| [`test.strdl`](../test.strdl), [`test-local.strdl`](../test-local.strdl)                  | The source fixtures edited by the sequences.                 |
| [`scripts/test_incremental.py`](../scripts/test_incremental.py)                           | Harness that replays edits and compares trees.               |
| [`Makefile`](../Makefile)                                                                 | `test-incremental` target and `INCREMENTAL_FILTER` variable. |

The sequence catalog and fixtures are the sources of truth for what is tested. The harness is the source of truth for how the comparison is performed. See [incremental editing sequences](incremental-editing-sequences.md) for the catalog itself.

## Edit model

Each edit is a `replace` operation with:

- `old`: exact text to find in the **current** source.
- `new`: replacement text; an empty string deletes the match.
- `occurrence`: zero-based match index among current-source matches; defaults to `0`.

The harness computes a byte offset and removed byte length from the current source at each edit, then records the cumulative list of CLI edit strings. This matches Tree-sitter's edit semantics: each `--edits` entry is applied in order, with its position relative to the document after earlier edits.

The CLI edit string format is `<START_BYTE_OR_POSITION> <REMOVED_LENGTH> <NEW_TEXT>`. The harness uses byte offsets.

## Procedure

For each selected sequence:

1. Replay the edits in order. After each edit, record the resulting source and the cumulative CLI edit list through that edit.
2. For each recorded step:
   1. Run `tree-sitter parse --cst` on the original fixture with all cumulative `--edits` for that step. This is the incremental tree.
   2. Write the step's source to a temporary `.strdl` file and run `tree-sitter parse --cst` on it with no edits. This is the fresh tree.
   3. Normalize both outputs: remove ANSI color codes and drop `Parse:` and `Edit:` timing lines.
   4. Compare the normalized CST text exactly, including node kinds, fields, ranges, and literal text.
3. Track whether the last step matched, so final-source equivalence is reported separately from the aggregate step results.

The CLI exits nonzero when a parse contains `ERROR` or `MISSING` nodes, but it still writes a complete CST. The harness therefore treats a parse as usable when the normalized output contains a `source_file` node; a genuine CLI failure is one that produces no CST. Malformed steps are counted by detecting `ERROR`/`MISSING` nodes in the fresh tree.

## Running the comparison

```sh
make test-incremental
```

Run a subset by category, sequence ID, or any term contained in either:

```sh
make test-incremental INCREMENTAL_FILTER=insertion
make test-incremental INCREMENTAL_FILTER=malformed-state
make test-incremental INCREMENTAL_FILTER=object-brace-repair
```

The underlying script can be invoked directly with the same positional filters:

```sh
python3 scripts/test_incremental.py deletion
```

## Reading the output

Each sequence prints `PASS` or `FAIL` with its step count and, when applicable, the number of malformed steps:

```text
PASS malformed-call-repair (2 steps, 1 malformed)
```

Failures include the failing step number and a unified diff of the fresh and incremental trees. The summary reports three things separately:

```text
Incremental/fresh comparisons: 21/21 sequences, 29 steps, 5 malformed steps
Final-source comparisons: 21/21 passed
```

A run fails if any step's tree comparison fails or if either parse produces no CST. The command exits nonzero on failure and is wired into `make verify` and `make ci`, so it is a gating correctness check in local and CI runs.

## Current coverage

The catalog currently contains 21 sequences totalling 29 compared steps, of which 5 steps are malformed intermediates. Coverage includes insertions, deletions, replacements, nested edits, and temporary malformed states through missing call parentheses, missing object braces, unterminated strings, and missing array brackets. All 21 final-source comparisons pass, and the harness additionally rejects any final source whose fresh tree contains `ERROR` or `MISSING`.

Before parsing, the harness also checks catalog invariants: sequence IDs are unique, each fixture key exists, and each sequence has at least one edit. A catalog violation is reported as `CATALOG PROBLEM` and makes the run fail even if every parse comparison passes.

## Adding a sequence

1. Add an object to `sequences` in `test/fixtures/incremental_sequences.json` with a unique `id`, an existing fixture key, a `description`, `categories`, and one or more edits.
2. Choose `old` text that is unique or disambiguate it with `occurrence`.
3. Run `make test-incremental INCREMENTAL_FILTER=<new-id>` and confirm the sequence passes.
4. Add the sequence to the table and summary in [incremental editing sequences](incremental-editing-sequences.md).

If a new sequence exposes a tree mismatch, treat it as a real incremental-parsing regression: keep the sequence as a failing regression case and investigate the grammar or edit model rather than weakening the comparison.

## Scope and limitations

- The comparison uses the Tree-sitter CLI's `--cst` output. It does not exercise the Node.js binding API directly.
- It verifies equivalence, not recovery quality. Malformed intermediate steps are inputs whose trees must agree, not trees that are expected to be clean.
- Sequences are hand-recorded representative edits, not fuzzed or generated inputs.
- The harness does not measure fresh or incremental latency. Performance work belongs to the Phase 6 benchmarks.
- `make test-incremental` supports a local `INCREMENTAL_FILTER`; CI runs the complete catalog without a filter through `make ci`.

## Related documents

- [Incremental editing sequences](incremental-editing-sequences.md) — catalog, edit format, and category filters.
- [Grammar architecture](grammar-architecture.md) — recovery behavior and public syntax-tree structure.
- [CI](ci.md) — current CI gate and deferred checks.
