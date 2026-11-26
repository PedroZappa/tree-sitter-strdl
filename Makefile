# Makefile — tree-sitter-strdl
#
# Convenience wrapper around the Tree-sitter CLI, the C library build and the
# Node.js binding tests. grammar.js is the authoritative grammar definition;
# generated parser artifacts are committed but never edited by hand.
#
# Read-only inspection of this file needs no approval; changing it does.

#==============================================================================#
#                                  CONFIG                                      #
#==============================================================================#

ifeq ($(OS),Windows_NT)
$(error Windows is not supported)
endif

# Project metadata
LANGUAGE_NAME := tree-sitter-strudel
HOMEPAGE_URL := https://github.com/pedrozappa/tree-sitter-strdl
VERSION := 2.0.0
DESCRIPTION := Parser for Strudel, a Tidal Cycles based live coding tool

# Directories
SRC_DIR := src
QUERY_DIR := queries
TEST_DIR := test/corpus
DOCS_DIR := docs
BUILD_DIR ?= build

# Tools. Prefer pinned local binaries when installed; use variable overrides
# such as `make TS=tree-sitter ...` to select system binaries instead.
TS_LOCAL := node_modules/.bin/tree-sitter
TS ?= $(shell if [ -x '$(TS_LOCAL)' ]; then printf '%s' '$(TS_LOCAL)'; else printf 'tree-sitter'; fi)
PRETTIER_LOCAL := node_modules/.bin/prettier
PRETTIER ?= $(shell if [ -x '$(PRETTIER_LOCAL)' ]; then printf '%s' '$(PRETTIER_LOCAL)'; else printf 'prettier'; fi)
RUFF_LOCAL := .venv/bin/ruff
RUFF ?= $(shell if [ -x '$(RUFF_LOCAL)' ]; then printf '%s' '$(RUFF_LOCAL)'; else printf 'ruff'; fi)
PYTHON_LOCAL := .venv/bin/python
PYTHON ?= $(shell if [ -x '$(PYTHON_LOCAL)' ]; then printf '%s' '$(PYTHON_LOCAL)'; else printf 'python3'; fi)
NPM ?= npm
NODE ?= node
HOST_OS := $(shell uname -s)
BROWSER ?= $(if $(filter Darwin,$(HOST_OS)),open,xdg-open)

# Install directory layout
PREFIX ?= /usr/local
DATADIR ?= $(PREFIX)/share
INCLUDEDIR ?= $(PREFIX)/include
LIBDIR ?= $(PREFIX)/lib
PCLIBDIR ?= $(LIBDIR)/pkgconfig

