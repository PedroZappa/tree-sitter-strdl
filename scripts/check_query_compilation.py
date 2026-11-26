#!/usr/bin/env python3
"""Compile official queries and verify that invalid queries are rejected.

Each query is compiled with `tree-sitter query` against an empty source file.
This checks query syntax, node types, and field names without mixing in capture
behavior, while avoiding the CLI's interactive mode (which waits for source
text on stdin when no source path is given). Negative controls confirm that
compilation failures are detectable.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from terminal_report import print_terminal_status

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


def grammar_args() -> list[str]:
    lib_path = os.environ.get("TREE_SITTER_LIB_PATH")
    if lib_path:
        return ["--lib-path", lib_path, "--lang-name", "strudel"]
    return ["--grammar-path", "."]


def compile_query(tree_sitter: str, query: str, source: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [tree_sitter, "query", "--quiet", *grammar_args(), query, source],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
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

    with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-query-") as temp_dir:
        source_path = Path(temp_dir) / "empty.strdl"
        source_path.write_text("", encoding="utf-8")

        for query in queries:
            result = compile_query(tree_sitter, query, str(source_path))
            if result.returncode != 0:
                report_failure(f"could not compile {query}", result)
                failures += 1
            else:
                print(f"compiled: {query}")

        for label, (source, expected_error) in NEGATIVE_CONTROLS.items():
            query_path = Path(temp_dir) / f"{label.replace(' ', '-')}.scm"
            query_path.write_text(source, encoding="utf-8")
            result = compile_query(tree_sitter, str(query_path), str(source_path))
            output = clean(result.stderr) or clean(result.stdout)

            if result.returncode == 0:
                print(
                    f"query compilation check failed: {label} was accepted",
                    file=sys.stderr,
                )
                failures += 1
            elif expected_error not in output:
                print(
                    f"query compilation check failed: {label} failed for an unexpected reason",
                    file=sys.stderr,
                )
                if output:
                    print(output, file=sys.stderr)
                failures += 1
            else:
                print(f"rejected: {label}")

    if failures:
        print_terminal_status(
            "query compilation",
            False,
            [f"{failures} issue(s); see stderr diagnostics"],
        )
        return 1

    print(
        f"query compilation: {len(queries)} official queries compiled; "
        f"{len(NEGATIVE_CONTROLS)} negative controls rejected"
    )
    print_terminal_status(
        "query compilation",
        True,
        [f"{len(queries)} queries", f"{len(NEGATIVE_CONTROLS)} controls"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
