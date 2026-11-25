# Phase 3 syntax coverage matrix

This matrix compares the current grammar with the significant syntax requirements established by [syntax-evidence.md](syntax-evidence.md). Evidence IDs (`D`, `S`, `E`, and `C`) resolve to exact snippets and source URLs in that document. The audit reflects [`grammar.js`](../grammar.js), [`src/node-types.json`](../src/node-types.json), committed corpus tests, and temporary parse probes at commit `2d9b706`.

Statuses:

- **Implemented**: the grammar rule produces the expected structure.
- **Missing**: there is no dedicated grammar support; probes failed or produced unrelated nodes.
- **Intentionally opaque/excluded**: the syntax is accepted only as literal content, or its meaning is deliberately outside this grammar.

| ID | Requirement | Evidence | Status | Grammar and corpus audit | Next action |
| --- | --- | --- | --- | --- | --- |
| M01 | `var`, `let`, and `const` declarations | D03, D24, D32, C02, C04 | Implemented | `variable_declaration` and `lexical_declaration`; corpus: `variable_var.txt`, `declarations.txt`, `arrow_funcs.txt` | No grammar change. |
| M02 | Labeled pattern assignments (`$:`, `_$:`, custom labels, `S$:`) | D07, D12, D18, D25, S02, S13, S14 | Implemented | `assignment`; corpus: `array_literal.txt`, `objects_args.txt` | No grammar change. |
| M03 | JavaScript assignment statements (`bpm=60`) | C03 | Missing | Probe errors; `=` is only accepted in `variable_declarator` initializers. | Add assignment expression statements. |
| M04 | Semicolon-terminated expression statements | D07, D24, D25, E04, E09, S08 | Missing | Probe `s("bd");` errors. Declaration statements allow an optional `;`, but expressions do not. | Allow optional semicolons after expression statements. |
| M05 | Direct calls, nested calls, and argument lists | D01, D06, E17, S10 | Implemented | `function_call` and `commaSepTrailing`; corpus: `function_call.txt`, `number_args.txt`, `array_literal.txt` | No grammar change. |
| M06 | Method-call chains | D01, D04, D16, S10 | Implemented | `chained_method` and `method_call`; corpus: `function_call_chained.txt`, `objects_args.txt`, `arrow_funcs.txt` | No grammar change. |
| M07 | Plain member expressions (`mouse.x`) | C03, E17 | Missing | Probe errors. `.name(...)` is supported as `method_call`, but property access without a call is not. | Add member expressions separately from method calls. |
| M08 | Computed member access (`a.fft[0]`) | D21 | Missing | Probe errors; tokens are parsed as unrelated sibling expressions. | Add computed member expressions. |
| M09 | Single-parameter expression-bodied arrows | D03, D13, D14, D15, S13 | Implemented | `arrow_function`; corpus: `arrow_funcs.txt` | No grammar change. |
| M10 | Zero-parameter arrows | C03, D21, S09 | Missing | Probe `() => 1` errors. | Extend arrow parameters. |
| M11 | Multiple-parameter arrows | D17, E03, E07, E08 | Missing | Probe `(x,i) => ...` errors. | Extend arrow parameters. |
| M12 | Block-bodied arrows with `return` | S09 | Missing | Probe `() => { return 1 }` errors. | Add block bodies and return statements. |
| M13 | Destructured arrow parameters | C07 | Missing | Probe `([n, f]) => ...` errors. | Add destructuring patterns to arrow parameters. |
| M14 | Named `function` declarations with default parameters | C06 | Missing | Probe `function f(a=1) { ... }` errors. | Add function declarations, formal parameters, and block statements. |
| M15 | Arrays and nested arrays | D18, D19, E06 | Implemented | `array`; corpus: `array_literal.txt`, `base_expressions.txt` | No grammar change. |
| M16 | Object literals with key/value properties | D22, D23, D26, D29, D30, E02, E11 | Implemented | `object` and `pair`; corpus: `objects_args.txt`, `base_expressions.txt`. Quoted keys are probe-confirmed but have no dedicated corpus case. | Add a quoted-key corpus case. |
| M17 | Object shorthand properties | AGENTS.md requirement; no active evidence | Missing | Probe `{a}` errors. | Leave missing until active evidence is recorded. |
| M18 | Destructuring declarations | S18 is commented out; C07 actively uses an array destructuring pattern | Missing | Probes for `const {a} = b`, `const [a] = b`, and destructured arrows error. | Add patterns only for the evidenced arrow-parameter form first. |
| M19 | Object spread | C07; E18 is inactive | Missing | Probe `({...doh})` errors. | Add object spread and a dedicated corpus case. |
| M20 | Rest parameters and spread arguments | No active evidence | Missing | Probe `s(...xs)` errors. | Leave missing until active evidence is recorded. |
| M21 | Arithmetic `+`, `-`, `*`, `/` with precedence | D08, D13, E03, E07, C04, S11 | Implemented | `additive_expression` and `multiplicative_expression`; corpus: `number_args.txt`, `precedence.txt` | No grammar change. |
| M22 | Comparison expressions (`>`) | S11 | Missing | Probe `a > b` errors. | Add comparison operators. |
| M23 | Logical expressions (`&&`, `||`) | E18 is inactive; no active evidence | Missing | Probe `a && b` errors. | Leave missing until active evidence is recorded. |
| M24 | Unary expressions (`-`, `!`) | E15 | Missing | Probe `-a` errors. Binary `-` is implemented, but unary minus is not. | Add unary expressions. |
| M25 | Conditional/ternary expressions | S11 | Missing | Probe `a ? b : c` errors. | Add ternary expressions. |
| M26 | Optional chaining | S17 | Missing | Probe `a?.b` errors. The runtime unwraps `ChainExpression`, but the grammar has no member-expression base for it. | Add optional chaining with member expressions. |
| M27 | Nullish coalescing | No active evidence | Missing | Probe `a ?? b` errors. | Leave missing until active evidence is recorded. |
| M28 | Template literals as opaque strings | D09, D32, S07 | Implemented | Backtick branch of `string`; corpus: `base_expressions.txt` | No grammar change. |
| M29 | Template interpolation (`${...}`) | S11 | Missing | Probe <code>x${y}</code> in a backtick string is error-free but the whole text is one opaque `string`; no expression child is exposed. | Parse interpolation expressions while keeping literal content opaque. |
| M30 | Single-quoted and double-quoted strings | D01, D05, D23 | Implemented | `string`; corpus: `base_expressions.txt`, `function_call_chained.txt` | No grammar change. |
| M31 | Line comments | D02, D20, E12, S12 | Implemented | `comment` is an `extra`; no dedicated corpus case. | Add a dedicated line-comment corpus case. |
| M32 | Block comments | D20, S12 | Missing | Probe `/* block */` errors. | Add block comments. |
| M33 | Parenthesized expressions | D06, D21 | Implemented | Anonymous `seq('(', $.expression, ')')`; probe-confirmed, no dedicated corpus case and no dedicated node. | Add a dedicated corpus case. |
| M34 | Named imports | D31 | Missing | Probe `import { x } from 'y'` errors; no import node exists. | Add relevant import declarations. |
| M35 | `export const` declarations | D32 | Missing | Probe is error-free only because `export` is parsed as an `identifier`; no export node exists. | Add relevant export declarations. |
| M36 | `export default` declarations | C01 | Missing | Probe is error-free only because `export` and `default` are separate identifiers; no export node exists. | Add `export default`. |
| M37 | Default imports | No active evidence | Missing | No active evidence and no import grammar. | Leave missing until active evidence is recorded. |
| M38 | Top-level `await` | D21, E10, S01, S08 | Missing | Probe is error-free only because `await` is an `identifier`; no `await` expression exists. | Add `await` expressions. |
| M39 | `new` expressions | E05 | Missing | `new Foo()` is error-free only as two sibling expressions; `new` has no dedicated node. A longer real-world chain probe errors. | Add `new` expressions. |
| M40 | Tagged template literals | D33, E10, S07, S15, S16 | Missing | Probe parses `loadCsound` and the template as separate expressions; no tagged-template relationship exists. | Add tagged templates with opaque bodies. |
| M41 | Hexadecimal number literals | D27 | Missing | Probe `0x43` errors. | Extend the number token. |
| M42 | `try` / `catch` statements | C05 | Missing | Probe errors. | Add try/catch statements if they remain relevant to user-authored compositions. |
| M43 | Mini-notation string content | D05, D09, S12 | Intentionally opaque/excluded | Ordinary `string` nodes expose no mini-notation structure. | Preserve opacity; add no mini-notation grammar rules. |
| M44 | Strudel API names and runtime conventions | S04, S05, S17 | Intentionally excluded | The grammar contains no Strudel API function names and assigns no runtime meaning to labels or calls. | Preserve separation; keep semantic handling downstream. |
| M45 | Kabelsalat, registered-language, and tagged-DSL bodies | S16, D33, E10 | Intentionally opaque/excluded | Bodies stay inside string/template content; only the surrounding JavaScript shape is in scope. | Keep bodies opaque while adding the surrounding JavaScript forms where evidenced. |

## Audit notes

- The audit used `node_modules/.bin/tree-sitter parse` with CLI `0.27.2` against 43 temporary probes under `/tmp/opencode/coverage-probes`. No probe was added to the repository and no grammar file was changed.
- Error-free probes were checked with `--cst` before classification. `await`, `new`, `export const`, `export default`, and tagged templates are error-free but structurally wrong, so they are **Missing**, not **Implemented**.
- `src/node-types.json` still reports 20 named nodes and 7 fields; this matrix introduces no public CST change.
- Rows marked **Partial** in the Phase 1 inventory have been split into the specific evidenced forms above so implementation decisions can be made per construct.

## Intentionally deferred

- `%`, `**`, bitwise operators, loops, classes, and broader ECMAScript syntax are not in the current evidence set and are not proposed for this phase.
- Default imports, default exports of ordinary values, rest parameters, nullish coalescing, shorthand properties, and active logical expressions have no active evidence. They remain missing until a source establishes them.