# Source/object files and parser inputs
PARSER := $(SRC_DIR)/parser.c
EXTRAS := $(filter-out $(PARSER),$(wildcard $(SRC_DIR)/*.c))
OBJS := $(patsubst %.c,%.o,$(PARSER) $(EXTRAS))
QUERIES := $(wildcard $(QUERY_DIR)/*.scm)
FIXTURES := test/fixtures/test.strdl test/fixtures/test-local.strdl
QUERY_DETERMINISM_FIXTURES := test/query/determinism.strdl
QUERY_EXECUTION_FIXTURES := $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
REGRESSION_INVENTORY := test/fixtures/regression_inventory.json
BENCHMARK_MANIFEST := benchmarks/fixtures/manifest.json
BENCH_CATALOG := test/fixtures/incremental_sequences.json
BENCH_MODE ?= all
BENCH_ITERATIONS ?= 15
BENCH_WARMUP ?= 2
BENCH_FIXTURE ?=
BENCH_SEQUENCE ?=
BENCH_CATEGORY ?=
BENCH_OUTPUT ?=
BENCH_BASELINE := benchmarks/results/baseline.json
BENCH_BASELINE_SOURCES := benchmarks/results/baseline-sources
BENCH_BASELINE_FRESH := $(BENCH_BASELINE_SOURCES)/fresh.json
BENCH_BASELINE_INCREMENTAL := $(BENCH_BASELINE_SOURCES)/incremental.json
BENCH_BASELINE_MEMORY := $(BENCH_BASELINE_SOURCES)/memory.json
BENCH_BUDGETS := benchmarks/results/budgets.json
BENCH_FRESH_REPORT ?=
BENCH_INCREMENTAL_REPORT ?=
BENCH_MEMORY_REPORT ?=
BENCH_COMPARE_OUTPUT ?=
BENCH_BUDGET_INPUTS ?=
PERF_REPORT_OUTPUT ?=
PERF_REPORT_JSON_OUTPUT ?=
PERF_REPORT_FORMAT ?= auto
RECOVERY_FILES := $(wildcard $(TEST_DIR)/incomplete_*.txt $(TEST_DIR)/malformed_*.txt $(TEST_DIR)/missing_*.txt $(TEST_DIR)/noncascading_*.txt $(TEST_DIR)/recovery_*.txt $(TEST_DIR)/unfinished_*.txt $(TEST_DIR)/valid_*.txt)

# Test inputs (override on the command line)
FILTER ?=
INCREMENTAL_FILTER ?=
FILES ?= $(FIXTURES)
PARSE_FLAGS ?=

# Flags
ARFLAGS ?= rcs
override CFLAGS += -I$(SRC_DIR) -std=c11 -fPIC

# ABI versioning
SONAME_MAJOR = $(shell sed -n 's/\#define LANGUAGE_VERSION //p' $(PARSER))
SONAME_MINOR = $(word 1,$(subst ., ,$(VERSION)))

# OS-specific bits
ifeq ($(HOST_OS),Darwin)
	SOEXT = dylib
	SOEXTVER_MAJOR = $(SONAME_MAJOR).$(SOEXT)
	SOEXTVER = $(SONAME_MAJOR).$(SONAME_MINOR).$(SOEXT)
	LINKSHARED = -dynamiclib -Wl,-install_name,$(LIBDIR)/lib$(LANGUAGE_NAME).$(SOEXTVER),-rpath,@executable_path/../Frameworks
else
	SOEXT = so
	SOEXTVER_MAJOR = $(SOEXT).$(SONAME_MAJOR)
	SOEXTVER = $(SOEXT).$(SONAME_MAJOR).$(SONAME_MINOR)
	LINKSHARED = -shared -Wl,-soname,lib$(LANGUAGE_NAME).$(SOEXTVER)
endif
ifneq ($(filter $(HOST_OS),FreeBSD NetBSD DragonFly),)
	PCLIBDIR := $(PREFIX)/libdata/pkgconfig
endif

# Query checks use the freshly built shared library instead of the CLI's global
# parser cache, which can hold a stale or symbol-less parser.
QUERY_LIB := $(CURDIR)/lib$(LANGUAGE_NAME).$(SOEXT)
export TREE_SITTER_LIB_PATH := $(QUERY_LIB)

# Colors. tput is silenced when TERM is unset (for example in CI), leaving the
# escape sequences empty without polluting every make invocation with errors.
B = $(shell tput bold 2>/dev/null)
RED = $(shell tput setaf 1 2>/dev/null)
GRN = $(shell tput setaf 2 2>/dev/null)
YEL = $(shell tput setaf 3 2>/dev/null)
BLU = $(shell tput setaf 4 2>/dev/null)
MAG = $(shell tput setaf 5 2>/dev/null)
CYA = $(shell tput setaf 6 2>/dev/null)
D = $(shell tput sgr0 2>/dev/null)

# Message vars
_SUCCESS = [$(GRN)SUCCESS$(D)]
_INFO    = [$(BLU)INFO$(D)]

.PHONY: all build generate test test-recovery test-incremental test-query-compile test-query-execution test-query-registration test-query test-node test-node-clean-build test-generated-runtime test-c test-python test-rust test-swift test-package test-tarball-install test-regressions benchmark-fixtures check-benchmark-fixtures bench-fresh bench-incremental bench-memory build-benchmark-baseline check-benchmark-baseline reproduce-benchmark-baseline compare-benchmark-baseline build-benchmark-budgets check-benchmark-budgets performance-report format check-format check-static parse playground wasm \
	local-install install-dev install uninstall clean check-generated check-version verify verify-all ci \
	docs docs-open help

#==============================================================================#
#                                  RULES                                       #
#==============================================================================#

##@ Compilation Rules 🏗

all: lib$(LANGUAGE_NAME).a lib$(LANGUAGE_NAME).$(SOEXT) $(LANGUAGE_NAME).pc	## Build C libraries and pkg-config metadata (default)

build: all	## Alias for all

generate:	## Regenerate parser artifacts from grammar.js
	@echo "$(YEL)Generating parser artifacts...$(D)"
	@$(TS) generate
	@echo "$(YEL)* $(_SUCCESS) Parser artifacts generated$(D)"

$(PARSER): $(SRC_DIR)/grammar.json
	$(TS) generate $^

lib$(LANGUAGE_NAME).a: $(OBJS)
	$(AR) $(ARFLAGS) $@ $^

lib$(LANGUAGE_NAME).$(SOEXT): $(OBJS)
	$(CC) $(LDFLAGS) $(LINKSHARED) $^ $(LDLIBS) -o $@
ifneq ($(STRIP),)
	$(STRIP) $@
endif

$(LANGUAGE_NAME).pc: bindings/c/$(LANGUAGE_NAME).pc.in
	sed -e 's|@PROJECT_VERSION@|$(VERSION)|' \
		-e 's|@CMAKE_INSTALL_LIBDIR@|$(LIBDIR:$(PREFIX)/%=%)|' \
		-e 's|@CMAKE_INSTALL_INCLUDEDIR@|$(INCLUDEDIR:$(PREFIX)/%=%)|' \
		-e 's|@PROJECT_DESCRIPTION@|$(DESCRIPTION)|' \
		-e 's|@PROJECT_HOMEPAGE_URL@|$(HOMEPAGE_URL)|' \
		-e 's|@CMAKE_INSTALL_PREFIX@|$(PREFIX)|' $< > $@

##@ Testing Rules ✅

test:	## Run corpus tests (FILTER=regex restricts case names)
	@echo "$(YEL)Running corpus tests...$(D)"
	@$(TS) test $(if $(FILTER),-i "$(FILTER)",)
	@echo "$(YEL)* $(_SUCCESS) Corpus tests completed$(D)"

test-recovery:	## Run error-recovery corpus cases
	@echo "$(YEL)Running recovery corpus tests...$(D)"
	@for file in $(RECOVERY_FILES); do \
		$(TS) test --file-name "$$(basename "$$file")" || exit 1; \
	done
	@echo "$(YEL)* $(_SUCCESS) Recovery corpus tests completed$(D)"

test-incremental:	## Compare incremental and fresh parses (INCREMENTAL_FILTER=id/category)
	@echo "$(YEL)Running incremental equivalence tests...$(D)"
	@$(PYTHON) scripts/test_incremental.py $(INCREMENTAL_FILTER)
	@echo "$(YEL)* $(_SUCCESS) Incremental equivalence tests completed$(D)"

test-query-compile: lib$(LANGUAGE_NAME).$(SOEXT)	## Compile official queries and verify invalid queries are rejected
	@echo "$(YEL)Running query compilation checks...$(D)"
	@$(PYTHON) scripts/check_query_compilation.py $(TS) $(QUERIES)
	@echo "$(YEL)* $(_SUCCESS) Query compilation checks completed$(D)"

test-query-execution: lib$(LANGUAGE_NAME).$(SOEXT)	## Assert query captures on representative compositions
	@echo "$(YEL)Running query execution tests...$(D)"
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/call_identifiers.scm function.call "call identifiers" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/call_methods.scm function.method "method callees" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/declaration_names.scm variable "declaration names" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/arrow_parameters.scm variable.parameter "arrow parameters" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/identifier_pair_keys.scm property "identifier object keys" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/label_names.scm label "labels" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/template_substitution_identifiers.scm variable "substitution identifiers" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/string_literals.scm string "strings" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/number_literals.scm number "numbers" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/declaration_names.scm local.definition.var "variable declarations" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/arrow_parameters.scm local.definition.parameter "arrow parameters" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/call_identifiers.scm local.reference "call identifiers" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/keywords.scm keyword "keyword tokens" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/punctuation_delimiters.scm punctuation.delimiter "punctuation delimiters" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/punctuation_brackets.scm punctuation.bracket "punctuation brackets" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/operators.scm operator "operators" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/comments.scm comment "comments" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/function_declaration_names.scm function.declaration "function declaration names" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/member_properties.scm property "member properties" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/expression_nodes.scm expression "expression nodes" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/constructors.scm constructor "constructors" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/scopes.scm local.scope "scopes" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/function_declaration_names.scm local.definition.function "function declarations" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/assignment_definitions.scm local.definition.var "assignment definitions" $(QUERY_EXECUTION_FIXTURES)
	@$(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/catch_parameters.scm local.definition.parameter "catch parameters" $(QUERY_EXECUTION_FIXTURES)
	@if $(PYTHON) scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/call_identifiers.scm not.a.capture "wrong capture negative control" $(QUERY_EXECUTION_FIXTURES) >/dev/null 2>&1; then \
		echo "query execution check failed: wrong-capture negative control was accepted"; exit 1; \
	else \
		echo "rejected: wrong-capture negative control"; \
	fi
	@echo "$(YEL)* $(_SUCCESS) Query execution tests completed$(D)"

test-query-registration:	## Verify official queries are registered, packaged, and exported
	@echo "$(YEL)Running query registration checks...$(D)"
	@$(PYTHON) scripts/check_query_registration.py
	@echo "$(YEL)* $(_SUCCESS) Query registration checks completed$(D)"

test-query: test-query-compile test-query-execution test-query-registration	## Compile, run, and check official queries against the fixtures
	@echo "$(YEL)Running query checks...$(D)"
	@for query in $(QUERIES); do \
		$(TS) query --quiet --lib-path "$(QUERY_LIB)" --lang-name strudel "$$query" $(FIXTURES) || exit 1; \
	done
	@$(PYTHON) scripts/check_query_determinism.py $(TS) $(QUERY_DIR)/highlights.scm $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
	@$(PYTHON) scripts/check_locals_definitions_absent.py $(TS) $(QUERY_DIR)/locals.scm test/query/call_identifiers.scm "call identifier" $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
	@$(PYTHON) scripts/check_locals_definitions_absent.py $(TS) $(QUERY_DIR)/locals.scm test/query/object_keys.scm "object key" $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
	@echo "$(YEL)* $(_SUCCESS) Queries compiled, executed, and deterministic$(D)"

test-node:	## Run Node.js binding tests (requires a matching native ABI)
	@echo "$(YEL)Running Node.js binding tests...$(D)"
	@$(NPM) test
	@echo "$(YEL)* $(_SUCCESS) Node.js binding tests completed$(D)"

test-node-clean-build:	## Build and test the Node.js binding from clean tracked sources
	@echo "$(YEL)Building Node.js binding from clean tracked sources...$(D)"
	@$(PYTHON) scripts/check_node_clean_build.py $(NPM)
	@echo "$(YEL)* $(_SUCCESS) Node.js binding clean build completed$(D)"

test-generated-runtime:	## Verify committed generated parser files work without regeneration
	@echo "$(YEL)Verifying generated parser runtime...$(D)"
	@$(PYTHON) scripts/check_generated_runtime.py $(NPM) $(NODE)
	@echo "$(YEL)* $(_SUCCESS) Generated parser runtime verified$(D)"

test-c:	## Verify the C binding header links to the generated parser
	@echo "$(YEL)Verifying C binding...$(D)"
	@$(PYTHON) scripts/check_c_binding.py $(CC)
	@echo "$(YEL)* $(_SUCCESS) C binding verified$(D)"

test-python:	## Build and verify the Python binding extension
	@echo "$(YEL)Verifying Python binding...$(D)"
	@$(PYTHON) scripts/check_python_binding.py
	@echo "$(YEL)* $(_SUCCESS) Python binding verified$(D)"

test-rust:	## Verify Rust binding metadata, packaging, public API, and cargo tests
	@echo "$(YEL)Verifying Rust binding...$(D)"
	@$(PYTHON) scripts/check_rust_binding.py
	@echo "$(YEL)* $(_SUCCESS) Rust binding verified$(D)"

test-swift:	## Verify Swift binding metadata, packaging, public API, and swift build/test
	@echo "$(YEL)Verifying Swift binding...$(D)"
	@$(PYTHON) scripts/check_swift_binding.py
	@echo "$(YEL)* $(_SUCCESS) Swift binding verified$(D)"

test-package:	## Verify npm package contents and metadata
	@echo "$(YEL)Checking npm package integrity...$(D)"
	@$(PYTHON) scripts/check_package_integrity.py $(NPM)
	@echo "$(YEL)* $(_SUCCESS) npm package integrity check completed$(D)"

test-tarball-install:	## Install the npm tarball and parse a fixture in a clean consumer
	@echo "$(YEL)Installing npm tarball into a clean consumer...$(D)"
	@python3 scripts/check_tarball_install.py $(NPM) $(NODE)
	@echo "$(YEL)* $(_SUCCESS) npm tarball installation and parse verified$(D)"

test-regressions:	## Verify recorded bugs have permanent regression artifacts
	@echo "$(YEL)Checking regression coverage...$(D)"
	@$(PYTHON) scripts/check_regression_coverage.py $(REGRESSION_INVENTORY)
	@echo "$(YEL)* $(_SUCCESS) Regression coverage check completed$(D)"

parse:	## Parse files with the current parser (FILES=..., PARSE_FLAGS=...)
	@$(TS) parse $(PARSE_FLAGS) $(FILES)

##@ Benchmarking 📊

benchmark-fixtures:	## Regenerate synthetic benchmark fixtures from the manifest
	@echo "$(YEL)Generating benchmark fixtures...$(D)"
	@$(PYTHON) scripts/generate_benchmark_fixtures.py
	@echo "$(YEL)* $(_SUCCESS) Benchmark fixtures generated$(D)"

check-benchmark-fixtures:	## Verify benchmark fixtures match the manifest and regenerate exactly
	@echo "$(YEL)Checking benchmark fixtures...$(D)"
	@$(PYTHON) scripts/generate_benchmark_fixtures.py --check $(BENCHMARK_MANIFEST)
	@echo "$(YEL)* $(_SUCCESS) Benchmark fixtures are reproducible$(D)"

bench-fresh:	## Measure fresh parsing latency (ITERATIONS, WARMUP, FIXTURE, OUTPUT overrides)
	@echo "$(YEL)Measuring fresh parse latency...$(D)"
	@$(NODE) scripts/bench_fresh.js --manifest $(BENCHMARK_MANIFEST) --iterations $(BENCH_ITERATIONS) --warmup $(BENCH_WARMUP) $(if $(BENCH_FIXTURE),--fixture $(BENCH_FIXTURE),) $(if $(BENCH_OUTPUT),--output $(BENCH_OUTPUT),)
	@echo "$(YEL)* $(_SUCCESS) Fresh parsing latency measured$(D)"

bench-incremental:	## Measure incremental parsing latency (ITERATIONS, WARMUP, SEQUENCE, CATEGORY, OUTPUT overrides)
	@echo "$(YEL)Measuring incremental parse latency...$(D)"
	@$(NODE) scripts/bench_incremental.js --manifest $(BENCHMARK_MANIFEST) --catalog $(BENCH_CATALOG) --iterations $(BENCH_ITERATIONS) --warmup $(BENCH_WARMUP) $(if $(BENCH_SEQUENCE),--sequence $(BENCH_SEQUENCE),) $(if $(BENCH_CATEGORY),--category $(BENCH_CATEGORY),) $(if $(BENCH_OUTPUT),--output $(BENCH_OUTPUT),)
	@echo "$(YEL)* $(_SUCCESS) Incremental parsing latency measured$(D)"

bench-memory:	## Measure parse-tree memory (MODE, ITERATIONS, WARMUP, FIXTURE, SEQUENCE, CATEGORY, OUTPUT overrides)
	@echo "$(YEL)Measuring parse-tree memory...$(D)"
	@$(NODE) --expose-gc scripts/bench_memory.js --manifest $(BENCHMARK_MANIFEST) --catalog $(BENCH_CATALOG) --mode $(BENCH_MODE) --iterations $(BENCH_ITERATIONS) --warmup $(BENCH_WARMUP) $(if $(BENCH_FIXTURE),--fixture $(BENCH_FIXTURE),) $(if $(BENCH_SEQUENCE),--sequence $(BENCH_SEQUENCE),) $(if $(BENCH_CATEGORY),--category $(BENCH_CATEGORY),) $(if $(BENCH_OUTPUT),--output $(BENCH_OUTPUT),)
	@echo "$(YEL)* $(_SUCCESS) Parse-tree memory measured$(D)"

build-benchmark-baseline:	## Build committed baseline from fresh/incremental/memory reports (FRESH_REPORT, INCREMENTAL_REPORT, MEMORY_REPORT overrides)
	@echo "$(YEL)Building benchmark baseline...$(D)"
	@$(NODE) scripts/baseline_results.js build --fresh $(BENCH_FRESH_REPORT) --incremental $(BENCH_INCREMENTAL_REPORT) --memory $(BENCH_MEMORY_REPORT) --output $(BENCH_BASELINE)
	@echo "$(YEL)* $(_SUCCESS) Benchmark baseline built$(D)"

check-benchmark-baseline:	## Validate committed benchmark baseline structure without performance gating
	@echo "$(YEL)Checking benchmark baseline...$(D)"
	@$(NODE) scripts/baseline_results.js check --baseline $(BENCH_BASELINE)
	@echo "$(YEL)* $(_SUCCESS) Benchmark baseline is structurally valid$(D)"

reproduce-benchmark-baseline:	## Verify the committed baseline rebuilds from its committed source reports
	@echo "$(YEL)Reproducing benchmark baseline...$(D)"
	@$(NODE) scripts/baseline_results.js reproduce --baseline $(BENCH_BASELINE) --fresh $(BENCH_BASELINE_FRESH) --incremental $(BENCH_BASELINE_INCREMENTAL) --memory $(BENCH_BASELINE_MEMORY)
	@echo "$(YEL)* $(_SUCCESS) Benchmark baseline reproduced$(D)"

compare-benchmark-baseline:	## Compare fresh/incremental/memory reports against the baseline without gating
	@echo "$(YEL)Comparing benchmark reports with baseline...$(D)"
	@$(NODE) scripts/baseline_results.js compare --baseline $(BENCH_BASELINE) --fresh $(BENCH_FRESH_REPORT) --incremental $(BENCH_INCREMENTAL_REPORT) --memory $(BENCH_MEMORY_REPORT) $(if $(BENCH_COMPARE_OUTPUT),--output $(BENCH_COMPARE_OUTPUT),)
	@echo "$(YEL)* $(_SUCCESS) Benchmark comparison generated$(D)"

build-benchmark-budgets:	## Build observed-envelope budgets from a session manifest (BENCH_BUDGET_INPUTS override)
	@echo "$(YEL)Building benchmark budgets...$(D)"
	@$(NODE) scripts/benchmark_budgets.js build --inputs $(BENCH_BUDGET_INPUTS) --output $(BENCH_BUDGETS)
	@echo "$(YEL)* $(_SUCCESS) Benchmark budgets built$(D)"

check-benchmark-budgets:	## Validate committed budget provenance and observed maxima without gating
	@echo "$(YEL)Checking benchmark budgets...$(D)"
	@$(NODE) scripts/benchmark_budgets.js check --budget $(BENCH_BUDGETS)
	@echo "$(YEL)* $(_SUCCESS) Benchmark budgets are structurally valid$(D)"

performance-report:	## Run performance checks and print a hardware-variance-aware report (non-gating)
	@echo "$(YEL)Running performance checks...$(D)"
	@set -e; dir=$$(mktemp -d); \
	trap 'rm -rf "$$dir"' EXIT; \
	$(MAKE) bench-fresh BENCH_OUTPUT="$$dir/fresh.json" >/dev/null; \
	$(MAKE) bench-incremental BENCH_OUTPUT="$$dir/incremental.json" >/dev/null; \
	$(MAKE) bench-memory BENCH_OUTPUT="$$dir/memory.json" >/dev/null; \
	$(NODE) scripts/performance_report.js --baseline $(BENCH_BASELINE) --budgets $(BENCH_BUDGETS) --fresh "$$dir/fresh.json" --incremental "$$dir/incremental.json" --memory "$$dir/memory.json" --format $(PERF_REPORT_FORMAT) $(if $(PERF_REPORT_OUTPUT),--output $(PERF_REPORT_OUTPUT),) $(if $(PERF_REPORT_JSON_OUTPUT),--json-output $(PERF_REPORT_JSON_OUTPUT),)
	@echo "$(YEL)* $(_SUCCESS) Performance report generated (informational only)$(D)"

format:	## Apply Prettier and Ruff formatting plus safe Ruff fixes
	@echo "$(YEL)Formatting source files...$(D)"
	@$(PRETTIER) --write .
	@$(RUFF) check --fix .
	@$(RUFF) format .
	@echo "$(YEL)* $(_SUCCESS) Source files formatted$(D)"

check-format:	## Verify Prettier and Ruff formatting
	@echo "$(YEL)Checking source formatting...$(D)"
	@$(PRETTIER) --check .
	@$(RUFF) format --check .
	@echo "$(YEL)* $(_SUCCESS) Source formatting is clean$(D)"

check-static:	## Run Ruff static analysis and shell syntax checks
	@echo "$(YEL)Running static checks...$(D)"
	@$(RUFF) check .
	@sh -n scripts/local_install.sh
	@echo "$(YEL)* $(_SUCCESS) Static checks completed$(D)"

##@ Verification ✅

check-generated:	## Verify committed parser artifacts match grammar.js
	@echo "$(YEL)Checking generated artifacts...$(D)"
	@$(TS) generate
	@git diff --exit-code HEAD -- $(PARSER) $(SRC_DIR)/grammar.json $(SRC_DIR)/node-types.json $(SRC_DIR)/tree_sitter || { \
		echo "$(RED)Generated artifacts are out of sync; run 'make generate'.$(D)"; \
		exit 1; \
	}
	@echo "$(YEL)* $(_SUCCESS) Generated artifacts are in sync$(D)"

check-version:	## Verify version numbers are aligned across package metadata
	@echo "$(YEL)Checking version consistency...$(D)"
	@$(PYTHON) scripts/check_version_consistency.py
	@echo "$(YEL)* $(_SUCCESS) Package versions are aligned$(D)"

verify: check-generated check-format check-static test test-incremental test-query test-regressions check-benchmark-fixtures check-benchmark-baseline reproduce-benchmark-baseline check-benchmark-budgets	## Run the core CI gate (artifacts, formatting, static checks, corpus, incremental equivalence, queries, regressions, fixtures, baseline reproduction, budgets)

verify-all: verify test-node test-node-clean-build test-generated-runtime test-c test-python test-rust test-swift check-version test-package test-tarball-install	## Run the core gate plus Node.js, clean-build, generated-runtime, C/Python/Rust/Swift bindings, version, package, and tarball-install/parse checks

ci: verify-all build	## Run the complete CI gate locally (requires make install-dev first)

##@ Utility Rules 🛠

playground:	## Open the tree-sitter playground (npm prestart builds the WASM parser)
	@$(NPM) start

wasm:	## Build the WebAssembly parser
	@$(TS) build --wasm

local-install:	## Install official queries into the local nvim-treesitter directory
	@$(NPM) run local_install

install-dev:	## Install pinned development tools used by formatting and static checks
	@echo "$(YEL)Installing development tools...$(D)"
	@$(NPM) ci
	@python3 -m venv .venv
	@.venv/bin/pip install -r requirements-dev.txt
	@echo "$(YEL)* $(_SUCCESS) Development tools installed$(D)"

install: all	## Install libraries, header, pkg-config file and queries
	install -d '$(DESTDIR)$(DATADIR)'/tree-sitter/queries/strudel '$(DESTDIR)$(INCLUDEDIR)'/tree_sitter '$(DESTDIR)$(PCLIBDIR)' '$(DESTDIR)$(LIBDIR)'
	install -m644 bindings/c/tree_sitter/$(LANGUAGE_NAME).h '$(DESTDIR)$(INCLUDEDIR)'/tree_sitter/$(LANGUAGE_NAME).h
	install -m644 $(LANGUAGE_NAME).pc '$(DESTDIR)$(PCLIBDIR)'/$(LANGUAGE_NAME).pc
	install -m644 lib$(LANGUAGE_NAME).a '$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).a
	install -m755 lib$(LANGUAGE_NAME).$(SOEXT) '$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).$(SOEXTVER)
	ln -sf lib$(LANGUAGE_NAME).$(SOEXTVER) '$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).$(SOEXTVER_MAJOR)
	ln -sf lib$(LANGUAGE_NAME).$(SOEXTVER_MAJOR) '$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).$(SOEXT)
ifneq ($(wildcard queries/*.scm),)
	install -m644 queries/*.scm '$(DESTDIR)$(DATADIR)'/tree-sitter/queries/strudel
endif

uninstall:	## Remove installed libraries, header, pkg-config file and queries
	$(RM) '$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).a \
		'$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).$(SOEXTVER) \
		'$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).$(SOEXTVER_MAJOR) \
		'$(DESTDIR)$(LIBDIR)'/lib$(LANGUAGE_NAME).$(SOEXT) \
		'$(DESTDIR)$(INCLUDEDIR)'/tree_sitter/$(LANGUAGE_NAME).h \
		'$(DESTDIR)$(PCLIBDIR)'/$(LANGUAGE_NAME).pc
	$(RM) -r '$(DESTDIR)$(DATADIR)'/tree-sitter/queries/strudel

clean:	## Remove build artifacts, generated metadata and dependency trees
	@echo "$(YEL)Removing build artifacts...$(D)"
	$(RM) $(OBJS) $(LANGUAGE_NAME).pc lib$(LANGUAGE_NAME).a lib$(LANGUAGE_NAME).$(SOEXT)
	$(RM) -fr $(BUILD_DIR)/ node_modules/
	@echo "$(YEL)* $(_SUCCESS) Build trees cleaned$(D)"

##@ Documentation 📚

docs:	## List the project documentation in docs/
	@echo "$(YEL)Documentation in $(DOCS_DIR):$(D)"
	@cd "$(DOCS_DIR)" && ls -1 *.md

docs-open:	## Open the documentation index in a browser (BROWSER overrides the viewer)
	@$(BROWSER) "$(DOCS_DIR)/README.md"
	@echo "$(YEL)* $(_SUCCESS) Documentation viewer launched$(D)"

##@ Help 󰛵

help:	## Display this help page
	@awk 'BEGIN {FS = ":.*##"; \
			printf "\n=> Usage:\n\tmake $(GRN)<target>$(D)\n"} \
		/^[a-zA-Z_0-9-]+:.*?##/ { \
			printf "\t$(GRN)%-18s$(D) %s\n", $$1, $$2 } \
		/^##@/ { \
			printf "\n=> %s\n", substr($$0, 5) } ' Makefile
