# tree-sitter-strdl

[![CI](https://github.com/pedrozappa/tree-sitter-strdl/actions/workflows/ci.yml/badge.svg)](https://github.com/pedrozappa/tree-sitter-strdl/actions/workflows/ci.yml)

A Tree-sitter grammar for the JavaScript subset used in Strudel compositions. It exposes a concrete syntax tree (CST) for editors, language servers, and other Tree-sitter consumers.

The parser is syntax-only. Mini-notation stays opaque string content; semantic analysis, symbol resolution, runtime evaluation, and Strudel API metadata belong in downstream tools. See [grammar architecture](docs/grammar-architecture.md#scope).

## Install

```sh
npm install tree-sitter-strdl tree-sitter@^0.25.0
```

The generated parser is committed under `src/`, so consumers do not need to run the generator. A Tree-sitter runtime 0.25 or newer is required because the parser uses ABI 15. See [compatibility](docs/compatibility.md#parser-abi).

Node.js is the primary distribution target. Python, Rust, C, Swift, and Go bindings are retained with different support tiers; see the [binding support policy](docs/compatibility.md#binding-support-policy).

## Use

```js
const Parser = require("tree-sitter");
const Strudel = require("tree-sitter-strdl");

const parser = new Parser();
parser.setLanguage(Strudel);

const tree = parser.parse('$: s("bd sd").gain(0.8)');
console.log(tree.rootNode.toString());
```

The registered scope is `source.strdl`, with file types `strdl` and `strudel`. Official queries provide syntax highlighting and locals. See [queries](docs/queries.md) for registration and usage.

## Coverage and limits

Covers the evidenced Strudel JavaScript subset: declarations and assignments, calls and method chains, member access, arrow and named functions, arrays and objects, arithmetic and comparison expressions, template literals, imports and exports, blocks, and comments.

This is not a complete ECMAScript parser. Mini-notation is not parsed, and current gaps include object shorthand, object destructuring, rest and spread arguments, default imports, logical operators, and nullish coalescing. See the [syntax coverage matrix](docs/syntax-coverage-matrix.md) for exact status.

The public CST API is documented in [grammar architecture](docs/grammar-architecture.md#public-syntax-tree-api). Node and field names are stable subject to the [breaking-change policy](docs/compatibility.md#breaking-change-policy-for-cst-and-queries); generated files under `src/` must not be hand-edited.

## Development

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
make ci
```

`make install-dev` performs both dependency installs. Use `make help` for the full target list. See [development environment](docs/development-environment.md) for setup and platform notes, and [CI](docs/ci.md#what-make-ci-runs) for what the full gate checks.

## Documentation

- [Documentation index](docs/README.md) — full document inventory and ownership
- [Contributing](CONTRIBUTING.md) — change workflow, validation, commits, and release boundaries
- [Syntax evidence](docs/syntax-evidence.md) and [coverage matrix](docs/syntax-coverage-matrix.md)
- [Grammar architecture](docs/grammar-architecture.md), [queries](docs/queries.md), and [compatibility](docs/compatibility.md)
- [Build and generation](docs/build-and-generation.md), [testing procedures](docs/testing-procedures.md), and [benchmarking](docs/benchmarking.md)
- [Development roadmap](docs/roadmap.md)

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
