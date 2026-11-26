#!/usr/bin/env node
"use strict";

// Small terminal-formatting primitives shared by the benchmark CLIs.
// These helpers intentionally have no dependencies and never alter redirected
// output unless a caller explicitly renders a terminal-only summary.

const ANSI = {
  bold: 1,
  dim: 2,
  green: 32,
  yellow: 33,
};

function isTerminal(stream = process.stdout) {
  return Boolean(stream && stream.isTTY);
}

function terminalStyles(stream = process.stdout) {
  const enabled = isTerminal(stream) && !process.env.NO_COLOR;
  const paint = (code) => (text) =>
    enabled ? `\x1b[${code}m${text}\x1b[0m` : text;
  return {
    enabled,
    bold: paint(ANSI.bold),
    dim: paint(ANSI.dim),
    green: paint(ANSI.green),
    yellow: paint(ANSI.yellow),
  };
}

function terminalWidth(stream = process.stdout) {
  const columns =
    stream && typeof stream.columns === "number" ? stream.columns : 100;
  return Math.max(60, Math.min(columns, 120));
}

function clip(text, width) {
  const value = String(text);
  const safeWidth = Math.max(1, Math.floor(width));
  return value.length <= safeWidth
    ? value
    : `${value.slice(0, safeWidth - 1)}…`;
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

function renderCompactTable({ title, headers, rows, stream = process.stdout }) {
  const style = terminalStyles(stream);
  const width = terminalWidth(stream);
  const lines = [style.bold(title)];
  for (const row of rows) {
    lines.push(`  ${clip(row[0], width - 4)}`);
    let line = "";
    for (let index = 1; index < headers.length; index += 1) {
      const fragment = `${headers[index]} ${row[index]}`;
      const candidate = line ? `${line}  ${fragment}` : `    ${fragment}`;
      if (line && candidate.length > width) {
        lines.push(line);
        line = `    ${fragment}`;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return `${lines.join("\n")}\n`;
}

module.exports = {
  isTerminal,
  terminalStyles,
  terminalWidth,
  clip,
  pad,
  renderCompactTable,
};
