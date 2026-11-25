# Grammar architecture

This document records the Phase 3 structured grammar refactor. [grammar.js](../grammar.js) remains the authoritative grammar definition; generated files under `src/` are build artifacts. The node and field names described here are the public syntax-tree API as of the Phase 3 refactor on branch `phase/3-language-coverage`.

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
- Renaming a named node, field, or changing whether a rule is hidden is a public syntax-tree API change and requires a deliberate versioned decision.

## Public syntax-tree API

[src/node-types.json](../src/node-types.json) contains 40 named node types and 31 field names. Fields are recorded on the node types below; `?` marks an optional field.

| Area | Named nodes |
| --- | --- |
| Root and statements | `source_file`, `block`, `expression_statement`, `labeled_statement`, `return_statement`, `try_statement`, `comment` |
| Declarations and parameters | `variable_declaration`, `variable_declarator`, `function_declaration`, `formal_parameters`, `import_declaration`, `named_imports`, `import_specifier`, `export_declaration`, `array_pattern`, `assignment_pattern` |
| Calls and access | `call_expression`, `arguments`, `member_expression`, `subscript_expression`, `new_expression`, `tagged_template_expression` |
| Operators and control flow | `assignment_expression`, `binary_expression`, `unary_expression`, `await_expression`, `conditional_expression`, `arrow_function` |
| Values and containers | `object`, `pair`, `computed_property_name`, `spread_element`, `array`, `string`, `template_string`, `template_substitution`, `number`, `identifier`, `parenthesized_expression` |

### Fields

| Node | Fields |
| --- | --- |
| `arguments` | `argument?` |
| `array` | `element?` |
| `array_pattern` | `element?` |
| `arrow_function` | `parameters`, `body` |
| `assignment_expression` | `left`, `right` |
| `assignment_pattern` | `left`, `right` |
| `await_expression` | `argument` |
| `binary_expression` | `left`, `operator`, `right` |
| `call_expression` | `function`, `arguments` |
| `computed_property_name` | `expression` |
| `conditional_expression` | `condition`, `consequence`, `alternative` |
| `export_declaration` | `declaration?`, `value?` |
| `formal_parameters` | `parameter?` |
| `function_declaration` | `name`, `parameters`, `body` |
| `import_declaration` | `specifiers`, `source` |
| `import_specifier` | `name`, `alias?` |
| `labeled_statement` | `label`, `body` |
| `member_expression` | `object`, `property` |
| `new_expression` | `constructor`, `arguments?` |
| `pair` | `key`, `value` |
| `parenthesized_expression` | `expression` |
| `return_statement` | `value?` |
| `spread_element` | `value` |
| `subscript_expression` | `object`, `index` |
| `tagged_template_expression` | `tag`, `template` |
| `template_substitution` | `expression` |
| `try_statement` | `body`, `parameter?`, `handler` |
| `unary_expression` | `operator`, `argument` |
| `variable_declaration` | `kind`, `declarator` |
| `variable_declarator` | `name`, `value?` |

### API changes from the Phase 2 baseline

| Phase 2 | Phase 3 | Reason |
| --- | --- | --- |
| `expression` wrapper | Removed; expression nodes are direct children | The wrapper obscured call, member, and operator structure. |
| `assignment` | `labeled_statement` for `label:`; `assignment_expression` for `x = y` | The two forms have different syntax and behavior. |
| `lexical_declaration` | Folded into `variable_declaration` with a `kind` field | `var`, `let`, and `const` share one declaration structure. |
| `additive_expression`, `multiplicative_expression` | `binary_expression` with an `operator` field | one node type supports all binary operators and precedence levels. |
| `function_call` | `call_expression` with `function` and `arguments` fields | Aligns with standard JavaScript grammar conventions. |
| `chained_method`, `method_call` | Nested `call_expression` and `member_expression` | Chains now expose receiver and callee relationships explicitly. |
| `arrow_function.parameter` | `arrow_function.parameters` | Supports zero, one, multiple, and destructured parameters. |
| No parenthesized node | `parenthesized_expression` | Preserves grouping explicitly. |
| Opaque backtick strings | `template_string` with `template_substitution` | Exposes interpolation expressions while leaving literal text opaque. |

Consumers should treat this as a breaking CST API change and update queries or normalization logic accordingly.

## Statement and expression hierarchy

`source_file` contains zero or more statements. The hidden `_statement` rule is the union of:

- declarations (`variable_declaration`, `function_declaration`, `import_declaration`, `export_declaration`);
- `labeled_statement`;
- `return_statement`;
- `try_statement`;
- `expression_statement`;
- `block`.

The hidden `_expression` rule is the union of assignment, conditional, binary, unary, `await`, `new`, arrow, tagged template, call, member, subscript, and primary expressions. Left-recursive call/member/tagged-template forms are resolved by named precedence levels.

Primary expressions are `identifier`, `string`, `number`, `template_string`, `object`, `array`, and `parenthesized_expression`. Mini-notation remains ordinary `string` content; template and tagged-template bodies remain opaque except for `${...}` interpolation expressions.

