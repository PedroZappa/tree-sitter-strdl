# Grammar architecture

This document records the grammar foundation established in Phase 2. [grammar.js](../grammar.js) remains the authoritative grammar definition; generated files under `src/` are build artifacts. The node and field names described here are the public syntax-tree API baseline as of version `1.3.0`.

## Scope

The grammar parses a JavaScript subset used by Strudel compositions. It deliberately does not parse mini-notation: `s("bd sd")` is a function call with one opaque `string` argument. Runtime evaluation, symbol resolution, and Strudel-specific interpretation belong downstream.

## Naming conventions

- Named nodes use `snake_case` and describe structural syntax: `function_call`, `variable_declarator`, `binary_expression`.
- Hidden grammar rules begin with `_`. They organize the grammar but do not produce nodes: `_statement`, `_initializer`, `_base_expression`.
- Anonymous tokens are literal grammar text such as `var`, `let`, `=>`, and punctuation. They are part of the concrete tree but receive no project-specific node name.
- List helpers are local JavaScript functions, not grammar rules: `commaSep`, `commaSep1`, and `commaSepTrailing`.
- Names that correspond to established JavaScript grammar concepts follow those conventions where they are useful to consumers. The rule bodies remain Strudel-oriented and are not a full ECMAScript grammar.
- Renaming a named node, field, or changing whether a rule is hidden is a public syntax-tree API change and requires a deliberate versioned decision.

## Public syntax-tree API

The stable baseline is the set of named node types and fields in [node-types.json](../src/node-types.json). There are 20 named node types and 7 field names. All fields are single-valued; only `variable_declarator.value` is optional.

| Area | Named nodes | Notes |
| --- | --- | --- |
| Root and statements | `source_file`, `assignment`, `variable_declaration`, `lexical_declaration`, `variable_declarator`, `comment` | `source_file` is the root. `comment` is an `extra` and may also appear as a statement. |
| Expressions | `expression`, `binary_expression`, `additive_expression`, `multiplicative_expression`, `chained_method`, `method_call`, `function_call`, `arrow_function` | Wrapper nodes are part of the current API. Parenthesized expressions have no dedicated node. |
| Values and containers | `object`, `pair`, `array`, `string`, `number`, `identifier` | Strings are opaque; mini-notation content is not interpreted. |

### Fields

| Node | Field | Required | Meaning |
| --- | --- | --- | --- |
| `additive_expression` | `operator` | yes | `+` or `-`. |
| `multiplicative_expression` | `operator` | yes | `*` or `/`. |
| `arrow_function` | `parameter` | yes | The single identifier parameter. |
| `arrow_function` | `body` | yes | The expression body. |
| `lexical_declaration` | `kind` | yes | The anonymous `let` or `const` token. |
| `pair` | `key` | yes | An `identifier`, `string`, or `number` property key. |
| `pair` | `value` | yes | The property value expression. |
| `variable_declarator` | `name` | yes | The declared identifier. |
| `variable_declarator` | `value` | no | The initializer expression. |

Calls, chains, assignments, and arithmetic operands intentionally have no `callee`, `argument`, `receiver`, `left`, or `right` fields in this baseline. Consumers distinguish those children by node type and position. Adding such fields later would be a public API change. `variable_declaration` has no `kind` field, while `lexical_declaration` does; this asymmetry is part of the current baseline.

## Statement and expression hierarchy

`source_file` contains zero or more statements. The hidden `_statement` rule is the union of:

- `assignment` (`$:` or a labeled `identifier :` form);
- `variable_declaration` (`var`);
- `lexical_declaration` (`let` or `const`);
- `expression`;
- `comment`.

The hidden `_initializer` rule supplies the optional `= expression` portion of a `variable_declarator`. It is flattened into the `value` field.

The public `expression` node is the top-level expression wrapper. It is a choice over `chained_method`, `binary_expression`, `arrow_function`, and the hidden `_base_expression`. `_base_expression` is the composable primary-expression category:

