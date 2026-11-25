# Locals captures

This document is the authoritative reference for capture names emitted by [`queries/locals.scm`](../queries/locals.scm). It owns the public locals query API. [Locals audit](locals-audit.md) records the structural audit and verification evidence behind it.

The query describes lexical syntax only. It does not resolve symbols, infer types, or identify Strudel runtime behavior. Mini-notation strings and other opaque literal bodies receive no locals semantics.

## Capture names

| Capture | Meaning | Captured nodes |
| --- | --- | --- |
| `@local.scope` | Node that introduces a lexical scope. | `(source_file)`, `(block)`, `(arrow_function)`, `(function_declaration)`. |
| `@local.definition.var` | Identifier that binds a variable. | `name` of `(variable_declarator)`, `left` identifier of `(assignment_expression)`, and `name` of `(import_specifier)`. |
| `@local.definition.function` | Name bound by a named function declaration. | `name` identifier of `(function_declaration)`. |
| `@local.definition.parameter` | Identifier that binds a function, pattern, or catch parameter. | `parameter` of `(formal_parameters)`, direct `element` of `(array_pattern)`, `left` of `(assignment_pattern)`, `parameters` identifier of `(arrow_function)`, and `parameter` of `(try_statement)`. |
| `@local.reference` | Identifier in a reference position under the current broad rule. | Every `(identifier)` node. |

The query currently has 11 top-level patterns. Every node type and field it references exists in the public CST documented by [`src/node-types.json`](../src/node-types.json).

## Overlap and determinism

Locals captures intentionally differ from highlight captures. An identifier can receive both a `@local.definition.*` capture and `@local.reference` because the blanket reference rule selects every identifier. This overlap is expected and is not checked by the highlight determinism rule.

`@local.reference` must not be read as proof of an actual variable read. It is a broad syntactic selection and currently includes declaration names, parameters, object keys, member properties, call callees, labels, and import names. A consumer that needs resolved references must perform its own semantic analysis; this grammar intentionally does not provide that layer.

## Intentional exclusions

- Function call identifiers are references only. `scripts/check_locals_definitions_absent.py` uses [`test/query/call_identifiers.scm`](../test/query/call_identifiers.scm) to enforce that no call callee receives a `local.definition.*` capture.
- Object keys are not variable definitions. `scripts/check_locals_definitions_absent.py` uses [`test/query/object_keys.scm`](../test/query/object_keys.scm) to enforce that identifier, string, number, and computed keys receive no `local.definition.*` capture. Object keys may still receive `@local.reference` from the blanket rule.
- `@local.definition.property` was removed because an object property name does not introduce a lexical binding. Reintroducing it is a breaking locals query API change.
- No Strudel API names are encoded in locals patterns. `setCps`, `note`, `s`, and similar identifiers are ordinary syntax.

## Known limitations

The following are current query limitations, not documented behavior to rely on as complete semantics:

- Import aliases are not captured as definitions; `import { name as alias }` defines `alias`, but only `name` receives `@local.definition.var`.
- Nested array-pattern bindings are not captured because only direct identifier elements match.
- A `try_statement` is not marked as a scope, so its catch parameter belongs to the nearest enclosing captured scope.
- A function declaration name is captured inside the function's own scope.
- The blanket reference rule is over-inclusive.

See [locals audit](locals-audit.md) for evidence and [roadmap](roadmap.md) for deferred-work status. Any future narrowing of these patterns must update this reference in the same change.

## Verification

- `make test-query` compiles and executes `locals.scm`, checks that call identifiers and object keys receive no definition captures, and runs the automated execution assertions.
- `make test-query-registration` verifies that `locals.scm` is registered and exported as `LOCALS_QUERY`.
- Rename, removal, or meaning changes to the captures above are breaking query API changes.
