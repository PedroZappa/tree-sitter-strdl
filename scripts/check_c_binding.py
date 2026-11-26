#!/usr/bin/env python3
"""Verify the C binding header and generated parser link into a usable library."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent
HEADER = "bindings/c/tree_sitter/tree-sitter-strudel.h"
TEST_SOURCE = "test/c/binding_test.c"
PARSER_SOURCE = "src/parser.c"
EXPECTED_OUTPUT = "C binding language pointer ok"


def run(command: list[str], label: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "no output"
        raise RuntimeError(f"{label} failed with exit {result.returncode}: {detail}")
    return result


def main(argv: list[str]) -> int:
    compiler = argv[1] if len(argv) > 1 else os.environ.get("CC", "cc")
    for relative in (HEADER, TEST_SOURCE, PARSER_SOURCE):
        if not (ROOT / relative).is_file():
            print(f"C binding check failed: missing {relative}", file=sys.stderr)
            print_terminal_status("C binding", None, ["see stderr diagnostics"])
            return 1

    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-c-") as temporary:
            executable = Path(temporary) / "binding_test"
            run(
                [
                    compiler,
                    "-std=c11",
                    "-Wall",
                    "-Wextra",
                    "-I",
                    str(ROOT / "bindings/c"),
                    "-I",
                    str(ROOT / "src"),
                    str(ROOT / TEST_SOURCE),
                    str(ROOT / PARSER_SOURCE),
                    "-o",
                    str(executable),
                ],
                "C binding compile",
            )
            result = run([str(executable)], "C binding test")
            if EXPECTED_OUTPUT not in result.stdout:
                raise RuntimeError(f"C binding test printed unexpected output: {result.stdout!r}")
    except (OSError, RuntimeError) as error:
        print(f"C binding check failed: {error}", file=sys.stderr)
        print_terminal_status("C binding", None, ["see stderr diagnostics"])
        return 1

    print(
        "C binding: header compiled and tree_sitter_strudel() returned a non-null language pointer"
    )
    print_terminal_status(
        "C binding",
        True,
        [
            "header compiled",
            "symbol linked",
            "language pointer validated",
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