- `function_call`;
- `identifier`;
- `string`;
- `number`;
- `object`;
- `array`;
- parenthesized `expression`.

A `chained_method` is a `_base_expression` followed by one or more `method_call` nodes. Method calls are stored as a flat list, not as a left-nested tree.

`binary_expression` wraps `additive_expression`, `multiplicative_expression`, or a `_base_expression`. Each additive or multiplicative rule contains two `binary_expression` operands. This produces a wrapper-heavy but uniform tree: for example, even a numeric operand appears under `expression → binary_expression → number`.

The wrapper hierarchy is deliberate as the current API baseline, but it is not intended to encode Strudel semantics. Consumers that need a semantic AST should normalize these wrappers downstream.

## Precedence and associativity

Tree-sitter numeric `prec` values and named precedence levels are separate mechanisms. Numeric values are compared with other numeric values; named levels are declared in the `precedences` table.

| Rule | Declaration | Effect |
| --- | --- | --- |
| `arrow_function` | `prec('arrow_function', ...)` | Uses the named `arrow_function` precedence level. This is the only named level retained. |
| `assignment` | `prec(2, ...)` | Numeric precedence 2. |
| `expression` | `prec(2, ...)` | Numeric precedence 2. |
| `function_call` | `prec(1, ...)` | Numeric precedence 1. |
| `binary_expression` | `prec(1, ...)` | Numeric precedence 1. |
| `additive_expression` | `prec.left(1, ...)` | Left-associative at numeric precedence 1; covers `+` and `-`. |
| `multiplicative_expression` | `prec.left(2, ...)` | Left-associative at numeric precedence 2; covers `*` and `/` and binds tighter than additive operations. |
| `chained_method` | `prec.left(...)` | Left-associative marker at default numeric precedence. The implementation is a flat `repeat1($.method_call)`, so this marker is retained as existing behavior rather than relied on for nesting. |

The previously declared named levels `member`, `call`, `binary_times`, and `binary_plus` were unreferenced and have been removed. No rule uses `prec.right`.

Phase 2 verification confirms:

- `1 + 2 * 3` groups multiplication inside addition.
- `1 + 2 + 3` and `1 - 2 - 3` group left-to-right.
- `1 * 2 / 3` groups left-to-right.
- `x.foo() + 1` requires parentheses around the chain. `binary_expression` does not directly accept `chained_method` or `arrow_function`; the parenthesized form parses. This is a documented current boundary, not a conflict.

## Conflict policy

There are no active conflicts. The commented-out `conflicts` entry was dead metadata and has been removed. `src/grammar.json` records `conflicts: []`.

A future conflict declaration must include:

1. the exact ambiguous construct;
2. parse evidence that a deterministic rule cannot represent it;
3. the intended tree for each competing interpretation;
4. corpus regression tests for both interpretations.

No GLR conflict resolution is currently justified.

## Error recovery and stability

The grammar favors preserving valid syntax around malformed regions over producing a smaller tree. The `expression` and `binary_expression` wrappers can survive incomplete operands, and method chains remain visible as flat `method_call` children. Comments are extras, so they may be skipped between tokens while still appearing as named top-level nodes.

Parenthesized expressions produce no node of their own; their structure is represented only by the nested `expression`. On malformed input, consumers should not assume that every wrapper has a complete child set.

Phase 2 intentionally makes no changes to named nodes, fields, or tree shape. Regenerated artifacts are reviewed as an API event even when `node-types.json` is unchanged. Any later wrapper removal, field addition, node rename, or associativity change must be documented here and recorded in the roadmap as a syntax-tree API change.

## Verification

Foundational rules and precedence decisions are covered by corpus tests in [test/corpus](../test/corpus). After every grammar change:

1. regenerate with the pinned Tree-sitter CLI;
2. review the `src/node-types.json` diff;
3. run corpus tests;
4. compile and execute both official queries;
5. update this document when public tree behavior changes.
