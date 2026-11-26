# tree-sitter-strdl

[![CI](https://github.com/pedrozappa/tree-sitter-strdl/actions/workflows/ci.yml/badge.svg)](https://github.com/pedrozappa/tree-sitter-strdl/actions/workflows/ci.yml)

Tree-sitter parser for Strudel, a Tidal Cycles based live coding tool.

The grammar targets the JavaScript subset used in Strudel compositions. It is independent of Strudel runtime evaluation and does not parse mini-notation: `s("bd sd")` is a function call with one opaque string argument.

## Installation

The parser is distributed as a conventional Tree-sitter grammar package with committed generated artifacts in `src/`. Consumers do not need to run the generator.

Requirements:

- Tree-sitter runtime 0.25 or newer (ABI 15 parser)
- Tree-sitter CLI 0.27.2 when regenerating artifacts

## Usage

```js
const Parser = require("tree-sitter");
const Strudel = require("tree-sitter-strdl");

const parser = new Parser();
parser.setLanguage(Strudel);

const tree = parser.parse('$: s("bd sd").gain(0.8)');
console.log(tree.rootNode.toString());
```

### Neovim

Create `~/.config/nvim/lua/strudel-integration.lua`:

```lua
---@class ParserConfig
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.strudel = {
  install_info = {
    -- url = "https://github.com/pedrozappa/tree-sitter-strdl", -- local path or git repo
    url = "~/tree-sitter-strdl/", -- local path to this repo
    files = { "src/parser.c" }, -- note that some parsers also require src/scanner.c or src/scanner.cc
    -- optional entries:
    branch = "main", -- default branch in case of git repo if different from master
    generate_requires_npm = false, -- if stand-alone parser without npm dependencies
    requires_generate_from_grammar = false, -- if folder contains pre-generated src/parser.c
  },
  filetype = "strdl", -- if filetype does not match the parser name
}

vim.api.nvim_create_autocmd("BufRead", {
  pattern = { "*.strdl", "*.strudel" },
  callback = function()
    vim.bo.filetype = "strdl"
  end,
})
```

Then add this to `~/.config/nvim/init.lua`:

```lua
require("strudel-integration")
```

Run the following to install the parser schemas:

```bash
npm run local_install
```

## Supported syntax

Current coverage includes:

- `var`, `let`, and `const` declarations
- labeled Strudel assignments such as `$:` and assignment expressions
- direct calls, nested calls, method chains, plain and computed member access
- arrow functions with zero, one, multiple, destructured, and block-bodied forms
- named functions with default parameters
- arrays, objects, object spread, and hexadecimal numbers
- arithmetic, comparison, unary, and conditional expressions
- template literals with interpolation, tagged templates, and `await`
- named imports, `export const`, and `export default`
- `try`/`catch`, blocks, `return`, and line/block comments

Not supported: mini-notation semantics, object shorthand, object destructuring declarations, spread arguments, default imports, logical operators, nullish coalescing, and general ECMAScript syntax. See the [coverage matrix](docs/syntax-coverage-matrix.md) for the exact status and evidence for each construct.

## Syntax tree

The public CST API is documented in [grammar architecture](docs/grammar-architecture.md). The Phase 3 structured refactor changed node and field names; consumers upgrading from the Phase 2 baseline must update their queries and tree-walking code.

Generated parser artifacts and `src/node-types.json` are committed. Do not hand-edit generated files.

## Development

```bash
npm ci
make ci
```

`make ci` checks generated artifacts and benchmark fixture reproducibility, runs corpus, query, regression-coverage, Node.js binding, clean Node.js addon build, generated parser runtime, and npm package integrity checks, and builds the C libraries. GitHub Actions runs the same gate on pull requests and pushes to `main`; see [CI](docs/ci.md).

To regenerate artifacts or run a single layer directly:

```bash
make generate
make test
make test-query
```

Official queries live in `queries/`:

- `highlights.scm` — syntax highlighting
- `locals.scm` — scopes, definitions, and references

See [query documentation](docs/queries.md) for the official inventory, capture conventions, registration, usage, and stability policy. There is no `injections.scm`: no current construct justifies reparsing part of a Strudel source file with another language. See the [injection evaluation](docs/injections-evaluation.md) for the evidence and decision.

## Documentation

- [Repository assessment](docs/repository-assessment.md)
- [Grammar architecture](docs/grammar-architecture.md)
- [Syntax evidence](docs/syntax-evidence.md)
- [Syntax coverage matrix](docs/syntax-coverage-matrix.md)
- [Compatibility](docs/compatibility.md)
- [CI](docs/ci.md)
- [Test strategy](docs/test-strategy.md)
- [Regression coverage](docs/regression-coverage.md)
- [Benchmarking](docs/benchmarking.md)
- [Queries](docs/queries.md)
- [Highlight captures](docs/highlight-captures.md)
- [Locals captures](docs/locals-captures.md)
- [Locals audit](docs/locals-audit.md)
- [Injection evaluation](docs/injections-evaluation.md)
- [Development roadmap](docs/roadmap.md)
- [Documentation index](docs/README.md)

## External resources

- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Strudel](https://strudel.cc/)
- [Tidal Cycles](https://tidalcycles.org/)
- [Crafting Interpreters](https://www.craftinginterpreters.com/)
