/**
 * @file Parser for Strudel, a Tidal Cycles base live coding tool
 * @author Zedro <45104292+PedroZappa@users.noreply.github.com >
 * @license AGPL-3.0-only
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "strudel",

  extras: $ => [
    /[\s\n]/,         // whitespace
    $.comment,        // enable comments
  ],

  precedences: $ => [
    [
      'member',
      'call',
      'binary_times',
      'binary_plus',
      'arrow_function',
    ],
  ],

  // conflicts: $ => [
  //   [$._base_expression, $.arrow_function],  // Handle potential conflicts
  // ],

  rules: {
    source_file: $ => repeat($._statement), // Root Rule

    _statement: $ => choice(  // Hidden Rule, for structural organization
      $.assignment,
      $.variable_declaration,
      $.lexical_declaration,
      $.expression,
      $.comment
    ),

    /* 1. Variables */
    // Variable delcaration with 'var'
    variable_declaration: $ => seq(
      'var',
      commaSep1($.variable_declarator),
      optional(';')
    ),

    // Variable declaration with 'let' or 'const'
    lexical_declaration: $ => seq(
      field('kind', choice('let', 'const')),
      commaSep1($.variable_declarator),
      optional(';')
    ),

    // Variable declarator - handles the name = value part
    variable_declarator: $ => seq(
      field('name', $.identifier),
      optional($._initializer),
    ),

    /* Initializer for variable assignments */
    _initializer: $ => seq(
      '=',
      field('value', $.expression)
    ),

    /* 2. Accept *any* expression (including chains) */
    assignment: $ => prec(2, choice(
      seq('$:', $.expression), // Default Identifier 
      seq($.identifier, ':', $.expression), // Custom Identifies
    )),

    /* 3. Simple Function Calls */
    function_call: $ => prec(1, seq(
      $.identifier,
      '(',
      commaSepTrailing($.expression),
      ')'
    )),

    /* 4. Method Calls */
    method_call: $ => seq(
      '.',
      $.identifier,
      '(',
      commaSepTrailing($.expression),
      ')'
    ),

    /* 5. Chain of one or more method-calls */
    chained_method: $ => prec.left(seq(
      $._base_expression,
      repeat1($.method_call)
    )),

    /* 6. Binary Expressions for Arithmetic Operations */
    binary_expression: $ => prec(1, choice(
      $.additive_expression,
      $.multiplicative_expression,
      $._base_expression
    )),
    // Addition and Subtraction (lowest precedence)
    additive_expression: $ => prec.left(1, seq(
      $.binary_expression,
      field('operator', choice('+', '-')),
      $.binary_expression
    )),
    // Multiplication and Division (higher precedence)
    multiplicative_expression: $ => prec.left(2, seq(
      $.binary_expression,
      field('operator', choice('*', '/')),
      $.binary_expression
    )),

    /* 7. Arrow Function (Lambda) Support */
    arrow_function: $ => prec('arrow_function', seq(
      field('parameter', $.identifier),  // Single parameter
      '=>',
      field('body', $.expression)
    )),

    /* 8. Full Expression Hierarchy */
    expression: $ => prec(2, choice(  // Higher precedence
      $.chained_method,
      $.binary_expression,
      $.arrow_function,
      $._base_expression,
    )),

    /* 9. What can start a chain */
    _base_expression: $ => choice(
      $.function_call,
      $.identifier,
      $.string,
      $.number,
      $.object,
      $.array,
      seq('(', $.expression, ')') // Parenthesized expressions
    ),

    /* 10. Object Literal Support */
    object: $ => seq(
      '{',
      commaSep($.pair),
      '}'
    ),

    pair: $ => seq(
      field('key', choice(
        $.identifier,    // For keys like {edo: 10}
        $.string,        // For keys like {"key": value}
        $.number         // For keys like {1: value}
      )),
      ':',
      field('value', $.expression)
    ),

    /* 11. Array Literal Support */
    array: $ => seq(
      '[',
      commaSep($.expression),
      ']',
    ),

    /* 12. Terminal Rules */
    string: $ => choice(
      seq(
        '"',
        repeat(choice(/[^"\\\n]/, /\\./)),
        '"'
      ),
      seq(
        "'",
        repeat(choice(/[^'\\\n]/, /\\./)),
        "'"
      ),
      seq(
        '`',
        repeat(choice(/[^`\\\n]/, /\\./)),
        '`'
      )
    ),
    number: $ => /\d*\.\d+|\d+/,   // “.5”, “3.14”, “10”
    identifier: $ => /[a-zA-Z_]\w*/,
    comment: $ => token(seq('//', /(.*)?/)),
  }
});

// Helper for comma-separated lists
function commaSep(rule) {
  return optional(seq(rule, repeat(seq(',', rule))));
}
// Helper for comma-separated lists (at least one)
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

// Helper for comma-separated lists that ALLOW a trailing comma
function commaSepTrailing(rule) {
  return optional(seq(
    rule,
    repeat(seq(',', rule)),
    optional(',')          // trailing comma
  ));
}
