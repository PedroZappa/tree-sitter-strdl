#!/usr/bin/env python3
"""Build the Python binding in a temporary tree and verify its public surface."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = "tree_sitter_strudel"
QUERY_SNIPPETS = {
    "HIGHLIGHTS_QUERY": "@function.call",
    "LOCALS_QUERY": "@local.scope",
}
EXPECTED_OUTPUT = "python binding: capsule and query exports ok"


def run(
    command: list[str], label: str, cwd: Path, env: dict[str, str]
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "no output"
        raise RuntimeError(f"{label} failed with exit {result.returncode}: {detail}")
    return result


CHILD_CODE = r"""
import ctypes
import sys

import tree_sitter_strudel as module

snippets = sys.argv[1:]
capsule = module.language()
if capsule is None:
    raise SystemExit("language() returned None")
if type(capsule).__name__ != "PyCapsule":
    raise SystemExit(f"language() returned {type(capsule).__name__!r}, expected PyCapsule")

api = ctypes.pythonapi
api.PyCapsule_GetName.argtypes = [ctypes.py_object]
api.PyCapsule_GetName.restype = ctypes.c_char_p
api.PyCapsule_GetPointer.argtypes = [ctypes.py_object, ctypes.c_char_p]
api.PyCapsule_GetPointer.restype = ctypes.c_void_p
name = api.PyCapsule_GetName(capsule)
if name != b"tree_sitter.Language":
    raise SystemExit(f"capsule name is {name!r}, expected b'tree_sitter.Language'")
if not api.PyCapsule_GetPointer(capsule, name):
    raise SystemExit("capsule does not contain a language pointer")

for name, snippet in zip(("HIGHLIGHTS_QUERY", "LOCALS_QUERY"), snippets):
    value = getattr(module, name)
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(f"{name} is not a non-empty string")
    if snippet not in value:
        raise SystemExit(f"{name} does not contain {snippet!r}")

print("python binding: capsule and query exports ok")
"""


def main(argv: list[str]) -> int:
    interpreter = argv[1] if len(argv) > 1 else sys.executable
    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-python-") as temporary:
            root = Path(temporary)
            library = root / "lib"
            build = root / "build"
            egg = root / "egg"
            egg.mkdir()
            run(
                [
                    interpreter,
                    "setup.py",
                    "egg_info",
                    "--egg-base",
                    str(egg),
                    "build",
                    "--build-lib",
                    str(library),
                    "--build-temp",
                    str(build),
                ],
                "Python binding build",
                ROOT,
                os.environ.copy(),
            )

            package = library / PACKAGE
            extensions = list(package.glob("_binding*"))
            if not extensions:
                raise RuntimeError("Python binding build produced no _binding extension")
            for filename in ("highlights.scm", "locals.scm"):
                if not (package / "queries" / filename).is_file():
                    raise RuntimeError(f"Python binding package is missing queries/{filename}")

            env = os.environ.copy()
            env["PYTHONPATH"] = str(library) + os.pathsep + env.get("PYTHONPATH", "")
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            result = run(
                [interpreter, "-c", CHILD_CODE, *(QUERY_SNIPPETS.values())],
                "Python binding check",
                root,
                env,
            )
            if EXPECTED_OUTPUT not in result.stdout:
                raise RuntimeError(
                    f"Python binding check printed unexpected output: {result.stdout!r}"
                )
    except (OSError, RuntimeError) as error:
        print(f"Python binding check failed: {error}", file=sys.stderr)
        print_terminal_status("Python binding", None, ["see stderr diagnostics"])
        return 1

    print(
        "Python binding: extension built, language capsule validated, and official queries loaded"
    )
    print_terminal_status(
        "Python binding",
        True,
        [
            "extension built",
            "language capsule validated",
            "queries loaded",
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
