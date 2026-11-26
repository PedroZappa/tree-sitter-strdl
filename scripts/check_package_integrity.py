#!/usr/bin/env python3
"""Check npm package contents against the committed package contract."""

from __future__ import annotations

import fnmatch
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = {
    "LICENSE",
    "README.md",
    "binding.gyp",
    "bindings/node/binding.cc",
    "bindings/node/index.d.ts",
    "bindings/node/index.js",
    "grammar.js",
    "package.json",
    "queries/highlights.scm",
    "queries/locals.scm",
    "src/grammar.json",
    "src/node-types.json",
    "src/parser.c",
    "src/tree_sitter/alloc.h",
    "src/tree_sitter/array.h",
    "src/tree_sitter/parser.h",
    "tree-sitter.json",
}

FORBIDDEN_PATTERNS = (
    "*.a",
    "*.dylib",
    "*.log",
    "*.o",
    "*.pc",
    "*.so",
    "*.tgz",
    "build/*",
    "docs/*",
    "node_modules/*",
    "scripts/*",
    "test/*",
)

EXPLICIT_SRC_FILES = (
    "src/grammar.json",
    "src/node-types.json",
    "src/parser.c",
    "src/tree_sitter/",
)

# npm always includes package.json, README, and LICENSE. Every other packaged
# category must be explicitly admitted by the files allowlist.
REQUIRED_FILE_ENTRIES = {
    "grammar": ("grammar.js",),
    "generated sources": EXPLICIT_SRC_FILES,
    "bindings": ("binding.gyp", "bindings/node/*"),
    "queries": ("queries/*",),
    "metadata": ("tree-sitter.json",),
}


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"package integrity check failed: {message}", file=sys.stderr)
        self.failures += 1


