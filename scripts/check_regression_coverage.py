#!/usr/bin/env python3
"""Check that recorded bugs have permanent regression artifacts.

The inventory under ``test/fixtures/`` is the authoritative list of discovered
bugs that affected parser, query, binding, packaging, incremental, or build
behavior. Each entry must name at least one artifact that still exists and,
where relevant, is still referenced by a Make target. Documentation-only and
tooling-only findings are recorded as explicit exclusions.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

from terminal_report import print_terminal_status

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INVENTORY = "test/fixtures/regression_inventory.json"
REGRESSION_KINDS = {"corpus_case", "node_test", "path", "contains", "absent"}
HEADER = re.compile(r"^=+$")
NODE_TEST = re.compile(r"""\btest\(\s*(['"])(.*?)\1""")


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"regression coverage check failed: {message}", file=sys.stderr)
        self.failures += 1


def non_empty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def load_inventory(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise TypeError("regression inventory must contain a JSON object")
    return value


def resolve_artifact(raw: object, where: str, check: Checker) -> Path | None:
    if not non_empty_string(raw):
        check.require(False, f"{where} has no artifact path")
        return None
    assert isinstance(raw, str)
    path = (ROOT / raw).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError:
        check.require(False, f"{where} path escapes the repository: {raw}")
        return None
    check.require(path.exists(), f"{where} path does not exist: {raw}")
    return path


def corpus_case_names(path: Path) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    names: list[str] = []
    for index in range(len(lines) - 2):
        name = lines[index + 1].strip()
        if (
            name
            and HEADER.fullmatch(lines[index].strip())
            and HEADER.fullmatch(lines[index + 2].strip())
        ):
            names.append(name)
    return names


def check_regression(regression: object, where: str, check: Checker) -> None:
    if not isinstance(regression, dict):
        check.require(False, f"{where} must be an object")
        return

    kind = regression.get("kind")
    check.require(
        isinstance(kind, str) and kind in REGRESSION_KINDS,
        f"{where} has unknown kind {kind!r}",
    )
    if not isinstance(kind, str) or kind not in REGRESSION_KINDS:
        return

    raw_path = regression.get("path")
    path = resolve_artifact(raw_path, where, check)
    if path is None:
        return

    if kind == "path":
        return

    if kind == "corpus_case":
        name = regression.get("name")
        if not non_empty_string(name):
            check.require(False, f"{where} has no corpus case name")
            return
        assert isinstance(name, str)
        if not path.is_file():
            check.require(False, f"{where} corpus file is not a file: {raw_path}")
            return
        names = corpus_case_names(path)
        check.require(
            names.count(name) == 1,
            f"{where} corpus case {name!r} occurs {names.count(name)} times in {raw_path}",
        )
        return

    if kind == "node_test":
        name = regression.get("name")
        if not non_empty_string(name):
            check.require(False, f"{where} has no binding test name")
            return
        assert isinstance(name, str)
        if not path.is_file():
            check.require(False, f"{where} binding test is not a file: {raw_path}")
            return
        names = [match.group(2) for match in NODE_TEST.finditer(path.read_text(encoding="utf-8"))]
        check.require(
            names.count(name) == 1,
            f"{where} binding test {name!r} occurs {names.count(name)} times in {raw_path}",
        )
        return

    text = regression.get("text")
    if not non_empty_string(text):
        check.require(False, f"{where} has no text to check")
        return
    assert isinstance(text, str)
    if not path.is_file():
        check.require(False, f"{where} artifact is not a file: {raw_path}")
        return
    content = path.read_text(encoding="utf-8")
    if kind == "contains":
        check.require(text in content, f"{where} text is absent from {raw_path}: {text}")
    else:
        check.require(text not in content, f"{where} text is present in {raw_path}: {text}")


def check_inventory(inventory: dict[str, Any], check: Checker) -> tuple[int, int, int]:
    check.require(
        inventory.get("version") == 1,
        f"unsupported inventory version {inventory.get('version')!r}",
    )
    check.require(
        non_empty_string(inventory.get("scope")),
        "inventory lacks a scope statement",
    )

    entries = inventory.get("entries")
    check.require(
        isinstance(entries, list) and bool(entries),
        "inventory lacks a non-empty entries array",
    )
    exclusions = inventory.get("exclusions", [])
    check.require(isinstance(exclusions, list), "inventory exclusions must be an array")
    if not isinstance(entries, list):
        entries = []
    if not isinstance(exclusions, list):
        exclusions = []

    seen_ids: set[str] = set()
    assertion_count = 0

    for index, entry in enumerate(entries):
        where = f"entries[{index}]"
        if not isinstance(entry, dict):
            check.require(False, f"{where} must be an object")
            continue
        bug_id = entry.get("id")
        check.require(
            non_empty_string(bug_id) and isinstance(bug_id, str) and bug_id.startswith("BUG-"),
            f"{where} has invalid bug id {bug_id!r}",
        )
        if isinstance(bug_id, str) and bug_id:
            check.require(bug_id not in seen_ids, f"duplicate inventory id: {bug_id}")
            seen_ids.add(bug_id)
        for field in ("summary", "category", "evidence", "fixed_in"):
            check.require(non_empty_string(entry.get(field)), f"{bug_id} lacks {field}")
        regressions = entry.get("regressions")
        check.require(
            isinstance(regressions, list) and bool(regressions),
            f"{bug_id} lacks a non-empty regressions array",
        )
        if isinstance(regressions, list):
            for regression_index, regression in enumerate(regressions):
                assertion_count += 1
                check_regression(
                    regression,
                    f"{bug_id}.regressions[{regression_index}]",
                    check,
                )

    for index, exclusion in enumerate(exclusions):
        where = f"exclusions[{index}]"
        if not isinstance(exclusion, dict):
            check.require(False, f"{where} must be an object")
            continue
        exclusion_id = exclusion.get("id")
        check.require(
            non_empty_string(exclusion_id)
            and isinstance(exclusion_id, str)
            and exclusion_id.startswith("EXC-"),
            f"{where} has invalid exclusion id {exclusion_id!r}",
        )
        if isinstance(exclusion_id, str) and exclusion_id:
            check.require(
                exclusion_id not in seen_ids,
                f"duplicate inventory id: {exclusion_id}",
            )
            seen_ids.add(exclusion_id)
        for field in ("summary", "evidence", "rationale"):
            check.require(
                non_empty_string(exclusion.get(field)),
                f"{exclusion_id} lacks {field}",
            )
        check.require(
            not exclusion.get("regressions"),
            f"{exclusion_id} must not claim regression artifacts",
        )

    return len(entries), assertion_count, len(exclusions)


def main(argv: list[str]) -> int:
    manifest = Path(argv[1]).resolve() if len(argv) > 1 else (ROOT / DEFAULT_INVENTORY)
    check = Checker()
    try:
        inventory = load_inventory(manifest)
        bugs, assertions, exclusions = check_inventory(inventory, check)
    except (OSError, UnicodeError, TypeError, json.JSONDecodeError) as error:
        print(f"regression coverage check failed: {error}", file=sys.stderr)
        print_terminal_status("regression coverage", None, ["invalid inventory; see stderr"])
        return 1

    if check.failures:
        print_terminal_status(
            "regression coverage",
            False,
            [f"{check.failures} failed assertion(s); see stderr diagnostics"],
        )
        return 1

    print(
        f"regression coverage: {bugs} bugs, {assertions} regression assertions, "
        f"{exclusions} documented exclusions"
    )
    print_terminal_status(
        "regression coverage",
        True,
        [f"{bugs} bugs", f"{assertions} assertions", f"{exclusions} exclusions"],
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
