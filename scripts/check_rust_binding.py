#!/usr/bin/env python3
"""Check Rust binding metadata, packaging, public API, and runtime load."""

from __future__ import annotations

import fnmatch
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_INCLUDE = (
    "bindings/rust/build.rs",
    "bindings/rust/lib.rs",
    "queries/highlights.scm",
    "queries/locals.scm",
    "src/node-types.json",
    "src/parser.c",
    "tree-sitter.json",
    "LICENSE",
)
EXPECTED_DEPENDENCIES = {
    "dependencies": {"tree-sitter-language": "0.1"},
    "build-dependencies": {"cc": "1.2"},
    "dev-dependencies": {"tree-sitter": "0.25.8"},
}
LIB_SNIPPETS = (
    "use tree_sitter_language::LanguageFn;",
    "pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_strudel) };",
    'pub const NODE_TYPES: &str = include_str!("../../src/node-types.json");',
    'pub const HIGHLIGHTS_QUERY: &str = include_str!("../../queries/highlights.scm");',
    'pub const LOCALS_QUERY: &str = include_str!("../../queries/locals.scm");',
    ".set_language(&super::LANGUAGE.into())",
)
BUILD_SNIPPETS = (
    "cc::Build::new()",
    'c_config.std("c11")',
    ".include(src_dir)",
    'src_dir.join("parser.c")',
    "c_config.file(&parser_path)",
    'src_dir.join("scanner.c")',
    'c_config.compile("tree-sitter-strudel")',
)
BFD_LINKER_FLAGS = ("-C", "link-arg=-fuse-ld=bfd")


def append_bfd_linker(value: str) -> str:
    suffix = " ".join(BFD_LINKER_FLAGS)
    return f"{value.strip()} {suffix}".strip() if value.strip() else suffix


def linker_env(env: dict[str, str]) -> dict[str, str]:
    """Prefer GNU ld.bfd on Linux when the ambient Cargo flags select another linker."""
    if sys.platform != "linux" or shutil.which("ld.bfd") is None:
        return env

    encoded = env.get("CARGO_ENCODED_RUSTFLAGS")
    if encoded:
        env["CARGO_ENCODED_RUSTFLAGS"] = "\x1f".join([*encoded.split("\x1f"), *BFD_LINKER_FLAGS])
    else:
        env["RUSTFLAGS"] = append_bfd_linker(env.get("RUSTFLAGS", ""))
    env["RUSTDOCFLAGS"] = append_bfd_linker(env.get("RUSTDOCFLAGS", ""))
    return env


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"Rust binding check failed: {message}", file=sys.stderr)
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


def check_manifest(check: Checker) -> None:
    try:
        cargo = tomllib.loads(read_text("Cargo.toml"))
    except tomllib.TOMLDecodeError as error:
        check.require(False, f"Cargo.toml is not valid TOML: {error}")
        return

    package = cargo.get("package")
    if not isinstance(package, dict):
        check.require(False, "Cargo.toml has no [package] table")
        return

    check.require(package.get("name") == "tree-sitter-strudel", "unexpected package name")
    check.require(package.get("license") == "AGPL-3.0-only", "unexpected package license")
    check.require(package.get("edition") == "2021", "unexpected Rust edition")
    check.require(
        package.get("build") == "bindings/rust/build.rs",
        "build script is not bindings/rust/build.rs",
    )

    lib = cargo.get("lib")
    check.require(
        isinstance(lib, dict) and lib.get("path") == "bindings/rust/lib.rs",
        "library entry point is not bindings/rust/lib.rs",
    )

    include = package.get("include")
    for required in REQUIRED_INCLUDE:
        check.require(covers(required, include), f"Cargo.toml include omits {required}")

    for section, expected in EXPECTED_DEPENDENCIES.items():
        actual = cargo.get(section)
        check.require(
            isinstance(actual, dict)
            and all(actual.get(name) == version for name, version in expected.items()),
            f"Cargo.toml [{section}] does not declare {expected}",
        )


