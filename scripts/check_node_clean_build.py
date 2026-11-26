#!/usr/bin/env python3
"""Verify that the Node.js binding builds from clean tracked sources."""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent

PARSER_ARTIFACTS = (
    "src/grammar.json",
    "src/node-types.json",
    "src/parser.c",
    "src/tree_sitter/alloc.h",
    "src/tree_sitter/array.h",
    "src/tree_sitter/parser.h",
)

CLEAN_EXCLUDED_PATHS = ("build", "node_modules", "prebuilds")
BUILD_ARTIFACT_SUFFIXES = (".a", ".dylib", ".node", ".o", ".so", ".tgz")


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


def tracked_paths() -> list[Path]:
    result = run(["git", "ls-files", "-z"], ROOT, "git ls-files")
    paths: list[Path] = []
    for raw in result.stdout.split("\0"):
        if not raw:
            continue
        path = Path(raw)
        if path.is_absolute() or ".." in path.parts:
            raise RuntimeError(f"tracked path escapes the repository: {raw}")
        paths.append(path)
    if not paths:
        raise RuntimeError("git ls-files returned no tracked paths")
    return paths


def copy_tracked_sources(destination: Path) -> int:
    copied = 0
    for path in tracked_paths():
        source = ROOT / path
        if source.is_symlink():
            raise RuntimeError(f"tracked symlink is not supported: {path}")
        if not source.is_file():
            raise RuntimeError(f"tracked source is not a regular file: {path}")
        target = destination / path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1
    return copied


def assert_clean_copy(root: Path) -> None:
    for relative in CLEAN_EXCLUDED_PATHS:
        if (root / relative).exists():
            raise RuntimeError(f"clean copy contains {relative}")

    for path in root.rglob("*"):
        if path.is_file() and path.suffix in BUILD_ARTIFACT_SUFFIXES:
            raise RuntimeError(f"clean copy contains build artifact: {path.relative_to(root)}")


def parser_hashes(root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for relative in PARSER_ARTIFACTS:
        path = root / relative
        if not path.is_file():
            raise RuntimeError(f"required parser artifact is missing: {relative}")
        hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashes


def binding_artifact(root: Path) -> Path:
    build = root / "build"
    if not build.is_dir():
        raise RuntimeError("npm ci did not create a build directory")
    candidates = sorted(
        path for path in build.rglob("*.node") if path.is_file() and "obj.target" not in path.parts
    )
    if len(candidates) != 1:
        raise RuntimeError(
            f"expected one compiled Node addon under build/, found {len(candidates)}"
        )
    return candidates[0]


def npm_env() -> dict[str, str]:
    env = os.environ.copy()
    env["npm_config_offline"] = "true"
    env["npm_config_audit"] = "false"
    env["npm_config_fund"] = "false"
    return env


def main(argv: list[str]) -> int:
    npm = argv[1] if len(argv) > 1 else "npm"
    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-clean-build-") as temporary:
            workdir = Path(temporary)
            copied = copy_tracked_sources(workdir)
            assert_clean_copy(workdir)
            before = parser_hashes(workdir)
            env = npm_env()

            run(
                [npm, "ci", "--offline", "--no-audit", "--no-fund"],
                workdir,
                "npm ci",
                env,
            )
            if parser_hashes(workdir) != before:
                raise RuntimeError("npm ci changed committed parser artifacts")
            artifact = binding_artifact(workdir)
            run([npm, "test"], workdir, "npm test", env)
    except (OSError, RuntimeError) as error:
        print(f"node clean build failed: {error}", file=sys.stderr)
        print_terminal_status("node clean build", None, ["see stderr diagnostics"])
        return 1

    relative = artifact.relative_to(workdir)
    print(f"node clean build: {copied} tracked files copied; {relative} compiled; npm test passed")
    print_terminal_status(
        "node clean build",
        True,
        [f"{copied} tracked files", str(relative), "npm test passed"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