def read_json(path: str) -> dict[str, Any]:
    value = json.loads((ROOT / path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object")
    return value


def run_pack(npm: str) -> list[dict[str, Any]]:
    result = subprocess.run(
        [npm, "pack", "--dry-run", "--json", "--ignore-scripts"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "no output"
        raise RuntimeError(f"npm pack failed with exit {result.returncode}: {detail}")
    data = json.loads(result.stdout)
    if not isinstance(data, list):
        raise TypeError("npm pack output must be a JSON array")
    return data


def non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def stripped_string(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    return value.strip() or None


def author_key(value: object) -> tuple[str, str, str] | None:
    if not isinstance(value, dict):
        return None
    name = stripped_string(value.get("name"))
    email = stripped_string(value.get("email"))
    url = stripped_string(value.get("url"))
    if name is None or email is None or url is None:
        return None
    return name, email, url


def check_metadata_alignment(
    package: dict[str, Any],
    tree_sitter: dict[str, Any],
    check: Checker,
) -> None:
    metadata = tree_sitter.get("metadata")
    if not isinstance(metadata, dict):
        return

    package_description = stripped_string(package.get("description"))
    tree_description = stripped_string(metadata.get("description"))
    check.require(package_description is not None, "package.json lacks a description")
    check.require(tree_description is not None, "tree-sitter.json metadata lacks a description")
    check.require(
        package_description == tree_description,
        "description does not match tree-sitter.json metadata",
    )

    links = metadata.get("links")
    tree_repository = stripped_string(links.get("repository")) if isinstance(links, dict) else None
    package_repository = stripped_string(package.get("repository"))
    check.require(package_repository is not None, "package.json lacks a repository")
    check.require(tree_repository is not None, "tree-sitter.json metadata lacks a repository link")
    check.require(
        package_repository == tree_repository,
        "repository does not match tree-sitter.json metadata",
    )

    package_author = author_key(package.get("author"))
    authors = metadata.get("authors")
    tree_author = (
        author_key(authors[0]) if isinstance(authors, list) and len(authors) == 1 else None
    )
    check.require(package_author is not None, "package.json author lacks name, email, or url")
    check.require(
        tree_author is not None,
        "tree-sitter.json metadata must contain exactly one complete author",
    )
    check.require(
        package_author == tree_author,
        "author does not match tree-sitter.json metadata",
    )

    grammars = tree_sitter.get("grammars")
    package_configs = package.get("tree-sitter")
    check.require(
        isinstance(grammars, list) and len(grammars) == 1,
        "tree-sitter.json must contain exactly one grammar",
    )
    check.require(
        isinstance(package_configs, list) and len(package_configs) == 1,
        "package.json tree-sitter must contain exactly one grammar",
    )
    if isinstance(grammars, list) and isinstance(package_configs, list):
        if grammars and package_configs:
            grammar = grammars[0]
            config = package_configs[0]
            check.require(
                isinstance(grammar, dict), "tree-sitter.json grammar entry must be an object"
            )
            check.require(
                isinstance(config, dict), "package.json tree-sitter entry must be an object"
            )
            if isinstance(grammar, dict) and isinstance(config, dict):
                for key in ("scope", "file-types"):
                    check.require(key in config, f"package.json tree-sitter lacks {key}")
                    check.require(key in grammar, f"tree-sitter.json grammar lacks {key}")
                    if key in config and key in grammar:
                        check.require(
                            config[key] == grammar[key],
                            f"{key} does not match tree-sitter.json grammar",
                        )


def check_metadata(
    package: dict[str, Any],
    tree_sitter: dict[str, Any],
    entry: dict[str, Any],
    check: Checker,
) -> None:
    for key in ("name", "version", "description", "license", "main", "types"):
        check.require(non_empty_string(package.get(key)), f"package.json lacks {key}")

    check.require(
        entry.get("name") == package.get("name"),
        f"packed name {entry.get('name')!r} does not match package.json",
    )
    check.require(
        entry.get("version") == package.get("version"),
        f"packed version {entry.get('version')!r} does not match package.json",
    )

    metadata = tree_sitter.get("metadata")
    check.require(isinstance(metadata, dict), "tree-sitter.json lacks metadata")
    if isinstance(metadata, dict):
        check.require(
            metadata.get("version") == package.get("version"),
            "tree-sitter.json metadata version does not match package.json",
        )
        check.require(
            metadata.get("license") == package.get("license"),
            "tree-sitter.json metadata license does not match package.json",
        )

    files = package.get("files")
    check.require(isinstance(files, list), "package.json lacks a files array")
    if isinstance(files, list):
        check.require(
            all(non_empty_string(entry) for entry in files),
            "package.json files contains a non-string or empty entry",
        )
        check.require(
            "src/**" not in files,
            "package.json uses src/**, which admits build artifacts",
        )
        for category, entries in REQUIRED_FILE_ENTRIES.items():
            for entry in entries:
                check.require(
                    entry in files,
                    f"package.json files lacks {category} entry {entry!r}",
                )


def check_files(entries: list[dict[str, Any]], check: Checker) -> list[str]:
    check.require(len(entries) == 1, "npm pack did not produce exactly one package")
    if not entries:
        return []
    entry = entries[0]
    check.require(isinstance(entry, dict), "npm pack entry must be an object")
    if not isinstance(entry, dict):
        return []

    files = entry.get("files")
    check.require(isinstance(files, list), "npm pack entry lacks a files array")
    if not isinstance(files, list):
        return []

    paths: list[str] = []
    for item in files:
        check.require(isinstance(item, dict), "npm pack file entry must be an object")
        if not isinstance(item, dict):
            continue
        path = item.get("path")
        check.require(non_empty_string(path), "npm pack file entry lacks a path")
        if not isinstance(path, str):
            continue
        check.require(not path.startswith("/"), f"absolute package path: {path}")
        check.require(".." not in Path(path).parts, f"traversing package path: {path}")
        paths.append(path)

        local = ROOT / path
        check.require(local.is_file(), f"packed file is missing locally: {path}")
        if local.is_file():
            check.require(
                local.stat().st_size == item.get("size"),
                f"packed size differs from local file: {path}",
            )

    check.require(len(paths) == len(set(paths)), "npm pack listed duplicate paths")

    packed = set(paths)
    for path in sorted(REQUIRED_FILES - packed):
        check.require(False, f"required file is absent from package: {path}")

    for path in paths:
        for pattern in FORBIDDEN_PATTERNS:
            if fnmatch.fnmatchcase(path, pattern):
                check.require(False, f"forbidden file in package: {path}")
                break

    return paths


def main(argv: list[str]) -> int:
    npm = argv[1] if len(argv) > 1 else "npm"
    check = Checker()

    try:
        entries = run_pack(npm)
    except (OSError, RuntimeError, TypeError, json.JSONDecodeError) as error:
        print(f"package integrity check failed: {error}", file=sys.stderr)
        print_terminal_status("package integrity", None, ["pack failure; see stderr"])
        return 1

    package = read_json("package.json")
    tree_sitter = read_json("tree-sitter.json")
    if entries and isinstance(entries[0], dict):
        check_metadata(package, tree_sitter, entries[0], check)
    else:
        check.require(False, "npm pack produced no metadata entry")
    check_metadata_alignment(package, tree_sitter, check)
    paths = check_files(entries, check)

    if check.failures:
        print_terminal_status(
            "package integrity",
            False,
            [f"{check.failures} failed assertion(s); see stderr diagnostics"],
        )
        return 1

    required_entries = sum(len(entries) for entries in REQUIRED_FILE_ENTRIES.values())
    print(
        f"package integrity: {len(paths)} files verified; "
        f"required {len(REQUIRED_FILES)}; "
        f"allowlist entries {required_entries}; "
        f"metadata aligned; "
        f"forbidden patterns {len(FORBIDDEN_PATTERNS)}"
    )
    print_terminal_status(
        "package integrity",
        True,
        [
            f"{len(paths)} files",
            f"{len(REQUIRED_FILES)} required",
            f"{required_entries} allowlist entries",
            "metadata aligned",
            f"{len(FORBIDDEN_PATTERNS)} forbidden patterns",
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
