#!/usr/bin/env python3
"""Generate and verify deterministic benchmark fixtures.

The benchmark manifest is the source of truth for fixture identity, size,
hash, and generator parameters. Synthetic fixtures are regenerated from those
parameters; committed representative compositions are hashed but never
rewritten.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "benchmarks/fixtures/manifest.json"
KINDS = {"representative", "synthetic-large", "deeply-nested", "pathological"}


class Checker:
    def __init__(self) -> None:
        self.failures = 0

    def require(self, condition: bool, message: str) -> None:
        if condition:
            return
        print(f"benchmark fixture check failed: {message}", file=sys.stderr)
        self.failures += 1


def load_manifest(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise TypeError("benchmark manifest must contain a JSON object")
    return value


def write_manifest(path: Path, manifest: dict[str, Any]) -> None:
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def safe_path(raw: object, check: Checker, label: str) -> Path | None:
    if not isinstance(raw, str) or not raw.strip():
        check.require(False, f"{label} has no path")
        return None
    path = (ROOT / raw).resolve()
    try:
        path.relative_to(ROOT)
    except ValueError:
        check.require(False, f"{label} path escapes the repository: {raw}")
        return None
    return path


def header(fixture_id: str, seed: str) -> list[str]:
    return [
        f"// generated benchmark fixture: {fixture_id}",
        f"// seed: {seed}",
    ]


def render_large(fixture_id: str, seed: str, params: dict[str, Any]) -> str:
    declarations = params.get("declarations")
    if not isinstance(declarations, int) or declarations <= 0:
        raise ValueError(f"{fixture_id}: declarations must be a positive integer")
    lines = header(fixture_id, seed)
    lines.append(f"// declarations: {declarations}")
    for index in range(declarations):
        mode = index % 4
        if mode == 0:
            lines.append(
                f'const pattern_{index:04d} = note("c3 e3 g3").s("bd sd").gain(0.{index % 10})'
            )
        elif mode == 1:
            lines.append(
                f"let layer_{index:04d} = stack([0, 1, 2], {{step: {index % 16}}}).fast(2)"
            )
        elif mode == 2:
            mini = " ".join(["bd sd"] * (1 + index % 3))
            lines.append(f's("{mini}").note("c3").room(0.{index % 10})')
        else:
            lines.append(
                f"const tempo_{index:04d} = slider({index % 12}, 5, 12) + {index % 7}"
            )
    return "\n".join(lines) + "\n"


def render_deep(fixture_id: str, seed: str, params: dict[str, Any]) -> str:
    depth = params.get("depth")
    if not isinstance(depth, int) or depth <= 0:
        raise ValueError(f"{fixture_id}: depth must be a positive integer")
    lines = header(fixture_id, seed)
    lines.append(f"// depth: {depth}")
    lines.append("s(" * depth + 'note("c3")' + ")" * depth)
    return "\n".join(lines) + "\n"


def render_pathological(fixture_id: str, seed: str, params: dict[str, Any]) -> str:
    blocks = params.get("blocks")
    if not isinstance(blocks, int) or blocks <= 0:
        raise ValueError(f"{fixture_id}: blocks must be a positive integer")
    lines = header(fixture_id, seed)
    lines.append(f"// blocks: {blocks}")
    lines.append("// expected: ERROR and MISSING nodes from intentional malformed input")
    forms = (
        lambda index: f'const broken_{index:04d} = s("bd sd".phaser({index % 11}',
        lambda index: f"let broken_{index:04d} = {{a: {index},, b: 2}}",
        lambda index: f's("hh"[{index % 4}',
        lambda index: f'note("c3 e3").add({index % 6}',
        lambda index: f"const broken_{index:04d} = [1, 2,, {index % 9}",
        lambda index: f's("bd".fast({index % 5}',
    )
    for index in range(blocks):
        lines.append(forms[index % len(forms)](index))
    return "\n".join(lines) + "\n"


RENDERERS = {
    "synthetic-large": render_large,
    "deeply-nested": render_deep,
    "pathological": render_pathological,
}


def render(fixture: dict[str, Any], seed: str) -> str:
    kind = fixture.get("kind")
    if kind == "representative":
        raise ValueError("representative fixtures are committed and are not generated")
    renderer = RENDERERS.get(kind)
    if renderer is None:
        raise ValueError(f"unknown generated fixture kind: {kind!r}")
    params = fixture.get("params")
    if not isinstance(params, dict):
        raise ValueError(f"{fixture.get('id')}: params must be an object")
    return renderer(str(fixture.get("id")), seed, params)


def validate(manifest: dict[str, Any], check: Checker) -> list[dict[str, Any]]:
    check.require(manifest.get("version") == 1, "unsupported manifest version")
    seed = manifest.get("seed")
    check.require(
        isinstance(seed, str) and bool(seed.strip()),
        "manifest lacks a non-empty seed",
    )
    fixtures = manifest.get("fixtures")
    check.require(isinstance(fixtures, list) and bool(fixtures), "no fixtures defined")
    if not isinstance(fixtures, list):
        return []

    seen_ids: set[str] = set()
    seen_paths: set[Path] = set()
    for index, fixture in enumerate(fixtures):
        label = f"fixtures[{index}]"
        if not isinstance(fixture, dict):
            check.require(False, f"{label} must be an object")
            continue
        fixture_id = fixture.get("id")
        check.require(
            isinstance(fixture_id, str) and bool(fixture_id.strip()),
            f"{label} lacks an id",
        )
        if isinstance(fixture_id, str) and fixture_id:
            check.require(fixture_id not in seen_ids, f"duplicate fixture id: {fixture_id}")
            seen_ids.add(fixture_id)
        check.require(
            fixture.get("kind") in KINDS,
            f"{fixture_id} has unknown kind {fixture.get('kind')!r}",
        )
        check.require(
            isinstance(fixture.get("role"), str) and bool(fixture.get("role")),
            f"{fixture_id} lacks a role",
        )
        check.require(
            isinstance(fixture.get("expected_clean"), bool),
            f"{fixture_id} lacks expected_clean",
        )
        path = safe_path(fixture.get("path"), check, str(fixture_id))
        if path is not None:
            check.require(path not in seen_paths, f"duplicate fixture path: {path}")
            seen_paths.add(path)
        if fixture.get("kind") != "representative":
            params = fixture.get("params")
            check.require(
                isinstance(params, dict) and bool(params),
                f"{fixture_id} lacks generator params",
            )
    return [item for item in fixtures if isinstance(item, dict)]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def generate(manifest: dict[str, Any], fixtures: list[dict[str, Any]]) -> None:
    seed = str(manifest.get("seed"))
    for fixture in fixtures:
        if fixture.get("kind") == "representative":
            continue
        path = safe_path(fixture.get("path"), Checker(), str(fixture.get("id")))
        if path is None:
            raise ValueError(f"invalid path for {fixture.get('id')}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(render(fixture, seed), encoding="utf-8")
        print(f"generated: {path.relative_to(ROOT)}")


def update_manifest(
    manifest: dict[str, Any], fixtures: list[dict[str, Any]], path: Path
) -> None:
    for fixture in fixtures:
        target = safe_path(fixture.get("path"), Checker(), str(fixture.get("id")))
        if target is None or not target.is_file():
            raise ValueError(f"cannot hash missing fixture: {fixture.get('id')}")
        data = target.read_bytes()
        fixture["bytes"] = len(data)
        fixture["sha256"] = digest(data)
    write_manifest(path, manifest)
    print(f"updated: {path.relative_to(ROOT)}")


def check(manifest: dict[str, Any], fixtures: list[dict[str, Any]], check_obj: Checker) -> None:
    seed = str(manifest.get("seed"))
    total_bytes = 0
    generated = 0
    for fixture in fixtures:
        fixture_id = str(fixture.get("id"))
        path = safe_path(fixture.get("path"), check_obj, fixture_id)
        if path is None:
            continue
        check_obj.require(path.is_file(), f"{fixture_id} file is missing: {path}")
        if not path.is_file():
            continue
        data = path.read_bytes()
        total_bytes += len(data)
        check_obj.require(
            fixture.get("bytes") == len(data),
            f"{fixture_id} size is {len(data)}, manifest says {fixture.get('bytes')}",
        )
        check_obj.require(
            fixture.get("sha256") == digest(data),
            f"{fixture_id} SHA-256 does not match the manifest",
        )
        if fixture.get("kind") == "representative":
            continue
        generated += 1
        expected = render(fixture, seed).encode("utf-8")
        check_obj.require(
            data == expected,
            f"{fixture_id} is not reproducible from manifest parameters",
        )

    check_obj.require(generated > 0, "manifest has no generated fixtures")
    if check_obj.failures == 0:
        representatives = len(fixtures) - generated
        print(
            f"benchmark fixtures: {len(fixtures)} fixtures "
            f"({generated} generated, {representatives} representative), "
            f"{total_bytes} bytes; all reproducible"
        )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "manifest",
        nargs="?",
        default=str(MANIFEST_PATH),
        help="path to the benchmark fixture manifest",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify committed fixtures match their manifest entries",
    )
    parser.add_argument(
        "--update-manifest",
        action="store_true",
        help="regenerate fixtures and refresh size/hash metadata",
    )
    return parser.parse_args(argv[1:])


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    check_obj = Checker()
    try:
        manifest_path = Path(args.manifest).resolve()
        manifest = load_manifest(manifest_path)
        fixtures = validate(manifest, check_obj)
        if args.update_manifest:
            generate(manifest, fixtures)
            update_manifest(manifest, fixtures, manifest_path)
        elif args.check:
            check(manifest, fixtures, check_obj)
        else:
            generate(manifest, fixtures)
    except (OSError, UnicodeError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"benchmark fixture check failed: {error}", file=sys.stderr)
        return 1
    return 1 if check_obj.failures else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
