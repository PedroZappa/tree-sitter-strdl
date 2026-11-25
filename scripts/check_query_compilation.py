#!/usr/bin/env python3
"""Compile official queries and verify that invalid queries are rejected.

Each query is compiled with `tree-sitter query` without source paths. This
checks query syntax, node types, and field names without mixing in capture
behavior. Negative controls confirm that compilation failures are detectable.
"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")

NEGATIVE_CONTROLS: dict[str, tuple[str, str]] = {
    "invalid node type": (
        "(definitely_not_a_node) @scratch\n",
        "Invalid node type",
    ),
    "invalid field name": (
        "(call_expression nonexistent_field: (identifier) @scratch)\n",
        "Invalid field name",
    ),
}


def clean(text: str) -> str:
    return ANSI_RE.sub("", text).strip()


def compile_query(tree_sitter: str, query: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [tree_sitter, "query", "--quiet", "--grammar-path", ".", query],
        capture_output=True,
        text=True,
        check=False,
    )


def report_failure(label: str, result: subprocess.CompletedProcess[str]) -> None:
    details = clean(result.stderr) or clean(result.stdout)
    print(f"query compilation check failed: {label}", file=sys.stderr)
    if details:
        print(details, file=sys.stderr)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(
            "usage: check_query_compilation.py <tree-sitter> <query.scm>...",
            file=sys.stderr,
        )
        return 2

    tree_sitter, *queries = argv
    failures = 0

    for query in queries:
        result = compile_query(tree_sitter, query)
        if result.returncode != 0:
            report_failure(f"could not compile {query}", result)
            failures += 1
        else:
            print(f"compiled: {query}")

    with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-query-") as temp_dir:
        for label, (source, expected_error) in NEGATIVE_CONTROLS.items():
            query_path = Path(temp_dir) / f"{label.replace(' ', '-')}.scm"
            query_path.write_text(source, encoding="utf-8")
            result = compile_query(tree_sitter, str(query_path))
            output = clean(result.stderr) or clean(result.stdout)

            if result.returncode == 0:
                print(
                    f"query compilation check failed: {label} was accepted",
                    file=sys.stderr,
                )
                failures += 1
            elif expected_error not in output:
                print(
                    f"query compilation check failed: {label} failed for an "
                    "unexpected reason",
                    file=sys.stderr,
                )
                if output:
                    print(output, file=sys.stderr)
                failures += 1
            else:
                print(f"rejected: {label}")

    if failures:
        return 1

    print(
        f"query compilation: {len(queries)} official queries compiled; "
        f"{len(NEGATIVE_CONTROLS)} negative controls rejected"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
