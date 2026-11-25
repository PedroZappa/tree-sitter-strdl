# Official Strudel syntax evidence

This document records syntax examples collected from official Strudel documentation and shipped source/runtime on 2026-11-25. It is the evidence base for the coverage matrix in Phase 3; it does not itself change the grammar.

## Sources and method

The authoritative documentation source is the Codeberg repository `uzu/strudel`, branch `main`, under `website/src/pages/`. Rendered pages at `strudel.cc` are generated from those MDX files. Package-level documentation under `packages/*/docs/` is included when it is imported into a documentation page.

Only code presented as user-written Strudel/JavaScript was collected:

- `MiniRepl` `tune={...}` values.
- Fenced `js`, `javascript`, or `strudel` code blocks.
- Example tunes in `website/src/examples.mjs`, which are the official "Show me some demos" fixtures.
- User-facing snippets in package READMEs.

MDX front matter, Astro imports, component props, and prose are documentation infrastructure and are **not** treated as Strudel user code. Mini-notation inside string literals is treated as opaque string content; the grammar must not infer structure from it.

## Collected examples

| ID | Constructs demonstrated | Example (excerpt; `...` and `<newline>` mark omitted text) | Official source |
| --- | --- | --- | --- |
| D01 | Call expression, chained member call, double-quoted string | `note("c a f e").s("piano")` | [`learn/code.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/code.mdx) · [rendered](https://strudel.cc/learn/code/) |
| D02 | Multiline chain, numeric literal, line comment | `note("a3 c#4 e4 a4")`<br>`.s("sawtooth")`<br>`.cutoff(500)`<br>`//.delay(0.5)`<br>`.room(0.5)` | [`learn/code.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/code.mdx) |
| D03 | `const` declaration, single-parameter arrow function, single-quoted string, chained calls | `const effectChain = register('effectChain', (pat) => pat`<br>`  .s("sawtooth")`<br>`  .cutoff(500)`<br>`  .room(0.5)`<br>`)`<br>`note("a3 c#4 e4 a4").effectChain()` | [`learn/code.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/code.mdx) |
| D04 | Generic chaining shape, three-call chain | `xxx("foo").yyy("bar")`<br>`a("this").b("that").c("other")` | [`learn/code.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/code.mdx) |
| D05 | String semantics: double quotes for mini-notation, single quotes for plain strings | `"c a f e"` and `'C minor'` | [`learn/code.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/code.mdx) |
| D06 | Nested calls, multiple arguments, parenthesized expressions, member access as argument | `iter(4, every(3, add.squeeze("10 20"), n("0 1 3").s("triangle").crush(4)))` | [`learn/strudel-vs-tidal.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/strudel-vs-tidal.mdx) · [rendered](https://strudel.cc/learn/strudel-vs-tidal/) |
| D07 | Labeled statements (`$:` and `_$:`), semicolon-terminated expression statement | `$: n("[0 .. 8]*8/9").scale("C:minor:pentatonic")`<br>`_$: s("bd*4").bank('RolandTR909')`<br>`note("c a f e").fast(.5625);` | [`learn/strudel-vs-tidal.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/strudel-vs-tidal.mdx) |
| D08 | Binary division in an argument, two statements | `setcpm(90/4)`<br>`sound("<bd hh rim hh>*8")` | [`workshop/first-sounds.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/first-sounds.mdx) · [rendered](https://strudel.cc/workshop/first-sounds/) |
| D09 | Template literal with embedded newlines, no interpolation | ``sound(`bd*2, - cp, <newline>- - - oh, hh*4, <newline>[- casio]*2`)`` | [`workshop/first-sounds.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/first-sounds.mdx) |
| D10 | Number literals including leading-dot decimals | `.attack(.1).decay(.1).sustain(.25).release(.2)` | [`workshop/first-effects.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/first-effects.mdx) · [rendered](https://strudel.cc/workshop/first-effects/) |
| D11 | Identifier argument and nested signal member call | `sound("hh*16").gain(sine)`<br>`sound("hh*16").lpf(saw.range(500, 2000))` | [`workshop/first-effects.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/first-effects.mdx) |
| D12 | Labeled statements, multiline chained calls | `$: note("[~ [<[d3,a3,f4]!2 [d3,bb3,g4]!2> ~]]*2")`<br>`  .sound("gm_electric_guitar_muted").delay(.5)` | [`workshop/first-effects.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/first-effects.mdx) |
| D13 | Single-parameter arrow callback, division expression, multiple arguments | `n("0 [4 <3 2>] <2 3> [~ 1]"`<br>`  .off(1/16, x=>x.add(4))`<br>`  //.off(1/8, x=>x.add(7))`<br>`)` | [`workshop/pattern-effects.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/pattern-effects.mdx) · [rendered](https://strudel.cc/workshop/pattern-effects/) |
| D14 | Nested arrow callbacks with distinct parameter names | `.off(2/16, x=>x.speed(1.5).gain(.25)`<br>`  .off(3/16, y=>y.vowel("<a e i o>*8")))` | [`workshop/pattern-effects.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/workshop/pattern-effects.mdx) |
| D15 | Multiple arrow callbacks as separate arguments | `.layer(`<br>`  x=>x.s("sawtooth").vib(4),`<br>`  x=>x.s("square").add(note(12))`<br>`)` | [`recipes/recipes.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/recipes/recipes.mdx) · [rendered](https://strudel.cc/recipes/recipes/) |
| D16 | Method call on a string literal, nested calls as arguments | `"0"`<br>`  .off(1/3, add(2))`<br>`  .off(1/2, add(4))`<br>`  .n()` | [`recipes/recipes.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/recipes/recipes.mdx) |
| D17 | Arrow callback with multiple arguments and nested arrow function | `all(x=>x.when("<0!7 1>", x=>x.lpf(saw.range(200, 2000))))` | [`learn/faq.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/faq.mdx) · [rendered](https://strudel.cc/learn/faq/) |
| D18 | `const` declarations, array literal of identifiers, labeled assignment-like statements | `const violins = [violin_p1, violin_p2, violin_p3, violin_p4]`<br>`cello$: "<~@2 0@18>".pick([cello])` | [`learn/faq.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/faq.mdx) |
| D19 | Nested array literals as call arguments | `cello$: arrange(`<br>`  [2, silence],`<br>`  [18,cello]<br>`)` | [`learn/faq.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/faq.mdx) |
| D20 | Line comments, block comments, metadata tags in comments | `// @title My Cool Song`<br>`/*`<br>`@title My Cool Song`<br>`@by John Doe`<br>`*/` | [`learn/metadata.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/metadata.mdx) · [rendered](https://strudel.cc/learn/metadata/) |
| D21 | Top-level `await`, `let` declaration, object literal, zero-parameter arrow function, computed member access, multiplication | `await initHydra({detectAudio:true})`<br>`let pattern = "<3 4 5 [6 7]*2>"`<br>`  .scrollY(`<br>`    ()=> a.fft[0]*.25`<br>`  )` | [`learn/hydra.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/hydra.mdx) · [rendered](https://strudel.cc/learn/hydra/) |
| D22 | Object literal with multiple properties as an argument | `all(x=>x.fft(4).scope({pos:0,smear:.95}))` | [`learn/hydra.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/hydra.mdx) |
| D23 | `const` declaration, array of single-quoted strings, object literal with string URL value | `const HADOUKEN = [`<br>`  'd',`<br>`  'r',`<br>`  'a',`<br>`]`<br>`samples({free_hadouken: 'https://cdn.freesound.org/previews/67/67674_111920-lq.mp3'})` | [`packages/gamepad/docs/gamepad.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/packages/gamepad/docs/gamepad.mdx) · [rendered](https://strudel.cc/learn/input-devices/) |
| D24 | Semicolon-separated `const` declarations | `const pad1 = gamepad(0);`<br>`const pad2 = gamepad(1);` | [`packages/gamepad/docs/gamepad.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/packages/gamepad/docs/gamepad.mdx) |
| D25 | Labeled statement and semicolon in device-motion example | `$_: accX.segment(16).log();` | [`packages/motion/docs/devicemotion.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/packages/motion/docs/devicemotion.mdx) · [rendered](https://strudel.cc/learn/devicemotion/) |
| D26 | Object literal with boolean and string properties | `note("d e c a f").midi('IAC Driver', { isController: true, midimap: 'default'})` | [`learn/input-output.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/input-output.mdx) · [rendered](https://strudel.cc/learn/input-output/) |
| D27 | Hexadecimal number literal, `let` declarations, `undefined` identifier arguments | `let id = 0x43;`<br>`let data = "0x79:0x09:0x11:0x0A:0x00:0x00";`<br>`"hello world".mqtt(undefined, undefined, '/strudel-pattern', ...)` | [`learn/input-output.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/input-output.mdx) |
| D28 | Array literal mixing number and call expression | `note("c a f e").control([74, sine.slow(4)]).midi()` | [`learn/input-output.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/input-output.mdx) |
| D29 | Object literal with array-valued property and trailing commas, multiple call arguments | `samples({`<br>`  bassdrum: 'bd/BT0AADA.wav',`<br>`  hihat: 'hh27/000_hh27closedhh.wav',`<br>`  snaredrum: ['sd/rytm-01-classic.wav', 'sd/rytm-00-hard.wav'],`<br>`}, 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/');` | [`learn/samples.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/samples.mdx) · [rendered](https://strudel.cc/learn/samples/) |
| D30 | Nested object literals, quoted property names | `samples({`<br>`  'moog': {`<br>`    'g2': 'moog/004_Mighty%20Moog%20G2.wav',`<br>`    'g3': 'moog/005_Mighty%20Moog%20G3.wav',`<br>`  }}, 'github:tidalcycles/dirt-samples')` | [`learn/samples.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/samples.mdx) |
| D31 | Named import declaration, arrow function as object property, nested call | `import { initStrudel } from '@strudel/web';`<br>`initStrudel({`<br>`  prebake: () => samples('github:tidalcycles/dirt-samples'),`<br>`});` | [`packages/web/README.md`](https://codeberg.org/uzu/strudel/src/branch/main/packages/web/README.md) |
| D32 | `export const` declaration, array of template literals, `let` declaration, single-parameter arrow callback | `export const examples = [`<br>``  `// "coastline" @by eddyflux ...`, ``<br>`];`<br>`let chords = chord("<Bbm9 Fm9>/4").dict('ireal')`<br>`.superimpose(x=>x.add(note(12)).delay(.5).bpf(1000))` | [`website/src/examples.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/examples.mjs) · [rendered demos](https://strudel.cc/workshop/getting-started/) |
| D33 | Tagged template literal with non-JavaScript body (Csound DSL) | ``await loadCsound` ... instr CoolSynth ... ` `` | [`learn/csound.mdx`](https://codeberg.org/uzu/strudel/src/branch/main/website/src/pages/learn/csound.mdx) · [rendered](https://strudel.cc/learn/csound/) |

## Source and runtime evidence

The examples above show what users write. The evidence below shows what the Strudel runtime actually accepts and transforms. It comes from shipped source and tests in `packages/transpiler` and `packages/core`, fetched from Codeberg `main` on 2026-11-25. These are facts about the runtime contract; they do not imply that the grammar reproduces Strudel semantics.

### Parser and evaluation contract

| ID | Evidence (verbatim excerpt) | Significance | Source |
| --- | --- | --- | --- |
| S01 | `parse(input, { ecmaVersion: 2022, allowAwaitOutsideFunction: true, locations: true, onComment: comments })` | User code is parsed by Acorn at ECMAScript 2022, with top-level `await` explicitly allowed. This is the strongest primary-source bound on the target syntax level. | [`packages/transpiler/transpiler.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/transpiler.mjs) |
| S02 | `// converts label expressions to p calls: "x: y" to "y.p('x')"` with `isLabelStatement(node) { return node.type === 'LabeledStatement'; }` | Labeled statements are user syntax that the runtime rewrites; they are not merely editable decoration. | [`packages/transpiler/transpiler.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/transpiler.mjs) |
| S03 | `` str = `{${str}}` ``, `` `(async ()=>${str})()` ``, and `"use strict";return (${str})` | User code is evaluated as a block inside a strict async function. Declarations, assignments, and `await` are legitimate top-level forms. | [`packages/core/evaluate.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/core/evaluate.mjs) |
| S04 | `const nonInlineWidgets = ['punchcard', 'spiral', 'scope', 'pitchwheel', 'spectrum', 'pianoroll', 'wordfall']` | Visualizer calls are recognized by method name on a member expression. | [`packages/transpiler/transpiler.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/transpiler.mjs) |
| S05 | `sliderWithID(id, value, min?, max?)`; `node.arguments[1]?.value`, `node.arguments[2]?.value`, `node.arguments[3]?.value` | A `slider(...)` call with one to four arguments is a recognized syntax shape. | [`packages/transpiler/plugin-widgets.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/plugin-widgets.mjs) |

### Inputs exercised by runtime tests and plug-ins

| ID | Constructs demonstrated | Example (verbatim input) | Source |
| --- | --- | --- | --- |
| S06 | Double-quoted mini strings, multiple call arguments | `stack("c3","bd sd")` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S07 | Backtick mini string; tagged template left intact | `` `c3` `` and `` xxx`c3` `` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S08 | Top-level `await`; implicit `await` for bare `samples(...)` | `await samples('xxx');` and `samples('xxx');` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S09 | Binary `+` in a call argument; zero-parameter arrow with block body and `return` | `K(1+2)` and `K(() => { return 1 + 2 })` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S10 | Nested call, string literal, member call chain as call argument | `K(S("bd".fast(4)))` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S11 | `const` declarations, comparison, ternary conditional, template interpolation, block-comment directive, line comment, mini string | `/* mini-off */`<br>`const randPrefix = Math.random() > 0.5 ? "b" : "s";`<br>``const drumPat = `${randPrefix}d`;``<br>`// mini-on`<br>`s(drumPat).lpf("5000 10000") // make sure mini still runs;` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S12 | Comment directives controlling mini-notation regions | `/* mini-off */` and `// mini-on` | [`packages/transpiler/transpiler.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/transpiler.mjs), [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) |
| S13 | Labeled statements, arrow callbacks, nested calls, multiple labeled patterns | `$: sound("bd - cp sd")`<br>`$: sound("hh*8")`<br>`all(fast("<2 3>"))`<br>`all(x => x.pianoroll())`<br>`each(fast("<2 3>"))` | [`packages/core/repl.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/core/repl.mjs) |
| S14 | Solo label and mute-label convention | `S$: s("bd!4")`; labels starting or ending with `_` are muted by `Pattern.prototype.p` | [`packages/core/repl.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/core/repl.mjs) |
| S15 | Tagged template wrapping an entire program | `` mondolang`${code}` `` | [`packages/core/repl.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/core/repl.mjs) |
| S16 | Registered language tag templates | `` tidal`...` `` and `` mondo`...` `` | [`packages/transpiler/plugin-mini.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/plugin-mini.mjs), [`packages/transpiler/transpiler.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/transpiler.mjs) |
| S17 | `K(...)` and `S(...)` call shapes, including member callees; unwraps `ChainExpression` (the ESTree wrapper for optional chaining) | `K(...)`, `.K(...)`, `S(...)`, `.S(...)` | [`packages/transpiler/plugin-kabelsalat.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/plugin-kabelsalat.mjs) |
| S18 | Variable declarations with property destructuring and dynamic `import()` in a **commented-out** test | `const { default: foo } = await import('https://bar.com/foo.js');` | [`packages/transpiler/test/transpiler.test.mjs`](https://codeberg.org/uzu/strudel/src/branch/main/packages/transpiler/test/transpiler.test.mjs) — inactive evidence; do not treat as confirmed support |

### Interpretation limits

- The transpiler emits JavaScript AST nodes such as `m(...)`, `await`, and `ReturnStatement`; generated output is **not** user-authored Strudel syntax and is not a grammar requirement.
- `K(...)`, `S(...)`, `slider(...)`, `all(...)`, and label capture are runtime conventions layered on ordinary JavaScript syntax. The grammar must expose the ordinary JavaScript structure and must not encode those meanings.
- Mini-notation, kabelsalat bodies, and registered language templates remain opaque literal or template content.
- S18 is commented out in the upstream test suite; it is recorded only to prevent it from being mistaken for confirmed coverage.

## Strudel-specific syntax shape

These forms are written in the REPL but have a JavaScript-compatible surface shape. The grammar should parse the shape and leave meaning to downstream tools:

- `$:`, `_$:`, and `S$:` are labels followed by an expression (D07, D25, S13, S14). The runtime rewrites every labeled statement to `.p('label')` (S02).
- Top-level `await` appears in D21, D33, and S08, and is explicitly enabled by the runtime parser (S01).
- Double-quoted strings are mini-notation in the REPL; single-quoted strings are ordinary strings (D05, S06). This is a semantic distinction, not a grammar rule.
- Backtick strings carry multiline mini-notation (D09), template interpolation (S11), or a tagged DSL body (D33, S15, S16). Template content remains opaque to this grammar; `${...}` itself is ordinary JavaScript expression syntax.
- Comment directives `/* mini-off */` and `// mini-on` delimit regions where the runtime does not treat double-quoted or backtick strings as mini-notation (S12). These are still comments to the grammar.

## Observations for the next coverage steps

Syntax **confirmed** across documentation and source/runtime evidence includes: `const`/`let` declarations; expression statements and semicolons; call and nested call expressions; member chains; arrow functions with zero, one, and multiple nested callbacks; block bodies with `return`; arrays; object literals including nested and quoted-key objects; numeric literals including decimals and hexadecimal; single-, double-, and backtick-quoted strings; line and block comments; parenthesized expressions; binary `+`, `*`, and `/`; comparison `>`; ternary conditional expressions; template interpolation; labeled statements; top-level `await`; named imports and `export const`; tagged template literals.

Runtime source unwraps `ChainExpression` (the ESTree representation of optional chaining) in S17, so optional-chaining-shaped callees are recognized. Object destructuring and dynamic `import()` appear only in a commented-out test (S18), so they remain lower-confidence requirements until active examples establish them.

Not established by either pass: `var`; spread/rest; nullish coalescing; default imports; `export default`; named `function` declarations. Absence is not evidence that a construct is irrelevant; it identifies what must be checked in official examples, tutorials, and community compositions before the grammar accepts or excludes it.

The next step is to collect examples from official examples and tutorials, then maintained community examples, before recording all significant requirements in a coverage matrix with these sources.