Binding patterns are `identifier` and `array_pattern`. Formal parameters additionally accept `assignment_pattern` for defaults. Object destructuring is not yet implemented.

## Precedence and associativity

Named precedence levels are declared from lowest to highest:

```text
assignment < ternary < comparison < additive < multiplicative
           < unary < new < call < member
```

| Rule | Declaration | Effect |
| --- | --- | --- |
| `assignment_expression` | `prec.right("assignment", ...)` | Right-associative assignment at the lowest named level. |
| `conditional_expression` | `prec.right("ternary", ...)` | Right-associative ternary. |
| `binary_expression` alternatives | `prec.left(level, ...)` | Left-associative operators at their named levels. |
| `unary_expression`, `await_expression` | `prec("unary", ...)` | Bind tighter than binary operators. |
| `new_expression` | `prec.right("new", ...)` | Supports `new new Foo()` and argument-list continuation. |
| `call_expression`, `tagged_template_expression` | `prec("call", ...)` | Bind tighter than `new` and unary forms. |
| `member_expression`, `subscript_expression` | `prec("member", ...)` | Bind tightest, including optional chaining. |
| `expression_statement`, `return_statement`, `variable_declarator`, `export default`, `_arrow_body` | `prec.right(-1, ...)` | Prefer postfix continuation (calls and members) over reducing a surrounding statement or body. |
| `block` | `prec(1, ...)` | Prefers block interpretation over empty object literal in statement position. |

Verified precedence behavior is covered in [test/corpus/precedence.txt](../test/corpus/precedence.txt) and new operator tests in [test/corpus/operators.txt](../test/corpus/operators.txt).

## Conflict policy

Seven GLR conflicts are declared in `grammar.js`:

- `labeled_statement` / `_property_name`: `identifier :` inside braces can be a label or an object pair key.
- `_binding_pattern` / `_primary_expression`: identifiers and arrays in parameter positions.
- `_binding_pattern` / `_assignment_target`: defaults can be binding patterns or assignment targets.
- `_expression` / `_unary_expression`: unary operands may continue as calls and members.
- `_new_constructor` / `_primary_expression`, `_expression` / `_new_constructor`: constructor position overlaps expression position.
- `array_pattern` / `array`: bracketed identifiers may be patterns or array literals.

These conflicts are deliberate. They preserve a composable grammar without duplicating rules for each context. Each conflict was introduced only after Tree-sitter reported an unresolved reduce/shift ambiguity that precedence alone could not resolve. Any future conflict must include parse evidence, the intended tree for each interpretation, and corpus regression tests.

## Error recovery and stability

Tree-sitter's standard error recovery applies; no custom scanner is used. The grammar favors preserving valid syntax around malformed regions. `arguments`, `call_expression`, `member_expression`, and container nodes remain visible even when a child is missing. Comments are extras, so they may appear between any tokens and are also exposed as named nodes.

Template literals expose only `${...}` substitutions as expression children. All other backtick content is opaque literal text. Tagged templates expose a `tag` expression and an opaque `template_string`.

Phase 4 has begun with dedicated unfinished-call, unfinished-template, incomplete-argument-list, incomplete-arrow-function, incomplete-declaration, incomplete-expression, malformed-nested, missing-delimiter, valid-context, noncascading, and known-limitation cases in `test/corpus/incomplete_calls.txt`, `test/corpus/unfinished_templates.txt`, `test/corpus/incomplete_argument_lists.txt`, `test/corpus/incomplete_arrow_functions.txt`, `test/corpus/incomplete_declarations.txt`, `test/corpus/incomplete_expressions.txt`, `test/corpus/malformed_nested_structures.txt`, `test/corpus/missing_delimiters.txt`, `test/corpus/valid_syntax_around_errors.txt`, `test/corpus/noncascading_errors.txt`, and `test/corpus/recovery_limitations.txt`. Variable declarations with a missing initializer preserve the declaration kind and binding name but leave the trailing `=` in a localized `ERROR`. Recoverable forms are recorded as expected-good trees; forms that collapse to a root `ERROR` are recorded separately as known-limitation regressions rather than as expected-good recovery.

Five boundary cases confirm that valid declarations and calls on both sides of a localized error remain usable. Six noncascading cases show that an unexpected token between call arguments, a missing comma in an object or array, a missing object value, an invalid initializer, and a stray statement token each produce one local error region while following statements still parse. Fifteen known-limitation cases lock in current behavior for bare `!`, missing function and import bodies, unterminated strings, untagged templates at exact EOF, unfinished template substitutions, missing object and call delimiters, nested missing delimiters, and incomplete constructs that consume the next declaration keyword. An unfinished call, a missing initializer, or an incomplete arrow body can consume the following declaration keyword; an unclosed string can consume the rest of the file. Remaining incomplete-syntax categories and incremental-parsing regression tests are still pending.

## Verification

After every grammar change:

1. regenerate with the pinned Tree-sitter CLI (`0.27.2`);
2. review the `src/node-types.json` diff;
3. run corpus tests;
4. compile and execute both official queries;
5. parse representative fixture files;
6. update this document when public tree behavior changes.

Phase 3 verification results are recorded in [roadmap.md](roadmap.md).
