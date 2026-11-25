#!/usr/bin/env python3
"""Assert that a query emits an expected capture on probe-selected ranges.

The probe query identifies a syntactic role without naming API functions. The
official query must capture every selected range with the expected capture
name. Additional captures on the same range are allowed, which makes the check
usable for both highlights and locals queries.
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
        captures.setdefault(location, []).append(
            (match["name"], match["text"] or "")
        )

    return captures


def main(argv: list[str]) -> int:
    if len(argv) < 6:
        print(
            "usage: check_query_captures.py <tree-sitter> <query.scm> "
            "<probe.scm> <expected-capture> <label> <fixture>...",
            file=sys.stderr,
        )
        return 2

    tree_sitter, query, probe, expected, label, *fixtures = argv
    fixture_names = {Path(fixture).name for fixture in fixtures}

    probe_captures = run_query(tree_sitter, probe, fixtures, fixture_names)
    if not probe_captures:
        print(f"check failed: probe query selected no {label} ranges", file=sys.stderr)
        return 1

    official_captures = run_query(tree_sitter, query, fixtures, fixture_names)
    missing: list[tuple[Location, str]] = []
    for location, probe_matches in probe_captures.items():
        names = [name for name, _ in official_captures.get(location, [])]
        if expected not in names:
            missing.append((location, probe_matches[0][1]))

    if missing:
        print(
            f"check failed: {len(missing)} of {len(probe_captures)} {label} "
            f"ranges lacked @{expected}",
            file=sys.stderr,
        )
        for location, _ in missing[:20]:
            filename, start_row, start_column, end_row, end_column = location
            text = probe_captures[location][0][1]
            print(
                f"  {filename}:{start_row}:{start_column}-{end_row}:{end_column} "
                f"text: `{text}`",
                file=sys.stderr,
            )
        return 1

    print(
        f"verified {len(probe_captures)} {label} ranges; "
        f"all received @{expected}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
