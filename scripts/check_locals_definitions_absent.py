#!/usr/bin/env python3
"""Fail when selected syntax nodes receive a locals definition capture.

A probe query selects the node ranges that must not define locals. The checker
then executes the official locals query and compares exact ranges. This avoids
hardcoding API names and works for any syntax role expressible as a query.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
CAPTURE_RE = re.compile(
    r"capture: (?:\d+ - )?(?P<name>[^,]+), "
    r"start: \((?P<start_row>\d+), (?P<start_column>\d+)\), "
    r"end: \((?P<end_row>\d+), (?P<end_column>\d+)\)"
    r"(?:, text: `(?P<text>.*)`)?$"
)
Location = tuple[str, int, int, int, int]


def run_query(
    tree_sitter: str, query: str, fixtures: list[str], fixture_names: set[str]
) -> dict[Location, list[tuple[str, str]]]:
    result = subprocess.run(
        [tree_sitter, "query", "--grammar-path", ".", query, *fixtures],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        sys.stdout.write(result.stdout)
        raise SystemExit(result.returncode)

    current_file: str | None = None
    captures: dict[Location, list[tuple[str, str]]] = {}

    for raw_line in result.stdout.splitlines():
        line = ANSI_RE.sub("", raw_line)
        stripped = line.strip()
        if stripped in fixture_names or Path(stripped).name in fixture_names:
            current_file = Path(stripped).name
            continue

        match = CAPTURE_RE.search(line)
        if match is None or current_file is None:
            continue

        location: Location = (
            current_file,
            int(match["start_row"]),
            int(match["start_column"]),
            int(match["end_row"]),
            int(match["end_column"]),
        )
        captures.setdefault(location, []).append((match["name"], match["text"] or ""))

    return captures


def main(argv: list[str]) -> int:
    if len(argv) < 5:
        print(
            "usage: check_locals_definitions_absent.py <tree-sitter> <locals.scm> "
            "<probe.scm> <label> <fixture>...",
            file=sys.stderr,
        )
        return 2

    tree_sitter, locals_query, probe_query, label, *fixtures = argv
    fixture_names = {Path(fixture).name for fixture in fixtures}

    probe_captures = run_query(tree_sitter, probe_query, fixtures, fixture_names)
    if not probe_captures:
        print(f"check failed: probe query selected no {label} ranges", file=sys.stderr)
        return 1

    locals_captures = run_query(tree_sitter, locals_query, fixtures, fixture_names)
    definition_ranges: dict[Location, list[str]] = {}
    for location, captures in locals_captures.items():
        names = [
            name for name, _ in captures if name.startswith("local.definition")
        ]
        if names:
            definition_ranges[location] = names

    overlaps = sorted(set(probe_captures) & set(definition_ranges))
    if overlaps:
        print(
            f"check failed: {len(overlaps)} {label} ranges received locals definitions",
            file=sys.stderr,
        )
        for filename, start_row, start_column, end_row, end_column in overlaps:
            text = probe_captures[(filename, start_row, start_column, end_row, end_column)][0][1]
            names = ", ".join(definition_ranges[(filename, start_row, start_column, end_row, end_column)])
            print(
                f"  {filename}:{start_row}:{start_column}-{end_row}:{end_column} "
                f"text: `{text}` -> {names}",
                file=sys.stderr,
            )
        return 1

    print(
        f"verified {len(probe_captures)} {label} ranges; "
        "none received local.definition captures"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
