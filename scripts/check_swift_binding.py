#!/usr/bin/env python3
"""Check Swift binding metadata, packaging, public API, and runtime load."""

from __future__ import annotations

import fnmatch
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_FILES = (
    "Package.swift",
    "bindings/swift/TreeSitterStrudel/strudel.h",
    "bindings/swift/TreeSitterStrudelTests/TreeSitterStrudelTests.swift",
    "src/parser.c",
    "queries/highlights.scm",
    "queries/locals.scm",
    "tree-sitter.json",
)
PACKAGE_SNIPPETS = (
    "// swift-tools-version:5.3",
    'name: "TreeSitterStrudel"',
    '.library(name: "TreeSitterStrudel", targets: ["TreeSitterStrudel"])',
    '.package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.10.0")',
    'sources = ["src/parser.c"]',
    'sources.append("src/scanner.c")',
    '.copy("queries")',
    'publicHeadersPath: "bindings/swift"',
    "cLanguageStandard: .c11",
    'name: "TreeSitterStrudelTests"',
    '"SwiftTreeSitter"',
    '"TreeSitterStrudel"',
)
HEADER_SNIPPETS = (
    "typedef struct TSLanguage TSLanguage;",
    "#ifdef __cplusplus",
    'extern "C" {',
    "const TSLanguage *tree_sitter_strudel(void);",
)
TEST_SNIPPETS = (
    "import XCTest",
    "import SwiftTreeSitter",
    "import TreeSitterStrudel",
    "final class TreeSitterStrudelTests: XCTestCase",
    "let parser = Parser()",
    "let language = Language(language: tree_sitter_strudel())",
    "XCTAssertNoThrow",
    "try parser.setLanguage(language)",
)


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"Swift binding check failed: {message}", file=sys.stderr)
        self.failures += 1


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def read_json(path: str) -> dict:
    value = json.loads(read_text(path))
    if not isinstance(value, dict):
        raise TypeError(f"{path} must contain a JSON object")
    return value


def covers(path: str, patterns: object) -> bool:
    return isinstance(patterns, list) and any(
        fnmatch.fnmatchcase(path, pattern) for pattern in patterns if isinstance(pattern, str)
    )


def check_files(check: Checker) -> None:
    for path in REQUIRED_FILES:
        check.require((ROOT / path).is_file(), f"required file is missing: {path}")


def check_manifest(check: Checker) -> None:
    manifest = read_text("Package.swift")
    for snippet in PACKAGE_SNIPPETS:
        check.require(snippet in manifest, f"Package.swift does not contain {snippet!r}")


def check_sources(check: Checker) -> None:
    header = read_text("bindings/swift/TreeSitterStrudel/strudel.h")
    for snippet in HEADER_SNIPPETS:
        check.require(
            snippet in header,
            f"bindings/swift/TreeSitterStrudel/strudel.h does not contain {snippet!r}",
        )

    tests = read_text("bindings/swift/TreeSitterStrudelTests/TreeSitterStrudelTests.swift")
    for snippet in TEST_SNIPPETS:
        check.require(
            snippet in tests,
            "bindings/swift/TreeSitterStrudelTests/TreeSitterStrudelTests.swift "
            f"does not contain {snippet!r}",
        )


def check_distribution(check: Checker) -> None:
    bindings = read_json("tree-sitter.json").get("bindings")
    check.require(
        isinstance(bindings, dict) and bindings.get("swift") is True,
        "tree-sitter.json does not enable the Swift binding",
    )

    package_files = read_json("package.json").get("files")
    for path in REQUIRED_FILES[:3]:
        check.require(not covers(path, package_files), f"npm package files include {path}")


def copy_tracked_tree(destination: Path) -> int:
    listed = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        capture_output=True,
        check=True,
    )
    copied = 0
    for raw in listed.stdout.decode().split("\0"):
        if not raw:
            continue
        relative = Path(raw)
        if relative.is_absolute() or ".." in relative.parts:
            raise RuntimeError(f"tracked path escapes the repository: {raw}")
        source = ROOT / relative
        if not source.is_file() or source.is_symlink():
            raise RuntimeError(f"tracked path is not a regular file: {relative}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1
    if copied == 0:
        raise RuntimeError("git ls-files returned no tracked files")
    return copied


def command_detail(result: subprocess.CompletedProcess[str]) -> str:
    parts = [part.strip() for part in (result.stderr, result.stdout) if part.strip()]
    return "\n".join(parts) if parts else "no output"


def check_runtime(check: Checker) -> None:
    swift = shutil.which("swift")
    check.require(swift is not None, "swift executable is not available on PATH")
    if swift is None:
        return

    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-swift-") as temporary:
            root = Path(temporary)
            copy_tracked_tree(root)
            build = subprocess.run(
                [swift, "build"],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )
            if build.returncode != 0:
                detail = command_detail(build)
                check.require(False, f"swift build failed with exit {build.returncode}: {detail}")
                return

            test = subprocess.run(
                [swift, "test"],
                cwd=root,
                capture_output=True,
                text=True,
                check=False,
            )
            if test.returncode != 0:
                detail = command_detail(test)
                check.require(False, f"swift test failed with exit {test.returncode}: {detail}")
                return

            check.require(
                re.search(r"Test Case '.*testCanLoadGrammar.*' passed", test.stdout) is not None,
                "Swift load test did not run successfully",
            )
            check.require(
                "Executed 1 test, with 0 failures" in test.stdout,
                "swift test reported no passing result",
            )
    except (OSError, subprocess.CalledProcessError) as error:
        check.require(False, f"could not prepare the Swift test tree: {error}")


def main() -> int:
    check = Checker()
    try:
        check_files(check)
        check_manifest(check)
        check_sources(check)
        check_distribution(check)
        check_runtime(check)
    except (OSError, TypeError, ValueError) as error:
        print(f"Swift binding check failed: {error}", file=sys.stderr)
        check.failures += 1

    if check.failures:
        print_terminal_status(
            "Swift binding",
            False,
            [f"{check.failures} failed assertion(s); see stderr diagnostics"],
        )
        return 1

    print("swift binding: manifest, package contents, public API, and swift build/test verified")
    print_terminal_status(
        "Swift binding",
        True,
        [
            "manifest verified",
            "package contents verified",
            "public API verified",
            "swift build/test passed",
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
