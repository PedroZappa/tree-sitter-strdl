const assert = require("node:assert");
const { test } = require("node:test");

const Parser = require("tree-sitter");

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require(".")));
});

test("parses precedence from the current generated parser", () => {
  const parser = new Parser();
  parser.setLanguage(require("."));

  assert.equal(
    parser.parse("1 + 2 * 3\n").rootNode.toString(),
    "(source_file (expression_statement (binary_expression left: (number) right: (binary_expression left: (number) right: (number)))))",
  );
});
