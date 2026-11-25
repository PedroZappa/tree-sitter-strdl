# Locals audit

This document records the Phase 5 audit of [`queries/locals.scm`](../queries/locals.scm) against the public syntax-tree API in [`src/node-types.json`](../src/node-types.json) and the syntax defined by [`grammar.js`](../grammar.js). It owns the roadmap item “Audit `locals.scm` scopes, definitions, and references.”

The audit covers structural validity, scope coverage, definition patterns, and reference patterns. Query changes are intentionally deferred to the following roadmap items and to the deferred-work notes in [roadmap.md](roadmap.md).

## Method

1. Enumerated every top-level pattern in `locals.scm` and checked its node types and field names against `src/node-types.json`.
2. Compiled and executed the query:

   ```sh
   node_modules/.bin/tree-sitter query queries/locals.scm \
     test.strdl test-local.strdl test/query/determinism.strdl
   make test-query
   ```

3. Inspected representative capture output for declaration names, function calls, object keys, import specifiers, parameters, and scopes.
4. Parsed `test/query/determinism.strdl` to confirm that the fixture used for query execution contains no `ERROR` or `MISSING` nodes.

## Pattern inventory

| Index | Pattern | Capture |
| ---: | --- | --- |
| 0 | `source_file`, `block`, `arrow_function`, `function_declaration` | `@local.scope` |
| 1 | `variable_declarator` `name` identifier | `@local.definition.var` |
| 2 | `assignment_expression` `left` identifier | `@local.definition.var` |
| 3 | `function_declaration` `name` identifier | `@local.definition.function` |
| 4 | `formal_parameters` `parameter` identifier | `@local.definition.parameter` |
| 5 | `array_pattern` `element` identifier | `@local.definition.parameter` |
| 6 | `assignment_pattern` `left` identifier | `@local.definition.parameter` |
| 7 | `arrow_function` `parameters` identifier | `@local.definition.parameter` |
| 8 | `import_specifier` `name` identifier | `@local.definition.var` |
| 9 | `try_statement` `parameter` identifier | `@local.definition.parameter` |
| 10 | `pair` `key` identifier | `@local.definition.property` |
| 11 | any `identifier` | `@local.reference` |

All referenced node types and fields exist in the current CST. The query compiles and executes.

## Fixture execution evidence

Across `test.strdl`, `test-local.strdl`, and `test/query/determinism.strdl`, the query produced:

| Capture | Matches |
| --- | ---: |
| `local.reference` | 258 |
| `local.definition.var` | 24 |
| `local.definition.property` | 20 |
| `local.scope` | 10 |
| `local.definition.parameter` | 7 |
| `local.definition.function` | 1 |

## Findings

### 1. Structural alignment is correct

Every node type and field referenced by `locals.scm` exists in `src/node-types.json`. There are no stale field names from the Phase 3 CST refactor.

### 2. Scope coverage is incomplete for catch parameters

`source_file`, `block`, `arrow_function`, and `function_declaration` are marked as scopes. A `try_statement` can introduce a catch parameter through its `parameter` field, but `try_statement` is not marked as `@local.scope`. As written, the catch parameter belongs to the nearest enclosing captured scope.

The function declaration name is also defined inside the function's own scope. Whether that should instead belong to the parent scope is a locals semantics decision, not a structural query error.

### 3. Variable and parameter definitions are mostly contextual

Definitions are captured for variable declarators, assignment targets, named functions, formal parameters, array-pattern elements, assignment-pattern defaults, single-identifier arrow parameters, import names, and catch parameters.

Two gaps were found:

- `import { name as alias }` defines the local binding `alias`, but only `name` is captured as `@local.definition.var`. In the fixtures, `alias` appears only as `local.reference`.
- `array_pattern.element` accepts both `identifier` and nested `array_pattern`. Only direct identifier elements are captured, so nested array-pattern bindings are missed.

### 4. Function call identifiers are not definitions

No definition pattern matches `call_expression`. Call identifiers such as `setCps`, `slider`, `note`, `stack`, and `s` appear only as `local.reference` from the blanket identifier rule. This satisfies the roadmap check that function call identifiers are not incorrectly treated as definitions, although the blanket reference rule is still broad.

### 5. Object keys are currently definitions

The pattern `(pair key: (identifier) @local.definition.property)` captures object literal keys as definitions. Fixture output shows keys such as `edo`, `hapRadius`, `key`, and `source` receiving both `local.definition.property` and `local.reference`. This is a semantic concern because an object property name does not introduce a lexical local binding. It is left to the next roadmap item for an explicit decision and fix.

### 6. The blanket reference rule is over-inclusive

`(identifier) @local.reference` captures every identifier, including declaration names, parameter definitions, object keys, member properties, call callees, labels, and import names or aliases. Definitions and references on the same node may be acceptable under Tree-sitter locals conventions, but the current rule makes reference captures unusable as evidence of an actual read. Any narrowing must preserve references in expression positions without turning syntax-only names into local bindings.

## Decision

No `locals.scm` or grammar change was made for the audit item. The query is structurally aligned with the current CST, but its locals semantics need explicit follow-up.

The next roadmap items should address function-call identifiers and object keys. Import aliases, nested array-pattern bindings, catch scope, and the blanket reference rule are recorded as deferred work in [roadmap.md](roadmap.md).

## Verification log

- Enumerated all 12 top-level `locals.scm` patterns and checked their node types and fields against `src/node-types.json`.
- `node_modules/.bin/tree-sitter query queries/locals.scm test.strdl test-local.strdl test/query/determinism.strdl` — compiled and executed successfully.
- `make test-query` — passed.
- `node_modules/.bin/tree-sitter parse test/query/determinism.strdl` — no `ERROR` or `MISSING` nodes.
- Capture output inspection — confirmed call identifiers are reference-only and object keys receive both definition and reference captures.
