#!/usr/bin/env python3
"""Fail when a highlight query emits multiple captures for one source range.

The check is deliberately narrow: it does not judge whether a capture name is
semantically correct. It verifies the Phase 5 determinism rule that a node must
not receive more than one highlight capture.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from terminal_report import print_terminal_status

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
CAPTURE_RE = re.compile(
    r"capture: \d+ - (?P<name>[^,]+), "
    r"start: \((?P<start_row>\d+), (?P<start_column>\d+)\), "
    r"end: \((?P<end_row>\d+), (?P<end_column>\d+)\), "
    r"text: `(?P<text>.*)`$"
)


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(
            "usage: check_query_determinism.py <tree-sitter> <query.scm> <fixture>...",
            file=sys.stderr,
        )
        return 2

    tree_sitter, query, *fixtures = argv
    fixture_names = {Path(fixture).name for fixture in fixtures}

    result = subprocess.run(
        [tree_sitter, "query", "--grammar-path", ".", query, *fixtures],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        sys.stdout.write(result.stdout)
        print_terminal_status("query determinism", None, ["CLI error; raw output above"])
        return result.returncode

    current_file: str | None = None
    captures: dict[tuple[str, int, int, int, int], list[str]] = {}

    for raw_line in result.stdout.splitlines():
        line = ANSI_RE.sub("", raw_line)
        stripped = line.strip()
        if stripped in fixture_names or Path(stripped).name in fixture_names:
            current_file = Path(stripped).name
            continue

        match = CAPTURE_RE.search(line)
        if match is None or current_file is None:
            continue

        location = (
            current_file,
            int(match["start_row"]),
            int(match["start_column"]),
            int(match["end_row"]),
            int(match["end_column"]),
        )
        captures.setdefault(location, []).append(match["name"])

    if not captures:
        print("query determinism check failed: no captures were produced", file=sys.stderr)
        print_terminal_status("query determinism", False, ["no captures"])
        return 1

    duplicates = {location: names for location, names in captures.items() if len(names) > 1}
    if duplicates:
        print("query determinism check failed: duplicate captures found", file=sys.stderr)
        for (filename, start_row, start_column, end_row, end_column), names in sorted(
            duplicates.items()
        ):
            joined = ", ".join(names)
            print(
                f"  {filename}:{start_row}:{start_column}-{end_row}:{end_column} -> {joined}",
                file=sys.stderr,
            )
        print_terminal_status(
            "query determinism",
            False,
            [f"{len(duplicates)} duplicate range(s)"],
        )
        return 1

    capture_count = sum(len(names) for names in captures.values())
    print(f"deterministic captures: {capture_count} captures across {len(captures)} ranges")
    print_terminal_status(
        "query determinism",
        True,
        [f"{capture_count} captures", f"{len(captures)} ranges"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
