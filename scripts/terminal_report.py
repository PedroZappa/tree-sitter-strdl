"""Dependency-free terminal status helper for project check scripts.

Status summaries are terminal-only: callers keep their original plain output
for redirected logs and CI. ``NO_COLOR`` disables color while preserving the
compact summary.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Iterable
from typing import TextIO

ANSI_BOLD = "1"
ANSI_GREEN = "32"
ANSI_YELLOW = "33"
ANSI_RED = "31"


def is_terminal(stream: TextIO | None = None) -> bool:
    target = stream if stream is not None else sys.stdout
    return bool(getattr(target, "isatty", lambda: False)())


class Styles:
    """ANSI style functions that become no-ops outside a color terminal."""

    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled

    def _paint(self, code: str):
        def apply(text: object) -> str:
            value = str(text)
            return f"\x1b[{code}m{value}\x1b[0m" if self.enabled else value

        return apply

    def bold(self, text: object) -> str:
        return self._paint(ANSI_BOLD)(text)

    def green(self, text: object) -> str:
        return self._paint(ANSI_GREEN)(text)

    def yellow(self, text: object) -> str:
        return self._paint(ANSI_YELLOW)(text)

    def red(self, text: object) -> str:
        return self._paint(ANSI_RED)(text)

    def status(self, passed: bool | None) -> str:
        if passed is None:
            return self.yellow("ERROR")
        return self.green("PASS") if passed else self.red("FAIL")


def styles(stream: TextIO | None = None) -> Styles:
    color = is_terminal(stream) and not os.environ.get("NO_COLOR")
    return Styles(color)


def print_terminal_status(
    title: str,
    passed: bool | None,
    details: Iterable[object] = (),
    stream: TextIO | None = None,
) -> bool:
    """Print a compact terminal-only status and return whether it was printed."""
    target = stream if stream is not None else sys.stdout
    if not is_terminal(target):
        return False
    style = styles(target)
    parts = [style.bold(title), style.status(passed)]
    parts.extend(str(detail) for detail in details)
    target.write(f"{'  '.join(parts)}\n")
    return True
