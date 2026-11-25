/**
 * @file Parser for Strudel, a Tidal Cycles base live coding tool
 * @author Zedro <45104292@PedroZappa@users.noreply.github.com >
 * @license AGPL-3.0-only
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "strudel",

  extras: $ => [
    /[\s\n]/,
    $.comment,
  ],

  precedences: () => [
    [
      "assignment",
      "ternary",
      "comparison",
      "additive",
      "multiplicative",
      "unary",
      "new",
      "call",
      "member",
    ],
  ],

  // JavaScript reuses identifiers and delimiters across labels, property
  // names, binding patterns, and expressions. These GLR conflicts preserve
  // context-sensitive interpretations without duplicating grammar rules.
  conflicts: $ => [
    [$.labeled_statement, $._property_name],
    [$._binding_pattern, $._primary_expression],
    [$._binding_pattern, $._assignment_target],
    [$._expression, $._unary_expression],
    [$._new_constructor, $._primary_expression],
    [$._expression, $._new_constructor],
    [$.array_pattern, $.array],
  ],

  rules: {
    source_file: $ => repeat($._statement),

    /* Statements */

    _statement: $ => choice(
      $._declaration,
      $.labeled_statement,
      $.return_statement,
      $.try_statement,
      $.expression_statement,
      $.block,
    ),

    _declaration: $ => choice(
      $.variable_declaration,
      $.function_declaration,
      $.import_declaration,
      $.export_declaration,
    ),

    expression_statement: $ => prec.right(-1, seq($._expression, optional(";"))),

    labeled_statement: $ => seq(
      field("label", $.identifier),
      ":",
      field("body", $._statement),
    ),

    block: $ => prec(1, seq("{", repeat($._statement), "}")),

    return_statement: $ => choice(
      prec.right(-1, seq("return", field("value", $._expression), optional(";"))),
      seq("return", ";"),
    ),

    try_statement: $ => seq(
      "try",
      field("body", $.block),
      seq(
        "catch",
        optional(seq("(", field("parameter", $._binding_pattern), ")")),
        field("handler", $.block),
      ),
    ),

    /* Declarations */

    variable_declaration: $ => seq(
      field("kind", choice("var", "let", "const")),
      commaSep1(field("declarator", $.variable_declarator)),
      optional(";"),
    ),

    variable_declarator: $ => prec.right(-1, seq(
      field("name", $._binding_pattern),
      optional(seq("=", field("value", $._expression))),
    )),

    function_declaration: $ => seq(
      "function",
      field("name", $.identifier),
      field("parameters", $.formal_parameters),
      field("body", $.block),
    ),

    formal_parameters: $ => seq(
      "(",
      commaSepTrailing(field("parameter", $._parameter)),
      ")",
    ),

    import_declaration: $ => seq(
      "import",
      field("specifiers", $.named_imports),
      "from",
      field("source", $.string),
      optional(";"),
    ),

    named_imports: $ => seq(
      "{",
      commaSepTrailing($.import_specifier),
      "}",
    ),

    import_specifier: $ => seq(
      field("name", $.identifier),
      optional(seq("as", field("alias", $.identifier))),
    ),

    export_declaration: $ => choice(
      seq("export", field("declaration", $._declaration)),
      prec.right(-1, seq("export", "default", field("value", $._expression), optional(";"))),
    ),

    /* Binding patterns */

    _binding_pattern: $ => choice(
      $.identifier,
      $.array_pattern,
    ),

    _parameter: $ => choice(
      $._binding_pattern,
      $.assignment_pattern,
    ),

    array_pattern: $ => seq(
      "[",
      commaSepTrailing(field("element", $._binding_pattern)),
      "]",
    ),

    assignment_pattern: $ => seq(
      field("left", $._binding_pattern),
      "=",
      field("right", $._expression),
    ),

    /* Expressions */

    _expression: $ => choice(
      $.assignment_expression,
      $.conditional_expression,
      $.binary_expression,
      $.unary_expression,
      $.await_expression,
      $.new_expression,
      $.arrow_function,
      $.tagged_template_expression,
      $.call_expression,
      $.member_expression,
      $.subscript_expression,
      $._primary_expression,
    ),

    assignment_expression: $ => prec.right("assignment", seq(
      field("left", $._assignment_target),
      "=",
      field("right", $._expression),
    )),

    _assignment_target: $ => choice(
      $.identifier,
      $.member_expression,
      $.subscript_expression,
    ),

    conditional_expression: $ => prec.right("ternary", seq(
      field("condition", $._expression),
      "?",
      field("consequence", $._expression),
      ":",
      field("alternative", $._expression),
    )),

    binary_expression: $ => choice(
      prec.left("comparison", seq(
        field("left", $._expression),
        field("operator", choice("<", ">", "<=", ">=", "==", "===", "!=", "!==")),
        field("right", $._expression),
      )),
      prec.left("additive", seq(
        field("left", $._expression),
        field("operator", choice("+", "-")),
        field("right", $._expression),
      )),
      prec.left("multiplicative", seq(
        field("left", $._expression),
        field("operator", choice("*", "/")),
        field("right", $._expression),
      )),
    ),

    unary_expression: $ => prec("unary", seq(
      field("operator", choice("!", "-")),
      field("argument", $._unary_expression),
    )),

    await_expression: $ => prec("unary", seq(
      "await",
      field("argument", $._unary_expression),
    )),

    _unary_expression: $ => choice(
      $.unary_expression,
      $.await_expression,
      $.call_expression,
      $.member_expression,
      $.subscript_expression,
      $._primary_expression,
    ),

    new_expression: $ => prec.right("new", seq(
      "new",
      field("constructor", $._new_constructor),
      optional(field("arguments", $.arguments)),
    )),

    _new_constructor: $ => choice(
      $.identifier,
      $.member_expression,
      $.subscript_expression,
      $.new_expression,
    ),

    arrow_function: $ => seq(
      field("parameters", $._arrow_parameters),
      "=>",
      field("body", $._arrow_body),
    ),

    _arrow_parameters: $ => choice(
      $.identifier,
      $.formal_parameters,
      $.array_pattern,
    ),

    _arrow_body: $ => prec.right(-1, choice(
      $._expression,
      $.block,
    )),

    call_expression: $ => prec("call", seq(
      field("function", $._expression),
      field("arguments", $.arguments),
    )),

    arguments: $ => seq(
      "(",
      commaSepTrailing(field("argument", $._expression)),
      ")",
    ),

    member_expression: $ => prec("member", seq(
      field("object", $._expression),
      choice(".", "?."),
      field("property", $.identifier),
    )),

    subscript_expression: $ => prec("member", seq(
      field("object", $._expression),
      choice("[", seq("?.", "[")),
      field("index", $._expression),
      "]",
    )),

    _primary_expression: $ => choice(
      $.identifier,
      $.string,
      $.number,
      $.template_string,
      $.object,
      $.array,
      $.parenthesized_expression,
    ),

    parenthesized_expression: $ => seq(
      "(",
      field("expression", $._expression),
      ")",
    ),

    tagged_template_expression: $ => prec("call", seq(
      field("tag", $._expression),
      field("template", $.template_string),
    )),

    /* Values and containers */

    object: $ => seq(
      "{",
      commaSepTrailing(choice($.pair, $.spread_element)),
      "}",
    ),

    pair: $ => seq(
      field("key", $._property_name),
      ":",
      field("value", $._expression),
    ),

    _property_name: $ => choice(
      $.identifier,
      $.string,
      $.number,
      $.computed_property_name,
    ),

    computed_property_name: $ => seq(
      "[",
      field("expression", $._expression),
      "]",
    ),

    spread_element: $ => seq(
      "...",
      field("value", $._expression),
    ),

    array: $ => seq(
      "[",
      commaSepTrailing(field("element", $._expression)),
      "]",
    ),

    string: () => choice(
      seq('"', repeat(choice(/[^"\\\n]/, /\\./)), '"'),
      seq("'", repeat(choice(/[^'\\\n]/, /\\./)), "'"),
    ),

    template_string: $ => seq(
      "`",
      repeat(choice($._template_chars, $.template_substitution)),
      "`",
    ),

    template_substitution: $ => seq(
      "${",
      field("expression", $._expression),
      "}",
    ),

    _template_chars: () => token(choice(
      /[^`\\$]+/,
      /\\./,
      "$",
    )),

    number: () => token(choice(
      /0[xX][0-9a-fA-F]+/,
      /\d*\.\d+/,
      /\d+/,
    )),

    identifier: () => /[A-Za-z_$][\w$]*/,

    comment: () => token(choice(
      seq("//", /(.*)?/),
      /\/\*([^*]|\*+[^*/])*\*+\//,
    )),
  },
});

/** @param {RuleOrLiteral} rule */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/** @param {RuleOrLiteral} rule */
function commaSepTrailing(rule) {
  return optional(seq(
    rule,
    repeat(seq(",", rule)),
    optional(","),
  ));
}
