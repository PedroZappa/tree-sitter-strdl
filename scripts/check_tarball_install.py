#!/usr/bin/env python3
"""Verify that the npm tarball installs and parses in a clean consumer."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent

GENERATED_FILES = (
    "src/grammar.json",
    "src/node-types.json",
    "src/parser.c",
    "src/tree_sitter/alloc.h",
    "src/tree_sitter/array.h",
    "src/tree_sitter/parser.h",
)

REQUIRED_INSTALLED_FILES = (
    "package.json",
    "binding.gyp",
    "bindings/node/binding.cc",
    "bindings/node/index.js",
    "grammar.js",
    "queries/highlights.scm",
    "queries/locals.scm",
    "src/parser.c",
    "tree-sitter.json",
)

FORBIDDEN_INSTALLED_PATHS = (
    "bindings/c",
    "bindings/go",
    "bindings/python",
    "bindings/rust",
    "bindings/swift",
    "docs",
    "node_modules",
    "scripts",
    "test",
)

FORBIDDEN_PACKED_PREFIXES = FORBIDDEN_INSTALLED_PATHS + ("build", "prebuilds")
FORBIDDEN_PACKED_FILES = ("package-lock.json",)
FORBIDDEN_PACKED_SUFFIXES = (".node", ".tgz", ".wasm")

FIXTURE = "test/fixtures/test.strdl"

LOAD_SCRIPT = """const assert = require('node:assert/strict');
const language = require(process.argv[1]);
assert.ok(language.language, 'native language handle is missing');
assert.ok(Array.isArray(language.nodeTypeInfo), 'node types are unavailable');
console.log('tarball package loaded');
"""

PARSE_SCRIPT = """const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Parser = require('tree-sitter');
const language = require(process.argv[1]);
const fixture = process.argv[2];
const expectedVersion = process.argv[3];

const runtimeVersion = require('tree-sitter/package.json').version;
assert.equal(runtimeVersion, expectedVersion, 'unexpected tree-sitter runtime version');
assert.ok(language.nodeTypeInfo, 'generated node types are unavailable');

const parser = new Parser();
parser.setLanguage(language);
const source = fs.readFileSync(fixture, 'utf8');
const tree = parser.parse(source);
const { rootNode } = tree;

assert.equal(rootNode.type, 'source_file', 'unexpected root node type');
assert.equal(rootNode.hasError, false, 'representative composition has parse errors');
assert.equal(rootNode.text, source, 'parse tree text differs from source');
assert.ok(rootNode.namedChildren.length > 0, 'representative composition produced no named nodes');

const calls = rootNode.descendantsOfType('call_expression');
const strings = rootNode.descendantsOfType('string');
const identifiers = rootNode.descendantsOfType('identifier').map((node) => node.text);
assert.ok(calls.length > 1, 'method chain calls were not parsed');
assert.ok(strings.some((node) => node.text.includes('sh*8')), 'mini-notation string was not preserved');
assert.ok(identifiers.includes('s') && identifiers.includes('note'), 'expected call identifiers are missing');

