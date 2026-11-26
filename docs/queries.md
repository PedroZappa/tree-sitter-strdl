# Queries

This document is the entry point for the official query surface of `tree-sitter-strdl`. The query files themselves are the source of truth; the documents linked here describe their public capture APIs, audits, and registration.

## Official inventory

| Query                                                 | Purpose                                     | Registration key | Binding constant   | Capture reference                           |
| ----------------------------------------------------- | ------------------------------------------- | ---------------- | ------------------ | ------------------------------------------- |
| [`queries/highlights.scm`](../queries/highlights.scm) | Syntax highlighting                         | `highlights`     | `HIGHLIGHTS_QUERY` | [Highlight captures](highlight-captures.md) |
| [`queries/locals.scm`](../queries/locals.scm)         | Lexical scopes, definitions, and references | `locals`         | `LOCALS_QUERY`     | [Locals captures](locals-captures.md)       |

There is no `queries/injections.scm` or `queries/tags.scm`. The `injection-regex: "^strudel$"` declaration in [`tree-sitter.json`](../tree-sitter.json) allows a host language to identify Strudel as an injected language; it does not imply that this grammar embeds another language. See [injection evaluation](injections-evaluation.md) for the evidence and decision.

## Capture conventions

- Highlight captures describe syntactic roles in the public concrete syntax tree. They follow Tree-sitter highlight naming conventions and do not identify Strudel API functions or infer runtime meaning.
- A source range receives at most one capture from `highlights.scm`. Nested captures on different nodes are allowed, and consumers that highlight by byte range must apply their own priority policy.
- Locals captures use Tree-sitter's fixed `local.*` names for scopes, definitions, and references. A definition and a reference may legitimately overlap on the same identifier because the reference rule is deliberately broad.
- Mini-notation, kabelsalat payloads, and tagged-template bodies remain opaque literal or template content. No query parses their contents or assigns semantic meaning.
- Queries must not depend on editor-specific concepts or hardcode Strudel API names.

The full capture inventories and stability notes are in [highlight captures](highlight-captures.md) and [locals captures](locals-captures.md).

## Registration and distribution

Both official queries are registered in [`tree-sitter.json`](../tree-sitter.json) and in the legacy `tree-sitter` metadata in [`package.json`](../package.json). Python and Rust bindings export `HIGHLIGHTS_QUERY` and `LOCALS_QUERY`. Packaging rules include the `queries/` directory rather than listing individual files, so both official queries are distributed together.

`scripts/check_query_registration.py` enforces this inventory across registration metadata, packaging rules, and binding exports. See the [registration section](query-audit.md#registration-packaging-and-binding-exports) of the query audit for verification evidence.

## Running queries

From the repository root, the pinned CLI compiles and executes a query with:

```sh
node_modules/.bin/tree-sitter query queries/highlights.scm test.strdl
node_modules/.bin/tree-sitter query queries/locals.scm test.strdl
```

Do not use the probe queries under `test/query/` as official captures. They exist only to select syntactic roles for automated assertions.

## Testing and verification

`make test-query` runs every query layer:

| Target                         | Responsibility                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `make test-query-compile`      | Compile official queries and reject invalid node and field names.                                                                   |
| `make test-query-execution`    | Assert every official capture name on grammar-derived roles in representative fixtures and reject a wrong-capture negative control. |
| `make test-query-registration` | Verify metadata, packaging rules, and binding exports.                                                                              |
| `make test-query`              | Run the three targets above, then execute and check determinism and locals invariants.                                              |

See [CI](ci.md) for where these targets run and [query audit](query-audit.md) for structural evidence. Known locals semantics gaps are recorded in [locals audit](locals-audit.md) and [locals captures](locals-captures.md).

## Compatibility and stability

A query file is part of this package's public API. Renaming a capture, changing its syntactic meaning, removing a registration, or introducing Strudel API-name-specific captures is a breaking query API change and must be documented in the relevant capture reference and the roadmap. Query changes must remain aligned with the public CST documented in [grammar architecture](grammar-architecture.md).
