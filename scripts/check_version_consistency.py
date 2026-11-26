#!/usr/bin/env python3
"""Check that release versions agree across package metadata."""

from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path
from typing import Any

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"version consistency check failed: {message}", file=sys.stderr)
        self.failures += 1


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def read_json(path: str) -> dict[str, Any]:
    value = json.loads(read_text(path))
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object")
    return value


def read_toml(path: str) -> dict[str, Any]:
    value = tomllib.loads(read_text(path))
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a TOML table")
    return value


def regex_version(path: str, pattern: str) -> str | None:
    match = re.search(pattern, read_text(path), re.MULTILINE)
    return match.group(1) if match else None


def compare(check: Checker, source: str, actual: object, expected: str) -> None:
    check.require(actual == expected, f"{source} version is {actual!r}, expected {expected!r}")


def main() -> int:
    check = Checker()

    try:
        package = read_json("package.json")
        expected = package.get("version")
        check.require(isinstance(expected, str) and bool(expected), "package.json lacks a version")
        if not isinstance(expected, str) or not expected:
            expected = ""
        compare(check, "package.json", expected, expected)

        lock = read_json("package-lock.json")
        compare(check, "package-lock.json", lock.get("version"), expected)
        root_package = lock.get("packages", {})
        compare(
            check,
            "package-lock.json root package",
            root_package.get("", {}).get("version") if isinstance(root_package, dict) else None,
            expected,
        )

        tree_sitter = read_json("tree-sitter.json")
        metadata = tree_sitter.get("metadata", {})
        compare(
            check,
            "tree-sitter.json",
            metadata.get("version") if isinstance(metadata, dict) else None,
            expected,
        )

        cargo = read_toml("Cargo.toml")
        cargo_package = cargo.get("package", {})
        compare(
            check,
            "Cargo.toml",
            cargo_package.get("version") if isinstance(cargo_package, dict) else None,
            expected,
        )

        cargo_lock = read_toml("Cargo.lock")
        locked = [
            entry.get("version")
            for entry in cargo_lock.get("package", [])
            if isinstance(entry, dict) and entry.get("name") == "tree-sitter-strudel"
        ]
        check.require(
            len(locked) == 1 and locked[0] == expected,
            f"Cargo.lock crate version is {locked!r}, expected [{expected!r}]",
        )

        pyproject = read_toml("pyproject.toml")
        project = pyproject.get("project", {})
        compare(
            check,
            "pyproject.toml",
            project.get("version") if isinstance(project, dict) else None,
            expected,
        )

        compare(
            check,
            "Makefile",
            regex_version("Makefile", r"^VERSION\s*:=\s*(\S+)$"),
            expected,
        )
        compare(
            check,
            "CMakeLists.txt",
            regex_version("CMakeLists.txt", r'^\s+VERSION\s+"([^"]+)"\s*$'),
            expected,
        )
        compare(
            check,
            "tree-sitter-strudel.pc",
            regex_version("tree-sitter-strudel.pc", r"^Version:\s*(\S+)\s*$"),
            expected,
        )
    except (OSError, TypeError, ValueError, json.JSONDecodeError, tomllib.TOMLDecodeError) as error:
        print(f"version consistency check failed: {error}", file=sys.stderr)
        check.failures += 1
        expected = ""

    if check.failures:
        print_terminal_status(
            "version consistency",
            False,
            [f"{check.failures} failed assertion(s); see stderr diagnostics"],
        )
        return 1

    print(f"version consistency: {expected} aligned across 10 sources")
    print_terminal_status("version consistency", True, [f"aligned at {expected}"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
