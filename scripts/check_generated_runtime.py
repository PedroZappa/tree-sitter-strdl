#!/usr/bin/env python3
"""Verify the committed generated parser works without grammar.js or the CLI."""

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

RUNTIME_FILES = (
    "package.json",
    "binding.gyp",
    "bindings/node/binding.cc",
    "bindings/node/index.js",
    "src/grammar.json",
    "src/node-types.json",
    "src/parser.c",
    "src/tree_sitter/alloc.h",
    "src/tree_sitter/array.h",
    "src/tree_sitter/parser.h",
    "queries/highlights.scm",
    "queries/locals.scm",
    "tree-sitter.json",
)

GENERATED_FILES = (
    "src/grammar.json",
    "src/node-types.json",
    "src/parser.c",
    "src/tree_sitter/alloc.h",
    "src/tree_sitter/array.h",
    "src/tree_sitter/parser.h",
)

FORBIDDEN_SOURCE_PATHS = (
    "grammar.js",
    "scripts",
    "test",
    "benchmarks",
    "node_modules",
    "build",
    "prebuilds",
)

FORBIDDEN_INSTALLED_PATHS = (
    "grammar.js",
    "scripts",
    "test",
    "benchmarks",
    "prebuilds",
)

FIXTURES = ("test/fixtures/test.strdl", "test/fixtures/test-local.strdl")

PARSE_SCRIPT = """const assert = require('node:assert/strict');
const fs = require('node:fs');
const Parser = require('tree-sitter');
const language = require('.');

assert.ok(language.nodeTypeInfo, 'generated node types are unavailable');
const parser = new Parser();
parser.setLanguage(language);

for (const file of process.argv.slice(2)) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = parser.parse(source);
  assert.equal(tree.rootNode.hasError, false, `${file} has parse errors`);
  assert.ok(tree.rootNode.namedChildren.length > 0, `${file} produced no named nodes`);
}

console.log(`generated runtime parsed ${process.argv.length - 2} fixture(s)`);
"""


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


def read_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"{path} must contain a JSON object")
    return data


def copy_runtime(root: Path, destination: Path) -> None:
    for relative in RUNTIME_FILES:
        source = root / relative
        if not source.is_file():
            raise RuntimeError(f"required runtime file is missing: {relative}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    for index, relative in enumerate(FIXTURES):
        source = root / relative
        if not source.is_file():
            raise RuntimeError(f"required fixture is missing: {relative}")
        shutil.copy2(source, destination / f"fixture-{index}.strdl")


def assert_runtime_only(root: Path, *, installed: bool = False) -> None:
    forbidden = FORBIDDEN_INSTALLED_PATHS if installed else FORBIDDEN_SOURCE_PATHS
    for relative in forbidden:
        if (root / relative).exists():
            raise RuntimeError(f"runtime copy contains {relative}")

    if (root / "node_modules/.bin/tree-sitter").exists():
        raise RuntimeError("runtime copy contains the tree-sitter CLI")


def assert_no_cli_dependency(root: Path) -> None:
    package = read_json(root / "package.json")
    for field in ("dependencies", "devDependencies"):
        dependencies = package.get(field)
        if isinstance(dependencies, dict) and "tree-sitter-cli" in dependencies:
            raise RuntimeError(f"runtime copy still declares tree-sitter-cli in {field}")


def prepare_runtime_package(root: Path) -> None:
    package = read_json(root / "package.json")
    lock = read_json(ROOT / "package-lock.json")
    locked = lock.get("packages", {}).get("node_modules/tree-sitter")
    if not isinstance(locked, dict) or not isinstance(locked.get("version"), str):
        raise RuntimeError("package-lock.json lacks the tree-sitter runtime version")

    dependencies = package.get("dependencies")
    if not isinstance(dependencies, dict):
        raise RuntimeError("package.json lacks a dependencies object")
    dependencies["tree-sitter"] = locked["version"]

    package.pop("devDependencies", None)
    package.pop("peerDependencies", None)
    package.pop("peerDependenciesMeta", None)

    (root / "package.json").write_text(f"{json.dumps(package, indent=2)}\n", encoding="utf-8")
    (root / "verify_runtime.js").write_text(PARSE_SCRIPT, encoding="utf-8")


def generated_hashes(root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for relative in GENERATED_FILES:
        path = root / relative
        if not path.is_file():
            raise RuntimeError(f"generated artifact is missing: {relative}")
        hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashes


def npm_env() -> dict[str, str]:
    env = os.environ.copy()
    env["npm_config_audit"] = "false"
    env["npm_config_fund"] = "false"
    return env


def main(argv: list[str]) -> int:
    npm = argv[1] if len(argv) > 1 else "npm"
    node = argv[2] if len(argv) > 2 else "node"
    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-runtime-") as temporary:
            root = Path(temporary)
            copy_runtime(ROOT, root)
            assert_runtime_only(root)
            before = generated_hashes(root)
            prepare_runtime_package(root)
            assert_no_cli_dependency(root)
            env = npm_env()

            run(
                [npm, "install", "--no-audit", "--no-fund"],
                root,
                "npm install",
                env,
            )
            assert_runtime_only(root, installed=True)
            assert_no_cli_dependency(root)
            if generated_hashes(root) != before:
                raise RuntimeError("npm install changed committed generated artifacts")

            fixtures = [f"fixture-{index}.strdl" for index in range(len(FIXTURES))]
            result = run(
                [node, "verify_runtime.js", *fixtures],
                root,
                "generated runtime parse",
                env,
            )
    except (OSError, RuntimeError) as error:
        print(f"generated runtime check failed: {error}", file=sys.stderr)
        print_terminal_status("generated runtime", None, ["see stderr diagnostics"])
        return 1

    print(
        f"generated runtime: parsed {len(FIXTURES)} fixtures from committed artifacts "
        "without grammar.js or tree-sitter-cli"
    )
    print_terminal_status(
        "generated runtime",
        True,
        [
            f"{len(FIXTURES)} fixtures",
            "no grammar.js",
            "no tree-sitter-cli",
            result.stdout.strip(),
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