def check_sources(check: Checker) -> None:
    build = read_text("bindings/rust/build.rs")
    for snippet in BUILD_SNIPPETS:
        check.require(snippet in build, f"bindings/rust/build.rs does not contain {snippet!r}")

    lib = read_text("bindings/rust/lib.rs")
    for snippet in LIB_SNIPPETS:
        check.require(snippet in lib, f"bindings/rust/lib.rs does not contain {snippet!r}")
    check.require(
        re.search(
            r'extern\s+"C"\s*\{[^}]*fn\s+tree_sitter_strudel\(\)\s*->\s*\*const\s*\(\)',
            lib,
            re.DOTALL,
        )
        is not None,
        "bindings/rust/lib.rs does not declare the generated language symbol",
    )


def check_distribution(check: Checker) -> None:
    bindings = read_json("tree-sitter.json").get("bindings")
    check.require(
        isinstance(bindings, dict) and bindings.get("rust") is True,
        "tree-sitter.json does not enable the Rust binding",
    )

    package_files = read_json("package.json").get("files")
    for path in ("bindings/rust/build.rs", "bindings/rust/lib.rs"):
        check.require(not covers(path, package_files), f"npm package files include {path}")

    check.require((ROOT / "Cargo.lock").is_file(), "Cargo.lock is missing")

    publish = read_text(".github/workflows/publish.yml")
    crates = re.search(r"(?ms)^  crates:\n(.*?)(?=^  [a-z]+:|\Z)", publish)
    check.require(crates is not None, "publish workflow has no crates job")
    if crates is not None:
        check.require("package-crates.yml" in crates.group(1), "crates job has no package workflow")
        check.require("CARGO_REGISTRY_TOKEN" in crates.group(1), "crates job has no registry token")
        check.require(
            re.search(r"^\s+generate:\s*true\s*$", crates.group(1), re.MULTILINE) is not None,
            "crates job does not enable parser generation",
        )


def copy_tracked_tree(destination: Path) -> None:
    listed = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        capture_output=True,
        check=True,
    )
    paths = [path for path in listed.stdout.decode().split("\0") if path]
    for relative in paths:
        source = ROOT / relative
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

    lock = ROOT / "Cargo.lock"
    if lock.exists() and not (destination / "Cargo.lock").exists():
        shutil.copy2(lock, destination / "Cargo.lock")


def check_runtime(check: Checker) -> None:
    cargo = shutil.which("cargo")
    check.require(cargo is not None, "cargo executable is not available on PATH")
    if cargo is None:
        return

    try:
        with tempfile.TemporaryDirectory(prefix="tree-sitter-strdl-rust-") as temporary:
            root = Path(temporary)
            copy_tracked_tree(root)
            check.require((root / "Cargo.lock").is_file(), "Cargo.lock is missing from the crate")
            env = linker_env(os.environ.copy())
            env["CARGO_TARGET_DIR"] = str(root / "target")
            result = subprocess.run(
                [cargo, "test", "--locked", "--manifest-path", str(root / "Cargo.toml")],
                cwd=root,
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                detail = result.stderr.strip() or result.stdout.strip() or "no output"
                check.require(False, f"cargo test failed with exit {result.returncode}: {detail}")
                return
            check.require(
                "test tests::test_can_load_grammar ... ok" in result.stdout,
                "Rust load test did not run successfully",
            )
            check.require(
                "test result: ok." in result.stdout, "cargo test reported no passing result"
            )
    except (OSError, subprocess.CalledProcessError) as error:
        check.require(False, f"could not prepare the Rust test tree: {error}")


def main() -> int:
    check = Checker()
    try:
        check_manifest(check)
        check_sources(check)
        check_distribution(check)
        check_runtime(check)
    except (OSError, TypeError, ValueError) as error:
        print(f"Rust binding check failed: {error}", file=sys.stderr)
        check.failures += 1

    if check.failures:
        print_terminal_status(
            "Rust binding",
            False,
            [f"{check.failures} failed assertion(s); see stderr diagnostics"],
        )
        return 1

    print("rust binding: manifest, package contents, public API, and cargo tests verified")
    print_terminal_status(
        "Rust binding",
        True,
        [
            "manifest verified",
            "package contents verified",
            "public API verified",
            "cargo test passed",
        ],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
