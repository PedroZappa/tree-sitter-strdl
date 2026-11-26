#!/usr/bin/env python3
"""Compare incremental and fresh parse trees at every step of recorded edits."""

import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from terminal_report import print_terminal_status

REPO_ROOT = Path(__file__).resolve().parent.parent
TREE_SITTER = REPO_ROOT / "node_modules" / ".bin" / "tree-sitter"
SEQUENCES_PATH = REPO_ROOT / "test" / "fixtures" / "incremental_sequences.json"
ANSI = re.compile(r"\x1b\[[0-9;]*[mK]")
ERROR_NODE = re.compile(r"\b(?:ERROR|MISSING)\b")


def matches(text: str, needle: str) -> list[int]:
    positions = []
    start = 0
    while True:
        position = text.find(needle, start)
        if position < 0:
            return positions
        positions.append(position)
        start = position + 1


def apply_edits(source: str, edits: list[dict]) -> tuple[list[str], list[list[str]]]:
    """Return the source and cumulative CLI edits after each successive edit."""
    current = source
    cli_edits: list[str] = []
    sources: list[str] = []
    cumulative: list[list[str]] = []
    for index, edit in enumerate(edits):
        if edit.get("op", "replace") != "replace":
            raise ValueError(f"edit {index}: unsupported operation {edit.get('op')!r}")
        old = edit["old"]
        new = edit.get("new", "")
        occurrence = edit.get("occurrence", 0)
        positions = matches(current, old)
        if occurrence >= len(positions):
            raise ValueError(
                f"edit {index}: occurrence {occurrence} missing; {len(positions)} matches"
            )
        position = positions[occurrence]
        byte_position = len(current[:position].encode("utf-8"))
        removed_length = len(old.encode("utf-8"))
        cli_edits.append(f"{byte_position} {removed_length} {new}")
        current = current[:position] + new + current[position + len(old) :]
        sources.append(current)
        cumulative.append(list(cli_edits))
    return sources, cumulative


def normalize(output: str) -> str:
    lines = []
    for line in output.splitlines():
        if "\tParse:" in line or "\tEdit:" in line:
            continue
        lines.append(ANSI.sub("", line))
    return "\n".join(lines)


def run_parse(path: Path, cli_edits: list[str] | None = None) -> tuple[str | None, str]:
    """Return the CST and stderr; parse errors still yield a usable CST."""
    command = [str(TREE_SITTER), "parse", "--cst"]
    for edit in cli_edits or []:
        command.extend(["--edits", edit])
    command.extend(["--", str(path)])
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    tree = normalize(result.stdout)
    if "source_file" not in tree:
        return None, result.stderr
    return tree, result.stderr


def tree_has_errors(tree: str) -> bool:
    return bool(ERROR_NODE.search(tree))


def selected_sequences(data: dict, filters: list[str]) -> list[dict]:
    sequences = data["sequences"]
    if not filters:
        return sequences
    return [
        sequence
        for sequence in sequences
        if any(term in sequence["id"] or term in sequence.get("categories", []) for term in filters)
    ]


def catalog_problems(data: dict, fixtures: dict[str, str]) -> list[str]:
    """Check structural invariants that do not require parsing."""
    problems: list[str] = []
    seen_ids: set[str] = set()
    for sequence in data["sequences"]:
        sequence_id = sequence.get("id", "<missing id>")
        if sequence_id in seen_ids:
            problems.append(f"duplicate sequence id: {sequence_id}")
        seen_ids.add(sequence_id)
        if sequence.get("fixture") not in fixtures:
            problems.append(f"{sequence_id}: unknown fixture {sequence.get('fixture')!r}")
        if not sequence.get("edits"):
            problems.append(f"{sequence_id}: no edits")
    return problems


def compare_sequence(
    sequence: dict,
    fixtures: dict[str, str],
    fixture_paths: dict[str, str],
    temp_dir: Path,
) -> tuple[list[str], int, int, bool]:
    """Return (problems, step count, malformed step count, final source matched)."""
    source = fixtures[sequence["fixture"]]
    sources, cumulative_edits = apply_edits(source, sequence["edits"])
    base_path = REPO_ROOT / fixture_paths[sequence["fixture"]]

    problems: list[str] = []
    malformed_steps = 0
    final_step = len(sources)
    final_matched = False
    final_clean = False
    for step, (step_source, step_edits) in enumerate(zip(sources, cumulative_edits), start=1):
        incremental_tree, incremental_stderr = run_parse(base_path, step_edits)
        if incremental_tree is None:
            problems.append(f"step {step}: incremental parse failed: {incremental_stderr.strip()}")
            continue

        step_path = temp_dir / f"{sequence['id']}-step-{step}.strdl"
        step_path.write_text(step_source, encoding="utf-8")
        fresh_tree, fresh_stderr = run_parse(step_path)
        if fresh_tree is None:
            problems.append(f"step {step}: fresh parse failed: {fresh_stderr.strip()}")
            continue

        malformed = tree_has_errors(fresh_tree)
        if malformed:
            malformed_steps += 1
        if step == final_step:
            final_clean = not malformed

        if incremental_tree == fresh_tree:
            if step == final_step:
                final_matched = True
            continue

        diff = difflib.unified_diff(
            fresh_tree.splitlines(),
            incremental_tree.splitlines(),
            fromfile="fresh",
            tofile="incremental",
            lineterm="",
        )
        problems.append(f"step {step}: incremental tree differs from fresh tree")
        problems.extend(diff)

    if final_matched and not final_clean:
        problems.append("final source contains ERROR or MISSING nodes")
        final_matched = False

    return problems, len(sources), malformed_steps, final_matched


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "filter",
        nargs="*",
        help="limit runs to sequence IDs or categories containing any term",
    )
    args = parser.parse_args()

    data = json.loads(SEQUENCES_PATH.read_text(encoding="utf-8"))
    fixture_paths = data["fixtures"]
    fixtures = {
        key: (REPO_ROOT / path).read_text(encoding="utf-8") for key, path in fixture_paths.items()
    }
    selected = selected_sequences(data, args.filter)

    structural_problems = catalog_problems(data, fixtures)
    for problem in structural_problems:
        print(f"CATALOG PROBLEM: {problem}")
    failures = len(structural_problems)
    total_steps = 0
    malformed_steps = 0
    final_passed = 0
    with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-incremental-") as temp:
        temp_dir = Path(temp)
        for sequence in selected:
            problems, steps, malformed, final_matched = compare_sequence(
                sequence, fixtures, fixture_paths, temp_dir
            )
            total_steps += steps
            malformed_steps += malformed
            if final_matched:
                final_passed += 1
            suffix = f"{steps} steps"
            if malformed:
                suffix += f", {malformed} malformed"
            if problems:
                failures += 1
                print(f"FAIL {sequence['id']} ({suffix})")
                for problem in problems:
                    print(f"  {problem}")
            else:
                print(f"PASS {sequence['id']} ({suffix})")

    total = len(selected)
    print(
        f"Incremental/fresh comparisons: {total - failures}/{total} sequences, "
        f"{total_steps} steps, {malformed_steps} malformed steps"
    )
    print(f"Final-source comparisons: {final_passed}/{total} passed")
    print_terminal_status(
        "incremental equivalence",
        failures == 0,
        [
            f"{total - failures}/{total} sequences",
            f"{total_steps} steps",
            f"{final_passed}/{total} final matches",
        ],
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
