#!/usr/bin/env python3
"""Compare incremental and fresh parse trees for recorded editing sequences."""

import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TREE_SITTER = REPO_ROOT / "node_modules" / ".bin" / "tree-sitter"
SEQUENCES_PATH = REPO_ROOT / "test" / "fixtures" / "incremental_sequences.json"
ANSI = re.compile(r"\x1b\[[0-9;]*[mK]")


def matches(text: str, needle: str) -> list[int]:
    positions = []
    start = 0
    while True:
        position = text.find(needle, start)
        if position < 0:
            return positions
        positions.append(position)
        start = position + 1


def apply_edits(source: str, edits: list[dict]) -> tuple[str, list[str]]:
    current = source
    cli_edits = []
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
    return current, cli_edits


def normalize(output: str) -> str:
    lines = []
    for line in output.splitlines():
        if "\tParse:" in line:
            continue
        lines.append(ANSI.sub("", line))
    return "\n".join(lines)


def run_parse(path: Path, cli_edits: list[str] | None = None) -> tuple[int, str, str]:
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
    return result.returncode, normalize(result.stdout), result.stderr


def selected_sequences(data: dict, filters: list[str]) -> list[dict]:
    sequences = data["sequences"]
    if not filters:
        return sequences
    return [
        sequence
        for sequence in sequences
        if any(
            term in sequence["id"] or term in sequence.get("categories", [])
            for term in filters
        )
    ]


def compare_sequence(
    sequence: dict,
    fixtures: dict[str, str],
    fixture_paths: dict[str, str],
    temp_dir: Path,
) -> list[str]:
    source = fixtures[sequence["fixture"]]
    final_source, cli_edits = apply_edits(source, sequence["edits"])

    base_path = REPO_ROOT / fixture_paths[sequence["fixture"]]
    incremental_code, incremental_tree, incremental_stderr = run_parse(base_path, cli_edits)
    if incremental_code != 0:
        return [f"incremental parse failed: {incremental_stderr.strip()}"]

    final_path = temp_dir / f"{sequence['id']}.strdl"
    final_path.write_text(final_source, encoding="utf-8")
    fresh_code, fresh_tree, fresh_stderr = run_parse(final_path)
    if fresh_code != 0:
        return [f"fresh parse failed: {fresh_stderr.strip()}"]

    if incremental_tree == fresh_tree:
        return []

    diff = difflib.unified_diff(
        fresh_tree.splitlines(),
        incremental_tree.splitlines(),
        fromfile="fresh",
        tofile="incremental",
        lineterm="",
    )
    return ["incremental tree differs from fresh tree", *diff]


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
        key: (REPO_ROOT / path).read_text(encoding="utf-8")
        for key, path in fixture_paths.items()
    }
    selected = selected_sequences(data, args.filter)

    failures = 0
    with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-incremental-") as temp:
        temp_dir = Path(temp)
        for sequence in selected:
            problems = compare_sequence(sequence, fixtures, fixture_paths, temp_dir)
            if problems:
                failures += 1
                print(f"FAIL {sequence['id']}")
                for problem in problems:
                    print(f"  {problem}")
            else:
                print(f"PASS {sequence['id']}")

    total = len(selected)
    print(f"Incremental/fresh comparisons: {total - failures}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
