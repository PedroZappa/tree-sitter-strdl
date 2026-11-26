#!/usr/bin/env python3
"""Check that official queries are registered, packaged, and exported.

The files under ``queries/`` are the official query inventory. Each one must be
registered in both ``tree-sitter.json`` and the legacy ``package.json``
metadata, included by every packaging rule that carries queries, and exported
by the Python and Rust bindings.
"""

from __future__ import annotations

import fnmatch
import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUERY_KINDS = {
    "highlights": "highlights.scm",
    "injections": "injections.scm",
    "locals": "locals.scm",
    "tags": "tags.scm",
}


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"query registration check failed: {message}", file=sys.stderr)
        self.failures += 1


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def read_json(path: str) -> dict:
    value = json.loads(read_text(path))
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object")
    return value


def as_paths(value: object) -> list[str] | None:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return value
    return None


def covers(path: str, patterns: object) -> bool:
    return isinstance(patterns, list) and any(
        fnmatch.fnmatchcase(path, pattern) for pattern in patterns if isinstance(pattern, str)
    )


def all_covered(files: list[str], patterns: object, label: str, check: Checker) -> None:
    for filename in files:
        path = f"queries/{filename}"
        check.require(covers(path, patterns), f"{label} does not include {path}")


def single_entry(entries: object, label: str, check: Checker) -> dict:
    if not isinstance(entries, list) or len(entries) != 1:
        check.require(False, f"{label} must contain exactly one entry")
        return {}
    entry = entries[0]
    if not isinstance(entry, dict):
        check.require(False, f"{label} entry must be an object")
        return {}
    return entry


def query_files(check: Checker) -> dict[str, str]:
    files = sorted(path.name for path in (ROOT / "queries").glob("*.scm"))
    check.require(bool(files), "no official query files found")
    inventory: dict[str, str] = {}
    for filename in files:
        kind = Path(filename).stem
        expected = QUERY_KINDS.get(kind)
        check.require(
            expected == filename,
            f"unknown query file queries/{filename} has no registration kind",
        )
        if expected == filename:
            inventory[kind] = filename
    return inventory


def check_metadata(inventory: dict[str, str], label: str, entries: object, check: Checker) -> None:
    entry = single_entry(entries, label, check)
    for kind, filename in inventory.items():
        paths = as_paths(entry.get(kind, []))
        check.require(
            paths == [f"queries/{filename}"],
            f"{label} registers {kind} as {paths!r}, expected ['queries/{filename}']",
        )

    for kind in QUERY_KINDS:
        if kind in inventory:
            continue
        if kind not in entry:
            continue
        paths = as_paths(entry[kind])
        check.require(paths == [], f"{label} registers absent {kind} query")


def check_packaging(files: list[str], check: Checker) -> None:
    package = read_json("package.json")
    all_covered(files, package.get("files"), "package.json files", check)

    cargo = tomllib.loads(read_text("Cargo.toml"))
    cargo_include = cargo.get("package", {}).get("include")
    all_covered(files, cargo_include, "Cargo.toml include", check)

    setup_py = read_text("setup.py")
    check.require(
        'self.copy_tree("queries", dest)' in setup_py,
        "setup.py does not copy the queries directory into the Python package",
    )
    check.require(
        'self.filelist.recursive_include("queries", "*.scm")' in setup_py,
        "setup.py does not include query files in source distributions",
    )
    check.require(
        '"tree_sitter_strudel.queries": ["*.scm"]' in setup_py,
        "setup.py does not declare query files as Python package data",
    )

    swift = read_text("Package.swift")
    check.require('.copy("queries")' in swift, "Package.swift does not copy queries")

    makefile = read_text("Makefile")
    check.require(
        "install -m644 queries/*.scm" in makefile,
        "Makefile install rule does not install query files",
    )

    local_install = read_text("scripts/local_install.sh")
    check.require(
        "cp queries/*scm" in local_install,
        "local_install.sh does not copy query files",
    )


def check_bindings(inventory: dict[str, str], check: Checker) -> None:
    python_init = read_text("bindings/python/tree_sitter_strudel/__init__.py")
    python_stub = read_text("bindings/python/tree_sitter_strudel/__init__.pyi")
    rust = read_text("bindings/rust/lib.rs")

    all_match = re.search(r"__all__ = \[(.*?)\]", python_init, re.DOTALL)
    exports = all_match.group(1) if all_match else ""

    for kind, filename in inventory.items():
        constant = f"{kind.upper()}_QUERY"
        check.require(
            f'if name == "{constant}":' in python_init,
            f"Python binding does not export {constant}",
        )
        check.require(
            f'return _get_query("{constant}", "{filename}")' in python_init,
            f"Python binding does not load {filename} for {constant}",
        )
        check.require(
            f'"{constant}"' in exports,
            f"Python __all__ does not include {constant}",
        )
        check.require(
            re.search(rf"^{constant}: Final\[str\]$", python_stub, re.MULTILINE) is not None,
            f"Python stub does not declare {constant}",
        )
        check.require(
            f'pub const {constant}: &str = include_str!("../../queries/{filename}");' in rust,
            f"Rust binding does not export {constant}",
        )

    for kind in QUERY_KINDS:
        if kind in inventory:
            continue
        constant = f"{kind.upper()}_QUERY"
        check.require(
            re.search(rf"^\s*if name == \"{constant}\":", python_init, re.MULTILINE) is None,
            f"Python binding exports absent {kind} query",
        )
        check.require(
            re.search(rf"^{constant}: Final\[str\]$", python_stub, re.MULTILINE) is None,
            f"Python stub declares absent {kind} query",
        )
        check.require(
            re.search(rf"^\s*pub const {constant}:", rust, re.MULTILINE) is None,
            f"Rust binding exports absent {kind} query",
        )


def main() -> int:
    check = Checker()
    inventory = query_files(check)
    files = list(inventory.values())

    tree_sitter = read_json("tree-sitter.json")
    package = read_json("package.json")
    check_metadata(
        inventory,
        "tree-sitter.json grammars",
        tree_sitter.get("grammars"),
        check,
    )
    check_metadata(
        inventory,
        "package.json tree-sitter",
        package.get("tree-sitter"),
        check,
    )
    check_packaging(files, check)
    check_bindings(inventory, check)

    if check.failures:
        return 1

    names = ", ".join(f"queries/{filename}" for filename in files)
    print(f"query registration: {len(files)} official queries registered: {names}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
