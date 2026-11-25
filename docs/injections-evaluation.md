# Injection evaluation

This document records the Phase 5 evaluation of whether `queries/injections.scm` is justified by actual Strudel syntax requirements. It owns the roadmap items “Evaluate whether `injections.scm` is justified by actual requirements” and “Add only justified injections; do not create an empty or speculative query file.”

**Decision:** do not add `injections.scm`. No current construct requires reparsing part of a Strudel source file with another language.

## Scope of an injection query

Tree-sitter language injection is for a parent syntax tree containing code written in another language. An injection query uses `@injection.content` to select re-parsed text and either `@injection.language` or an `injection.language` property to choose the parser. The official [syntax highlighting documentation](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html) defines this behavior and also states that `injection-regex` is tested against a language name to decide whether a grammar should be used at a potential injection site.

That distinction matters here:

- `tree-sitter.json` declares `"injection-regex": "^strudel$"`. This allows a host grammar to identify **Strudel as the injected language** by name.
- An `injections.scm` in this repository would instead identify **other languages embedded inside Strudel source** and ask a host to reparse those ranges.
- The first declaration does not create a requirement for the second query.

## Candidate review

| Candidate | Evidence | Current CST behavior | Decision | Rationale |
| --- | --- | --- | --- | --- |
| Mini-notation in strings | D05, D09, S11, S12 | Opaque `string` or `template_string` content | Rejected | Mini-notation semantics are explicitly outside this project. No maintained mini-notation parser is a declared dependency. |
| JavaScript inside `${...}` | S11 | `template_substitution` exposes the expression as ordinary syntax | Rejected | The expression is already parsed by this grammar. Injecting JavaScript would duplicate the CST and change the public syntax tree contract. |
| Tagged template DSL bodies | S07, S15, S16, D33, E10 | `tagged_template_expression` exposes `tag` and an opaque `template_string` | Rejected | Csound, tidal, mondo, and `mondolang` bodies are opaque by project policy. Selecting them by tag name would require semantic API knowledge and hardcoded Strudel names in a syntax query. |
| Kabelsalat call bodies | S17 | `K(...)` and `S(...)` are ordinary call expressions; arguments are ordinary expressions | Rejected | Kabelsalat has no separate embedded language syntax in the evidence. Its bodies remain opaque payload or ordinary JavaScript expressions. |
| Strudel source inside host-language template strings | C01, C02 | Not present in a Strudel source tree; present in JavaScript host files | Rejected for this repository | This is the reverse injection direction. A host grammar may use `injection-regex: "^strudel$"` to inject this parser; this grammar needs no local query. |
| Metadata and mini-notation directives in comments | D20, S12 | `comment` nodes | Rejected | Directives are runtime semantics over comment text, not an embedded language. Highlighting or downstream analysis is the appropriate layer. |

Evidence IDs refer to [syntax evidence](syntax-evidence.md). Only GSB v1 community evidence was considered; the other community passes were excluded as recorded in that document.

## Current query inventory

- [`queries/highlights.scm`](../queries/highlights.scm) — official highlight query.
- [`queries/locals.scm`](../queries/locals.scm) — official locals query.
- No `queries/injections.scm` exists.
- `tree-sitter.json` explicitly registers `queries/highlights.scm`. It does not register an injection query. The `injection-regex` metadata remains valid for host-side injection.

## Revisit conditions

Add an injection query only when all of the following are true:

1. Actual Strudel syntax evidence identifies a distinct embedded-language range.
2. A compatible, maintained parser exists for that embedded language.
3. The embedded range is not intentionally opaque under the project’s mini-notation, kabelsalat, or tagged-template policy.
4. The query can select the range syntactically without hardcoding Strudel API names.
5. The resulting capture names and behavior are added to the query documentation and tests.

Until then, creating an empty or speculative `injections.scm` would add an official query with no verifiable behavior.

## Verification log

- Reviewed all existing files under `queries/`; only `highlights.scm` and `locals.scm` are present.
- Checked `tree-sitter.json` and `package.json`: neither registers an injection query.
- Reviewed D05, D09, D20, D33, S07, S11, S12, S15, S16, S17, E10, C01, and C02 in [syntax evidence](syntax-evidence.md) plus the opacity decisions in [syntax coverage matrix](syntax-coverage-matrix.md).
- Confirmed against the official Tree-sitter documentation that `injection-regex` is a language-name match for potential injection sites, while `injections.scm` selects embedded content within the current grammar.
- `make test-query` — passed with the unchanged two-query inventory.
- No query file was created or modified for this evaluation.
