const assert = require("node:assert/strict");
const { test } = require("node:test");

const Parser = require("tree-sitter");
const Language = require(".");

function parse(source) {
  const parser = new Parser();
  parser.setLanguage(Language);
  return parser.parse(source);
}

function pointAt(source, index) {
  const lines = source.slice(0, index).split("\n");
  return { row: lines.length - 1, column: Buffer.byteLength(lines.at(-1)) };
}

function replaceRange(tree, source, startIndex, oldEndIndex, replacement) {
  const updated =
    source.slice(0, startIndex) + replacement + source.slice(oldEndIndex);
  const newEndIndex = startIndex + Buffer.byteLength(replacement);
  tree.edit({
    startIndex,
    oldEndIndex,
    newEndIndex,
    startPosition: pointAt(source, startIndex),
    oldEndPosition: pointAt(source, oldEndIndex),
    newEndPosition: pointAt(updated, newEndIndex),
  });
  return updated;
}

test("can load grammar", () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require(".")));
});

test("exports generated language metadata", () => {
  assert.ok(Language.language);
  assert.deepEqual(Language.nodeTypeInfo, require("../../src/node-types.json"));
});

test("parses precedence from the current generated parser", () => {
  const parser = new Parser();
  parser.setLanguage(require("."));

  assert.equal(
    parser.parse("1 + 2 * 3\n").rootNode.toString(),
    "(source_file (expression_statement (binary_expression left: (number) right: (binary_expression left: (number) right: (number)))))",
  );
});

test("exposes representative CST fields through the binding", () => {
  const { rootNode } = parse('let pat = s("bd sd").gain(0.9).slow(2)\n');
  const declaration = rootNode.namedChild(0);

  assert.equal(declaration.type, "variable_declaration");
  assert.equal(declaration.childForFieldName("kind").text, "let");

  const declarator = declaration.childForFieldName("declarator");
  assert.equal(declarator.childForFieldName("name").text, "pat");

  const call = declarator.childForFieldName("value");
  assert.equal(call.type, "call_expression");
  assert.deepEqual(
    call.childForFieldName("arguments").namedChildren.map((node) => node.type),
    ["number"],
  );

  const member = call.childForFieldName("function");
  assert.equal(member.type, "member_expression");
  assert.equal(member.childForFieldName("property").text, "slow");
  assert.equal(member.childForFieldName("object").type, "call_expression");

  const strings = rootNode.descendantsOfType("string");
  assert.equal(strings.length, 1);
  assert.equal(strings[0].text, '"bd sd"');
});

test("recovers from an incomplete call through the binding", () => {
  const { rootNode } = parse('s("bd sd"\n');
  const calls = rootNode.descendantsOfType("call_expression");

  assert.equal(rootNode.hasError, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].childForFieldName("function").text, "s");
  assert.deepEqual(
    calls[0]
      .childForFieldName("arguments")
      .namedChildren.map((node) => node.text),
    ['"bd sd"'],
  );
  assert.match(rootNode.toString(), /\(MISSING "\)"\)/);
});

test("matches a fresh parse after an incremental edit", () => {
  const source = "let gain = 0.9\n";
  const parser = new Parser();
  parser.setLanguage(Language);
  const oldTree = parser.parse(source);
  const startIndex = source.indexOf("0.9");
  const updated = replaceRange(oldTree, source, startIndex, startIndex + 3, "1.2");

  const incremental = parser.parse(updated, oldTree);
  const fresh = parser.parse(updated);

  assert.equal(fresh.rootNode.hasError, false);
  assert.equal(incremental.rootNode.toString(), fresh.rootNode.toString());
});

test("executes a grammar-derived query through the binding", () => {
  const { rootNode } = parse('s("bd")\n');
  const query = new Parser.Query(
    Language,
    "(call_expression function: (identifier) @function.call)",
  );

  assert.deepEqual(
    query.captures(rootNode).map((capture) => [capture.name, capture.node.text]),
    [["function.call", "s"]],
  );
});
