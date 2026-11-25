# Official Strudel syntax evidence

This document records syntax examples collected from official Strudel documentation on 2026-11-25. It is the evidence base for the coverage matrix in Phase 3; it does not itself change the grammar.

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

## Strudel-specific syntax shape

These forms are written in the REPL but have a JavaScript-compatible surface shape. The grammar should parse the shape and leave meaning to downstream tools:

- `$:` and `_$:` are labels followed by an expression, as in D07 and D25.
- Top-level `await` appears in D21 and D33.
- Double-quoted strings are mini-notation in the REPL; single-quoted strings are ordinary strings (D05). This is a semantic distinction, not a grammar rule.
- Backtick strings carry multiline mini-notation (D09) or an embedded Csound DSL body (D33). Both remain opaque template-literal content to this grammar.

## Observations for the next coverage steps

Syntax **found** in official documentation includes: `const`/`let` declarations; expression statements and semicolons; call and nested call expressions; member chains; arrow functions with zero, one, and multiple nested callbacks; arrays; object literals including nested and quoted-key objects; numeric literals including decimals and hexadecimal; single-, double-, and backtick-quoted strings; line and block comments; parenthesized expressions; binary division and multiplication; labeled statements; top-level `await`; named imports and `export const`; template literals.

Not established by this documentation pass: `var`; destructuring; spread/rest; ternary conditional expressions; optional chaining; nullish coalescing; template interpolation (`${...}`); default imports; `export default`; named `function` declarations. Absence here is not evidence that a construct is irrelevant; it identifies what must be checked in source code, official examples, and community compositions before the grammar accepts or excludes it.

The next step is to collect examples from Strudel source code and runtime, then record all significant requirements in a coverage matrix with these sources.