console.log(`installed package parsed ${path.basename(fixture)}: ${calls.length} calls, ${strings.length} strings`);
"""


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"tarball install check failed: {message}", file=sys.stderr)
        self.failures += 1


def run(
    command: list[str],
    cwd: Path,
    label: str,
    env: dict[str, str] | None = None,
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


def npm_env() -> dict[str, str]:
    env = os.environ.copy()
    env["npm_config_offline"] = "true"
    env["npm_config_audit"] = "false"
    env["npm_config_fund"] = "false"
    return env


def locked_runtime_version(check: Checker) -> str:
    lock = json.loads((ROOT / "package-lock.json").read_text(encoding="utf-8"))
    packages = lock.get("packages") if isinstance(lock, dict) else None
    entry = packages.get("node_modules/tree-sitter") if isinstance(packages, dict) else None
    version = entry.get("version") if isinstance(entry, dict) else None
    check.require(
        isinstance(version, str) and bool(version),
        "package-lock.json lacks the tree-sitter runtime version",
    )
    if not isinstance(version, str) or not version:
        raise RuntimeError("package-lock.json lacks the tree-sitter runtime version")
    return version


def pack(npm: str, destination: Path, check: Checker) -> tuple[dict[str, Any], Path]:
    result = run(
        [
            npm,
            "pack",
            "--json",
            "--ignore-scripts",
            "--pack-destination",
            str(destination),
        ],
        ROOT,
        "npm pack",
        npm_env(),
    )
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"npm pack produced invalid JSON: {error}") from error
    check.require(isinstance(data, list) and len(data) == 1, "npm pack must produce one entry")
    if not isinstance(data, list) or not data or not isinstance(data[0], dict):
        raise RuntimeError("npm pack produced no usable entry")

    entry = data[0]
    filename = entry.get("filename")
    check.require(isinstance(filename, str) and filename.endswith(".tgz"), "invalid tarball name")
    if not isinstance(filename, str) or not filename.endswith(".tgz"):
        raise RuntimeError("invalid tarball filename")
    path = Path(filename)
    check.require(not path.is_absolute() and ".." not in path.parts, "unsafe tarball path")

    tarball = destination / path
    check.require(tarball.is_file(), f"tarball is missing: {filename}")
    return entry, tarball


def prepare_consumer(consumer: Path) -> None:
    consumer.mkdir()
    manifest = {"name": "tarball-consumer", "version": "1.0.0", "private": True}
    (consumer / "package.json").write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")


def installed_package(consumer: Path, name: object, check: Checker) -> Path:
    check.require(isinstance(name, str) and bool(name.strip()), "packed package name is missing")
    if not isinstance(name, str) or not name.strip():
        raise RuntimeError("packed package name is missing")
    relative = Path(name)
    check.require(
        not relative.is_absolute() and ".." not in relative.parts,
        f"unsafe package name: {name}",
    )
    root = consumer / "node_modules" / relative
    check.require(root.is_dir(), f"package was not installed at {relative}")
    return root


def hashes(root: Path, check: Checker) -> dict[str, str]:
    values: dict[str, str] = {}
    for relative in GENERATED_FILES:
        source = ROOT / relative
        installed = root / relative
        check.require(installed.is_file(), f"installed package lacks {relative}")
        if not source.is_file() or not installed.is_file():
            continue
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        installed_hash = hashlib.sha256(installed.read_bytes()).hexdigest()
        check.require(
            source_hash == installed_hash, f"installed {relative} differs from repository"
        )
        values[relative] = installed_hash
    return values


def path_is_forbidden(relative: str, prefixes: tuple[str, ...]) -> bool:
    parts = Path(relative).parts
    return any(parts[: len(Path(prefix).parts)] == Path(prefix).parts for prefix in prefixes)


def check_layout(root: Path, entry: dict[str, Any], check: Checker) -> list[str]:
    for relative in REQUIRED_INSTALLED_FILES:
        check.require((root / relative).is_file(), f"installed package lacks {relative}")

    for relative in FORBIDDEN_INSTALLED_PATHS:
        check.require(not (root / relative).exists(), f"installed package contains {relative}")

    packed = entry.get("files")
    check.require(isinstance(packed, list), "npm pack entry lacks a files list")
    paths: list[str] = []
    if isinstance(packed, list):
        for item in packed:
            check.require(isinstance(item, dict), "npm pack file entry must be an object")
            if not isinstance(item, dict):
                continue
            relative = item.get("path")
            check.require(
                isinstance(relative, str) and bool(relative),
                "npm pack file entry lacks a path",
            )
            if not isinstance(relative, str) or not relative:
                continue
            packed_path = Path(relative)
            check.require(
                not packed_path.is_absolute() and ".." not in packed_path.parts,
                f"unsafe packed path: {relative}",
            )
            check.require(
                not path_is_forbidden(relative, FORBIDDEN_PACKED_PREFIXES)
                and relative not in FORBIDDEN_PACKED_FILES
                and not relative.endswith(FORBIDDEN_PACKED_SUFFIXES),
                f"forbidden artifact packed: {relative}",
            )
            paths.append(relative)
            if relative == "package.json":
                continue
            installed = root / relative
            check.require(installed.is_file(), f"packed file is missing after install: {relative}")
            if installed.is_file():
                check.require(
                    installed.stat().st_size == item.get("size"),
                    f"installed size differs from packed size: {relative}",
                )
    return paths


def binding_artifact(root: Path, check: Checker) -> Path:
    build = root / "build"
    check.require(build.is_dir(), "install script did not create a build directory")
    candidates = sorted(
        path for path in build.rglob("*.node") if path.is_file() and "obj.target" not in path.parts
    )
    check.require(
        len(candidates) == 1,
        f"expected one compiled Node addon under build/, found {len(candidates)}",
    )
    if len(candidates) != 1:
        raise RuntimeError("installed package has no usable native addon")
    return candidates[0]


def main(argv: list[str]) -> int:
    npm = argv[1] if len(argv) > 1 else "npm"
    node = argv[2] if len(argv) > 2 else "node"
    check = Checker()
    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-tarball-") as temporary:
            base = Path(temporary)
            pack_dir = base / "pack"
            pack_dir.mkdir()
            entry, tarball = pack(npm, pack_dir, check)
            consumer = base / "consumer"
            prepare_consumer(consumer)

            run(
                [
                    npm,
                    "install",
                    "--offline",
                    "--no-audit",
                    "--no-fund",
                    str(tarball),
                ],
                consumer,
                "npm install from tarball",
                npm_env(),
            )
            check.require(
                not (consumer / "node_modules/tree-sitter").exists(),
                "grammar install pulled in the tree-sitter runtime",
            )
            check.require(
                not (consumer / "node_modules/.bin/tree-sitter").exists(),
                "grammar install pulled in the tree-sitter CLI",
            )

            installed = installed_package(consumer, entry.get("name"), check)
            paths = check_layout(installed, entry, check)
            values = hashes(installed, check)
            artifact = binding_artifact(installed, check)
            run(
                [node, "-e", LOAD_SCRIPT, str(installed)],
                consumer,
                "installed package load",
            )

            source_fixture = ROOT / FIXTURE
            check.require(source_fixture.is_file(), f"representative fixture is missing: {FIXTURE}")
            if not source_fixture.is_file():
                raise RuntimeError(f"representative fixture is missing: {FIXTURE}")

            version = locked_runtime_version(check)
            run(
                [
                    npm,
                    "install",
                    "--offline",
                    "--no-audit",
                    "--no-fund",
                    "--save-exact",
                    f"tree-sitter@{version}",
                ],
                consumer,
                "install pinned tree-sitter runtime",
                npm_env(),
            )
            check.require(
                not (consumer / "node_modules/.bin/tree-sitter").exists(),
                "runtime install pulled in the tree-sitter CLI",
            )

            consumer_fixture = consumer / "composition.strdl"
            shutil.copy2(source_fixture, consumer_fixture)
            parse_result = run(
                [node, "-e", PARSE_SCRIPT, str(installed), str(consumer_fixture), version],
                consumer,
                "installed package parse",
            )
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        print(f"tarball install check failed: {error}", file=sys.stderr)
        print_terminal_status("tarball install", None, ["see stderr diagnostics"])
        return 1

    if check.failures:
        print_terminal_status(
            "tarball install",
            False,
            [f"{check.failures} failed assertion(s); see stderr diagnostics"],
        )
        return 1

    filename = entry.get("filename")
    relative = artifact.relative_to(installed)
    print(
        f"tarball install: {filename} installed offline into a clean consumer; "
        f"{len(paths)} packed files verified; {len(values)} generated artifacts unchanged; "
        f"{relative} compiled; tree-sitter {version} installed separately; "
        f"{parse_result.stdout.strip()}"
    )
    print_terminal_status(
        "tarball install",
        True,
        [
            str(filename),
            f"{len(paths)} files",
            f"{len(values)} generated artifacts",
            str(relative),
            f"tree-sitter {version}",
            "load and parse passed",
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
