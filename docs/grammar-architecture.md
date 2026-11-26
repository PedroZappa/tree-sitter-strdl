# Grammar architecture

This document records the current grammar architecture introduced by the Phase 3 structured refactor and corrected by the Phase 6 precedence fix. [grammar.js](../grammar.js) remains the authoritative grammar definition; generated files under `src/` are build artifacts. The node and field names described here are the public syntax-tree API verified against the committed generated artifacts on 2026-11-26.

## Scope

The grammar parses the JavaScript subset used by Strudel compositions. It deliberately does not parse mini-notation: `s("bd sd")` is a `call_expression` with one opaque `string` argument. Runtime evaluation, symbol resolution, and Strudel-specific interpretation belong downstream.

The refactor replaces the Phase 2 wrapper-heavy hierarchy with composable, JavaScript-like expression and statement rules. This is a deliberate public CST API change.

## Naming conventions

- Named nodes use `snake_case` and describe structural syntax: `call_expression`, `member_expression`, `variable_declarator`, `binary_expression`.
- Hidden grammar rules begin with `_`. They organize the grammar but do not produce nodes: `_statement`, `_expression`, `_primary_expression`.
- Anonymous tokens are literal grammar text such as `var`, `=>`, `?.`, and punctuation. They are part of the concrete tree but have no project-specific node name.
- Fields describe structural relationships: `function`, `arguments`, `object`, `property`, `left`, `right`, `body`, and similar.
- List helpers are local JavaScript functions, not grammar rules: `commaSep`, `commaSep1`, and `commaSepTrailing`.
- Names follow established JavaScript grammar conventions where they improve downstream compatibility. The rule bodies remain Strudel-oriented and are not a full ECMAScript grammar.
- Renaming a named node, field, or changing whether a rule is hidden is a public syntax-tree API change and requires a deliberate versioned decision under the [breaking-change policy](compatibility.md#breaking-change-policy-for-cst-and-queries).

## Public syntax-tree API

[src/node-types.json](../src/node-types.json) contains 40 named node types and 31 field names. Field names are part of the public syntax-tree API: queries such as `(call_expression function: (identifier) @callee)` depend on them.

| Area                        | Named nodes                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root and statements         | `source_file`, `block`, `expression_statement`, `labeled_statement`, `return_statement`, `try_statement`, `comment`                                                                                                |
| Declarations and parameters | `variable_declaration`, `variable_declarator`, `function_declaration`, `formal_parameters`, `import_declaration`, `named_imports`, `import_specifier`, `export_declaration`, `array_pattern`, `assignment_pattern` |
| Calls and access            | `call_expression`, `arguments`, `member_expression`, `subscript_expression`, `new_expression`, `tagged_template_expression`                                                                                        |
| Operators and control flow  | `assignment_expression`, `binary_expression`, `unary_expression`, `await_expression`, `conditional_expression`, `arrow_function`                                                                                   |
| Values and containers       | `object`, `pair`, `computed_property_name`, `spread_element`, `array`, `string`, `template_string`, `template_substitution`, `number`, `identifier`, `parenthesized_expression`                                    |

### Public fields

The table below is the complete node-to-field inventory. A trailing `?` marks an optional singular field; a trailing `*` marks a repeatable field with zero or more children in source order, except `variable_declaration.declarator`, which is required and repeatable. An unmarked field is required and singular.

| Node                         | Fields                                    |
| ---------------------------- | ----------------------------------------- |
| `arguments`                  | `argument*`                               |
| `array`                      | `element*`                                |
| `array_pattern`              | `element*`                                |
| `arrow_function`             | `parameters`, `body`                      |
| `assignment_expression`      | `left`, `right`                           |
| `assignment_pattern`         | `left`, `right`                           |
| `await_expression`           | `argument`                                |
| `binary_expression`          | `left`, `operator`, `right`               |
| `call_expression`            | `function`, `arguments`                   |
| `computed_property_name`     | `expression`                              |
| `conditional_expression`     | `condition`, `consequence`, `alternative` |
| `export_declaration`         | `declaration?`, `value?`                  |
| `formal_parameters`          | `parameter*`                              |
| `function_declaration`       | `name`, `parameters`, `body`              |
| `import_declaration`         | `specifiers`, `source`                    |
| `import_specifier`           | `name`, `alias?`                          |
| `labeled_statement`          | `label`, `body`                           |
| `member_expression`          | `object`, `property`                      |
| `new_expression`             | `constructor`, `arguments?`               |
| `pair`                       | `key`, `value`                            |
| `parenthesized_expression`   | `expression`                              |
| `return_statement`           | `value?`                                  |
| `spread_element`             | `value`                                   |
| `subscript_expression`       | `object`, `index`                         |
| `tagged_template_expression` | `tag`, `template`                         |
| `template_substitution`      | `expression`                              |
| `try_statement`              | `body`, `parameter?`, `handler`           |
| `unary_expression`           | `operator`, `argument`                    |
| `variable_declaration`       | `kind`, `declarator+`                     |
| `variable_declarator`        | `name`, `value?`                          |

#### Repeatable fields

| Field                              | Meaning                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `arguments.argument*`              | Ordered call arguments inside the `arguments` node.                               |
| `array.element*`                   | Ordered values in an array literal.                                               |
| `array_pattern.element*`           | Ordered binding targets in an array destructuring pattern.                        |
| `formal_parameters.parameter*`     | Ordered function or arrow parameters; defaults are `assignment_pattern` children. |
| `variable_declaration.declarator+` | Ordered bindings declared by one `var`, `let`, or `const` keyword.                |

Repeated fields produce one child per occurrence. Consumers should preserve their order; Tree-sitter does not sort them. The `+` suffix marks the one required repeatable field; `*` marks fields that may be absent.

#### Optional singular fields

| Field                             | Absent when                                                             |
| --------------------------------- | ----------------------------------------------------------------------- |
| `import_specifier.alias?`         | A named import keeps its original name.                                 |
| `new_expression.arguments?`       | A constructor is called without an argument list, as in `new Synth`.    |
| `export_declaration.declaration?` | The export uses `export default <expression>` instead of a declaration. |
| `export_declaration.value?`       | The export wraps a declaration instead of a default expression.         |
| `try_statement.parameter?`        | `catch` omits its binding, as in `catch {}`.                            |
| `return_statement.value?`         | `return` has no operand.                                                |
| `variable_declarator.value?`      | A binding has no initializer, as in `let pattern;`.                     |

Only one of `export_declaration.declaration?` and `export_declaration.value?` is used by a supported export form. Optional fields are not failures: queries should match them only when the specific syntax is required.

#### Field values and anonymous tokens

Most field values are named nodes. The exact type union for each field is recorded in [src/node-types.json](../src/node-types.json); the full expression union is intentionally broad so consumers do not need to normalize one expression node per operator.

Three fields contain anonymous tokens rather than named nodes:

| Field                        | Allowed tokens                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| `variable_declaration.kind`  | `var`, `let`, `const`                                              |
| `binary_expression.operator` | `!=`, `!==`, `*`, `+`, `-`, `/`, `<`, `<=`, `==`, `===`, `>`, `>=` |
| `unary_expression.operator`  | `!`, `-`                                                           |

Query those values as quoted token patterns, for example `(variable_declaration kind: "const") @declaration`.

Field names are contextual rather than global. `value` can be an initializer, return operand, export expression, object property value, or spread operand depending on its node; `expression` can be an expression inside parentheses, a computed key, or a template substitution; `left` and `right` describe both binary operands and default-parameter patterns. Match the node type and field together, and avoid treating a field name alone as a semantic role.

The following query uses fields to target the opaque string argument of a direct call without depending on the callee name:

```scheme
(call_expression
  function: (identifier) @callee
  arguments: (arguments argument: (string) @literal))
```

### Important node types

The complete inventory is above. The entries below explain the nodes downstream consumers are most likely to use. This is a reading guide, not a second API definition: use the [field table](#public-fields) and [src/node-types.json](../src/node-types.json) for exact field and subtype sets.

#### Root, statements, and declarations

| Node type                             | Example                                    | Role                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source_file`                         | An entire `.strdl` file                    | Root node. Its named children are statements and comments. Empty files are valid.                                                                       |
| `expression_statement`                | `s("bd sd");`                              | Wraps an expression used as a statement. The optional semicolon is an anonymous token.                                                                  |
| `variable_declaration`                | `const pattern = s("bd sd");`              | Declares one or more bindings. The `kind` field is the `var`, `let`, or `const` token and `declarator` repeats.                                         |
| `variable_declarator`                 | `pattern = s("bd sd")`                     | One binding. `name` is an `identifier` or `array_pattern`; `value` is the optional initializer. Mini-notation appears here as an opaque `string` value. |
| `function_declaration`                | `function kick(n) { return n; }`           | Named function with `name`, `parameters` (`formal_parameters`), and `body` (`block`) fields.                                                            |
| `array_pattern`, `assignment_pattern` | `[a, b]`, `function f(p = s("bd")) {}`     | Array destructuring in declarations or parameters, and default parameter values. Object destructuring is not implemented.                               |
| `import_declaration`, `named_imports` | `import { note as n } from "strudel";`     | Named imports only. `specifiers` is `named_imports` and `source` is a `string`; each `import_specifier` has `name` and optional `alias`.                |
| `export_declaration`                  | `export const p = 1;`, `export default p;` | Exports a declaration through `declaration` or an expression through `value`. Exactly one of those fields is present for supported syntax.              |

#### Calls, access, and operators

| Node type                              | Example                         | Role                                                                                                                                                                                                              |
| -------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `call_expression`, `arguments`         | `s("bd sd")`                    | `function` is the callee expression and `arguments` is the parenthesized argument node. Individual arguments use repeated `argument` fields. The callee may be an identifier, member expression, or another call. |
| `member_expression`                    | `s("bd").gain`, `pattern?.gain` | `object` is the receiver and `property` is an `identifier`. The `.` or `?.` token is anonymous. Method chains appear as nested `call_expression` and `member_expression` nodes.                                   |
| `subscript_expression`                 | `items[0]`, `pattern?.["gain"]` | `object` is the receiver and `index` is an expression. Optional subscript access uses the anonymous `?.` token before `[`.                                                                                        |
| `new_expression`                       | `new Synth(1)`                  | `constructor` is restricted to identifiers, member/subscript expressions, and nested `new_expression` nodes; `arguments` is optional.                                                                             |
| `assignment_expression`                | `pattern = s("hh")`             | `left` may be an `identifier`, `member_expression`, or `subscript_expression`; `right` is any expression.                                                                                                         |
| `binary_expression`                    | `a + b * 2`, `x === y`          | `left`, `operator`, and `right` fields expose arithmetic, comparison, and equality operators. Precedence and associativity are described in [Precedence and associativity](#precedence-and-associativity).        |
| `unary_expression`, `await_expression` | `!ready`, `-1`, `await pattern` | `operator` applies to an `argument` for unary expressions; `await_expression` has only `argument`.                                                                                                                |
| `conditional_expression`               | `enabled ? pattern : silence`   | Exposes `condition`, `consequence`, and `alternative` as expression fields.                                                                                                                                       |
| `arrow_function`                       | `x => x * 2`, `(a, b) => a + b` | `parameters` may be an `identifier`, `formal_parameters`, or `array_pattern`; `body` is an expression or `block`.                                                                                                 |
| `tagged_template_expression`           | `` tag`bd sd` ``                | `tag` is the tagged expression and `template` is a `template_string`. Backtick content remains opaque except for `${...}` substitutions.                                                                          |

#### Values and containers

| Node type                                  | Example                       | Role                                                                                                                                                                            |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identifier`, `number`, `string`           | `pattern`, `42`, `"bd sd"`    | Leaf value nodes. `string` accepts single or double quotes and keeps mini-notation opaque; its content is never re-parsed as mini-notation.                                     |
| `array`                                    | `[1, note("c3")]`             | Array literal with repeated `element` fields.                                                                                                                                   |
| `object`, `pair`, `computed_property_name` | `{ kick: s("bd"), [key]: 1 }` | The `object` node contains `pair` and `spread_element` children. A `pair` has `key` and `value`; a computed key wraps its `expression`.                                         |
| `spread_element`                           | `{ ...rest }`                 | An object-literal spread with a `value` field. Spread is supported in object literals, not array literals or call argument lists.                                               |
| `parenthesized_expression`                 | `(a + b) * 2`                 | Preserves explicit grouping as an `expression` field instead of flattening it into the surrounding operator tree.                                                               |
| `template_string`, `template_substitution` | `` `c${octave}` ``            | A template literal with only its `${...}` substitutions exposed as `template_substitution` nodes. Each substitution has an `expression` field; literal template text is opaque. |
| `comment`                                  | `// loop`, `/* loop */`       | Named node emitted because comments are extras. Comments may appear between any tokens and do not change expression structure.                                                  |

Some names overlap by design. `object` is the object-literal node, while `object` is also the receiver field on `member_expression` and `subscript_expression`. `arguments` is both the parenthesized argument-list node and the `call_expression.arguments` field. Query with the node type and field name together to avoid conflating them.

A representative method chain illustrates the nesting consumers should expect:

```text
s("bd sd").gain(0.8)

call_expression
├── function: member_expression
│   ├── object: call_expression
│   │   ├── function: identifier
│   │   └── arguments: arguments -> string
│   └── property: identifier
└── arguments: arguments -> number
```

### API changes from the Phase 2 baseline

| Phase 2                                            | Phase 3                                                               | Reason                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `expression` wrapper                               | Removed; expression nodes are direct children                         | The wrapper obscured call, member, and operator structure.           |
| `assignment`                                       | `labeled_statement` for `label:`; `assignment_expression` for `x = y` | The two forms have different syntax and behavior.                    |
| `lexical_declaration`                              | Folded into `variable_declaration` with a `kind` field                | `var`, `let`, and `const` share one declaration structure.           |
| `additive_expression`, `multiplicative_expression` | `binary_expression` with an `operator` field                          | one node type supports all binary operators and precedence levels.   |
| `function_call`                                    | `call_expression` with `function` and `arguments` fields              | Aligns with standard JavaScript grammar conventions.                 |
| `chained_method`, `method_call`                    | Nested `call_expression` and `member_expression`                      | Chains now expose receiver and callee relationships explicitly.      |
| `arrow_function.parameter`                         | `arrow_function.parameters`                                           | Supports zero, one, multiple, and destructured parameters.           |
| No parenthesized node                              | `parenthesized_expression`                                            | Preserves grouping explicitly.                                       |
| Opaque backtick strings                            | `template_string` with `template_substitution`                        | Exposes interpolation expressions while leaving literal text opaque. |

Consumers should treat this as a breaking CST API change and update queries or normalization logic accordingly.

## Statement and expression hierarchy

`source_file` contains zero or more statements; comments may also appear as named extra children. The hidden `_statement` rule is the union of:

- declarations (`variable_declaration`, `function_declaration`, `import_declaration`, `export_declaration`);
- `labeled_statement`;
- `return_statement`;
- `try_statement`;
- `expression_statement`;
- `block`.

The hidden `_expression` rule is the union of assignment, conditional, binary, unary, `await`, `new`, arrow, tagged template, call, member, subscript, and primary expressions. Left-recursive call/member/tagged-template forms are resolved by named precedence levels.

Primary expressions are `identifier`, `string`, `number`, `template_string`, `object`, `array`, and `parenthesized_expression`. Mini-notation remains ordinary `string` content; template and tagged-template bodies remain opaque except for `${...}` interpolation expressions.

Binding patterns are `identifier` and `array_pattern`. Formal parameters additionally accept `assignment_pattern` for defaults. Object destructuring is not yet implemented.

Phase 6 added `test/corpus/modern_javascript_constructs.txt` to assert grammar-supported forms that previously lacked explicit cases: optional `catch` bindings, valueless `return`, valid array destructuring, trailing commas in parameter and import lists, import aliases, all assignment targets and comparison operators, nested ternaries, richer `new` constructors, empty containers, numeric object keys, and string/template escapes.

Phase 6 added `test/corpus/nested_expressions_and_method_chains.txt` to assert receiver and argument nesting: parenthesized, subscripted, optional, computed-index, tagged-template, and awaited chain receivers; call-on-call results; and arithmetic, conditional, container, and deeply nested call arguments.

## Precedence and associativity

Named precedence levels are declared in [grammar.js](../grammar.js) from highest to lowest, as required by Tree-sitter:

```text
member > call > new > unary > multiplicative > additive
       > comparison > ternary > assignment
```

An earlier declaration used ascending order, which inverted mixed-operator trees. The corrected order makes `a + b * c` parse as `a + (b * c)` and `a > b ? c : d` parse as a conditional expression with a comparison condition.

| Level            | Applied to                                                | Associativity or effect                                                        |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `member`         | `member_expression`, `subscript_expression`               | Dot, optional dot, index, and optional index bind tightest.                    |
| `call`           | `call_expression`, `tagged_template_expression`           | Argument lists and tagged templates bind tighter than `new` and unary forms.   |
| `new`            | `new_expression`                                          | Right-associative; supports nested `new` and member access on a `new` result.  |
| `unary`          | `unary_expression`, `await_expression`                    | Operands use `_unary_expression`, so postfix chains remain inside the operand. |
| `multiplicative` | `binary_expression` with `*` or `/`                       | Left-associative.                                                              |
| `additive`       | `binary_expression` with `+` or `-`                       | Left-associative.                                                              |
| `comparison`     | `binary_expression` with comparison or equality operators | Left-associative.                                                              |
| `ternary`        | `conditional_expression`                                  | Right-associative.                                                             |
| `assignment`     | `assignment_expression`                                   | Right-associative and lowest named level.                                      |

Two numeric precedence values are separate from the named levels. `prec.right(-1, ...)` on `expression_statement`, `return_statement`, `variable_declarator`, `export default`, and `_arrow_body` prefers postfix continuation over reducing a surrounding statement or body. `prec(1, ...)` on `block` prefers a block over an empty object literal in statement position. `prec.right("new", ...)` is included in the named-level table because it participates in the declared ordering.

Representative trees checked with the current binding confirm the intended shapes:

| Input               | Result                |
| ------------------- | --------------------- |
| `a + b * c`         | `a + (b * c)`         |
| `a - b - c`         | `(a - b) - c`         |
| `a = b = c`         | `a = (b = c)`         |
| `a ? b : c ? d : e` | `a ? b : (c ? d : e)` |
| `!x(1)`             | `!(x(1))`             |
| `f()()`             | `(f())()`             |
| `new Foo().bar`     | `(new Foo()).bar`     |
| `new new Foo()`     | `new (new Foo())`     |

These shapes are covered by [test/corpus/precedence.txt](../test/corpus/precedence.txt), [test/corpus/operators.txt](../test/corpus/operators.txt), [test/corpus/modules.txt](../test/corpus/modules.txt), [test/corpus/nested_expressions_and_method_chains.txt](../test/corpus/nested_expressions_and_method_chains.txt), the ternary interpolation regression in [test/corpus/valid_syntax_expansions.txt](../test/corpus/valid_syntax_expansions.txt), and the right-nested ternary case in [test/corpus/modern_javascript_constructs.txt](../test/corpus/modern_javascript_constructs.txt).

## Conflict policy

Seven GLR conflicts are declared in [grammar.js](../grammar.js). Each is load-bearing: removing any one declaration from an isolated copy makes `tree-sitter generate` fail with an unresolved ambiguity. They preserve context-sensitive interpretations without duplicating rules; they do not encode Strudel semantics.

| Conflict                                   | Ambiguous input                      | Chosen interpretation                                                 | Corpus evidence                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labeled_statement` / `_property_name`     | `$: note("c3")`, `{ gain: 0.5 }`     | `$:` is a label in statement position; `gain:` is a pair key.         | [objects_args.txt](../test/corpus/objects_args.txt), [array_literal.txt](../test/corpus/array_literal.txt), [valid_syntax_expansions.txt](../test/corpus/valid_syntax_expansions.txt)         |
| `_binding_pattern` / `_primary_expression` | `const [a] = voices`, `[1, 2]`       | Bracketed identifiers bind on the left; numeric arrays remain values. | [modern_javascript_constructs.txt](../test/corpus/modern_javascript_constructs.txt), [base_expressions.txt](../test/corpus/base_expressions.txt)                                              |
| `_binding_pattern` / `_assignment_target`  | `function f([a] = notes) {}`         | The left side of a default parameter is an `assignment_pattern`.      | [modern_javascript_constructs.txt](../test/corpus/modern_javascript_constructs.txt)                                                                                                           |
| `_expression` / `_unary_expression`        | `!ready`, `await initHydra().set(1)` | The call chain remains inside the unary or await operand.             | [operators.txt](../test/corpus/operators.txt), [modules.txt](../test/corpus/modules.txt), [nested_expressions_and_method_chains.txt](../test/corpus/nested_expressions_and_method_chains.txt) |
| `_new_constructor` / `_primary_expression` | `new Foo`, `new a.B[0]()`            | Identifier, member, and subscript forms are valid constructors.       | [modules.txt](../test/corpus/modules.txt), [modern_javascript_constructs.txt](../test/corpus/modern_javascript_constructs.txt)                                                                |
| `_expression` / `_new_constructor`         | `new Foo().bar`                      | Member continuation applies to the completed `new_expression`.        | [objects.txt](../test/corpus/objects.txt), [modern_javascript_constructs.txt](../test/corpus/modern_javascript_constructs.txt)                                                                |
| `array_pattern` / `array`                  | `const [a, b] = [1, 2]`              | The left bracket group is a pattern; the right is an array value.     | [modern_javascript_constructs.txt](../test/corpus/modern_javascript_constructs.txt), [base_expressions.txt](../test/corpus/base_expressions.txt)                                              |

Any future conflict must include parse evidence, the intended tree for each interpretation, and corpus regression tests. Precedence is preferred when it can resolve an ambiguity deterministically.

## Error recovery and stability

### Model and compatibility scope

Tree-sitter's standard error recovery applies; the grammar uses no custom external scanner and no error-specific rules. Comments are `extras`, so they may appear between any tokens and remain named `comment` nodes inside malformed regions.

Incomplete constructs surface as synthesized `MISSING` terminals; unexpected or unrecoverable input surfaces as `ERROR` nodes. Consumers should check `hasError` (or the equivalent binding API) before relying on a tree. Recovery is best effort, not part of the stable public-tree contract: valid source is the compatibility surface, while malformed-input trees may improve or change without a breaking release. See [syntax coverage compatibility](compatibility.md#syntax-coverage-compatibility) and the [breaking-change policy](compatibility.md#breaking-change-policy-for-cst-and-queries).

Two invariants guide grammar changes:

1. Valid source keeps its exact tree. Recovery improvements never justify weakening valid-code correctness.
2. Errors stay local where the generated parser permits. Named wrapper nodes (`arguments`, `call_expression`, `member_expression`, `array`, `object`, `block`) keep a recognizable parent around a missing child, and the precedence and GLR decisions above are not introduced solely for recovery.

Template literals expose only `${...}` substitutions as expression children; all other backtick content is opaque literal text. Tagged templates expose a `tag` expression and an opaque `template_string`. This limits how far an unfinished template can disrupt the surrounding tree.

### Terminology

- **Recoverable case:** the malformed region produces a `MISSING` terminal or a localized `ERROR`, and surrounding statements remain separate syntax nodes.
- **Known limitation:** the parse collapses to a root `ERROR`, or the malformed construct consumes following statements. These cases are recorded as regression fixtures, not as expected-good recovery.

### Recoverable categories

- **Unfinished calls and argument lists** — [incomplete_calls.txt](../test/corpus/incomplete_calls.txt), [incomplete_argument_lists.txt](../test/corpus/incomplete_argument_lists.txt). `const x = s(` keeps the declaration, `variable_declarator`, `call_expression`, and `arguments` with `MISSING ")"`. Trailing commas, doubled commas, and nested incomplete calls localize the malformed separator while preserving completed arguments.
- **Missing delimiters** — [missing_delimiters.txt](../test/corpus/missing_delimiters.txt). `[1, 2`, `(1 + 2`, `a[0`, `const x = {a: 1`, and `function f() { return 1` synthesize the closing token while preserving the array, parenthesized expression, computed member, object, or block. Object recovery is tested in declaration context because a bare `{a: 1` in statement position is a labeled block.
- **Incomplete expressions** — [incomplete_expressions.txt](../test/corpus/incomplete_expressions.txt). Missing binary and comparison operands, ternary alternatives, and member properties retain the expression node with a synthesized terminal.
- **Unfinished templates** — [unfinished_templates.txt](../test/corpus/unfinished_templates.txt). An untagged template ending with a newline, a template after a completed `${...}` substitution, and a tagged template each preserve the template or tagged-template node with ``MISSING "`"``.
- **Incomplete declarations** — [incomplete_declarations.txt](../test/corpus/incomplete_declarations.txt). `const x =`, `const [a, b] =`, and `const x = 1,` preserve the declaration kind and binding name while leaving the trailing `=` in a localized `ERROR`; `export default` synthesizes a missing value.
- **Incomplete arrows** — [incomplete_arrow_functions.txt](../test/corpus/incomplete_arrow_functions.txt). Missing bodies after single, parenthesized, empty, and destructured parameter lists, an incomplete expression body, and a missing block brace still produce `arrow_function` with `MISSING number` or `MISSING "}"`.
- **Malformed nested structures** — [malformed_nested_structures.txt](../test/corpus/malformed_nested_structures.txt), [malformed_expansions.txt](../test/corpus/malformed_expansions.txt). Missing brackets and braces inside calls or objects, doubled commas in arrays, objects, and parameters, and malformed ternary or subscript chains keep the outer node and localize the inner error.
- **Valid syntax around errors** — [valid_syntax_around_errors.txt](../test/corpus/valid_syntax_around_errors.txt), [noncascading_errors.txt](../test/corpus/noncascading_errors.txt). A stray token, missing comma, missing value, or invalid initializer produces one local error region while following declarations and calls still parse.

### Known limitations

- **Root-`ERROR` or localized `ERROR` limitations:** bare `!`, `function f()` without a body, `import { x } from` without a source, unterminated quoted strings (`"bd`, `s("bd`), an untagged template at exact EOF, an unfinished `${...}` substitution, and multiple missing delimiters (`f({a: 1`, `[{a: 1}, {b: 2`, `s("bd", note("c3"`). Some cases collapse the whole source to `ERROR`; `s("bd` and `f({a: 1` retain surrounding syntax beside a localized `ERROR`.
- **Cascading consumption:** an unfinished call, a missing initializer, or an incomplete arrow immediately before the next declaration keyword consumes that keyword. In `s("bd",` followed by `const a = 1`, `const` is parsed as an argument identifier and `a = 1` as an assignment expression. An unclosed quoted string consumes the rest of the file.
- These behaviors are locked in by [recovery_limitations.txt](../test/corpus/recovery_limitations.txt) (15 cases). They document current behavior; they are not expected-good recovery and are not supported syntax.

### Relationship to incremental parsing

Incremental/fresh equivalence is a tree-identity guarantee, not a recovery-quality guarantee: a malformed intermediate step passes when both parses produce the same tree, however poor that tree is. See the [incremental equivalence procedure](incremental-equivalence-procedure.md). Recorded sequences include repairs with `MISSING ")"`, a missing object brace, and an unterminated string; `make test-incremental` compares incremental and fresh trees at every step. Recovery changes must therefore be revalidated with the incremental harness.

### Validation and change policy

- `make test` runs the full corpus, including all recovery cases (157 cases at the time of writing). `make test-recovery` reruns 13 corpus files matched by `RECOVERY_FILES`, including `valid_syntax_expansions.txt`, as a local subset (86 cases). `make verify` and `make ci` run the full corpus and the incremental harness; Node.js binding recovery assertions also run through `make test-node`.
- Every discovered recovery bug or weakness gets a permanent corpus case. Expected trees containing `ERROR` or `MISSING` may need to be derived from parse probes because `tree-sitter test --update` refuses to auto-accept them.
- Never promote a root-`ERROR` collapse into an expected-good tree; add it to the limitation fixture instead.
- After any grammar change, regenerate with the pinned CLI, review `src/node-types.json`, run corpus and incremental tests, and update this section when recovery behavior changes.

## Verification

After every grammar change:

1. regenerate with the pinned Tree-sitter CLI (`0.27.2`);
2. review the `src/node-types.json` diff;
3. run corpus tests;
4. compile and execute both official queries;
5. parse representative fixture files;
6. update this document when public tree behavior changes.

Phase 3 verification results are recorded in [roadmap.md](roadmap.md).
