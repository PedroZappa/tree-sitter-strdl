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
VERSION := 1.3.0
DESCRIPTION := Parser for Strudel, a Tidal Cycles based live coding tool

# Directories
SRC_DIR := src
QUERY_DIR := queries
TEST_DIR := test/corpus
DOCS_DIR := docs
BUILD_DIR ?= build

# Tools. Prefer the CLI pinned in devDependencies when it is installed; use
# `make TS=tree-sitter ...` to select a system binary instead.
TS_LOCAL := node_modules/.bin/tree-sitter
TS ?= $(shell if [ -x '$(TS_LOCAL)' ]; then printf '%s' '$(TS_LOCAL)'; else printf 'tree-sitter'; fi)
NPM ?= npm
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
FIXTURES := test.strdl test-local.strdl
QUERY_DETERMINISM_FIXTURES := test/query/determinism.strdl
QUERY_EXECUTION_FIXTURES := $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
REGRESSION_INVENTORY := test/fixtures/regression_inventory.json
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

.PHONY: all build generate test test-recovery test-incremental test-query-compile test-query-execution test-query-registration test-query test-node test-package test-regressions parse playground wasm \
	local-install install uninstall clean check-generated verify verify-all ci \
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
	@python3 scripts/test_incremental.py $(INCREMENTAL_FILTER)
	@echo "$(YEL)* $(_SUCCESS) Incremental equivalence tests completed$(D)"

test-query-compile:	## Compile official queries and verify invalid queries are rejected
	@echo "$(YEL)Running query compilation checks...$(D)"
	@python3 scripts/check_query_compilation.py $(TS) $(QUERIES)
	@echo "$(YEL)* $(_SUCCESS) Query compilation checks completed$(D)"

test-query-execution:	## Assert query captures on representative compositions
	@echo "$(YEL)Running query execution tests...$(D)"
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/call_identifiers.scm function.call "call identifiers" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/call_methods.scm function.method "method callees" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/declaration_names.scm variable "declaration names" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/arrow_parameters.scm variable.parameter "arrow parameters" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/identifier_pair_keys.scm property "identifier object keys" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/label_names.scm label "labels" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/template_substitution_identifiers.scm variable "substitution identifiers" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/string_literals.scm string "strings" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/number_literals.scm number "numbers" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/declaration_names.scm local.definition.var "variable declarations" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/arrow_parameters.scm local.definition.parameter "arrow parameters" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/call_identifiers.scm local.reference "call identifiers" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/keywords.scm keyword "keyword tokens" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/punctuation_delimiters.scm punctuation.delimiter "punctuation delimiters" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/punctuation_brackets.scm punctuation.bracket "punctuation brackets" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/operators.scm operator "operators" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/comments.scm comment "comments" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/function_declaration_names.scm function.declaration "function declaration names" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/member_properties.scm property "member properties" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/expression_nodes.scm expression "expression nodes" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/constructors.scm constructor "constructors" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/scopes.scm local.scope "scopes" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/function_declaration_names.scm local.definition.function "function declarations" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/assignment_definitions.scm local.definition.var "assignment definitions" $(QUERY_EXECUTION_FIXTURES)
	@python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/locals.scm test/query/catch_parameters.scm local.definition.parameter "catch parameters" $(QUERY_EXECUTION_FIXTURES)
	@if python3 scripts/check_query_captures.py $(TS) $(QUERY_DIR)/highlights.scm test/query/call_identifiers.scm not.a.capture "wrong capture negative control" $(QUERY_EXECUTION_FIXTURES) >/dev/null 2>&1; then \
		echo "query execution check failed: wrong-capture negative control was accepted"; exit 1; \
	else \
		echo "rejected: wrong-capture negative control"; \
	fi
	@echo "$(YEL)* $(_SUCCESS) Query execution tests completed$(D)"

test-query-registration:	## Verify official queries are registered, packaged, and exported
	@echo "$(YEL)Running query registration checks...$(D)"
	@python3 scripts/check_query_registration.py
	@echo "$(YEL)* $(_SUCCESS) Query registration checks completed$(D)"

test-query: test-query-compile test-query-execution test-query-registration	## Compile, run, and check official queries against the fixtures
	@echo "$(YEL)Running query checks...$(D)"
	@for query in $(QUERIES); do \
		$(TS) query --quiet --grammar-path . "$$query" $(FIXTURES) || exit 1; \
	done
	@python3 scripts/check_query_determinism.py $(TS) $(QUERY_DIR)/highlights.scm $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
	@python3 scripts/check_locals_definitions_absent.py $(TS) $(QUERY_DIR)/locals.scm test/query/call_identifiers.scm "call identifier" $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
	@python3 scripts/check_locals_definitions_absent.py $(TS) $(QUERY_DIR)/locals.scm test/query/object_keys.scm "object key" $(FIXTURES) $(QUERY_DETERMINISM_FIXTURES)
	@echo "$(YEL)* $(_SUCCESS) Queries compiled, executed, and deterministic$(D)"

test-node:	## Run Node.js binding tests (requires a matching native ABI)
	@echo "$(YEL)Running Node.js binding tests...$(D)"
	@$(NPM) test
	@echo "$(YEL)* $(_SUCCESS) Node.js binding tests completed$(D)"

test-package:	## Verify npm package contents and metadata
	@echo "$(YEL)Checking npm package integrity...$(D)"
	@python3 scripts/check_package_integrity.py $(NPM)
	@echo "$(YEL)* $(_SUCCESS) npm package integrity check completed$(D)"

test-regressions:	## Verify recorded bugs have permanent regression artifacts
	@echo "$(YEL)Checking regression coverage...$(D)"
	@python3 scripts/check_regression_coverage.py $(REGRESSION_INVENTORY)
	@echo "$(YEL)* $(_SUCCESS) Regression coverage check completed$(D)"

parse:	## Parse files with the current parser (FILES=..., PARSE_FLAGS=...)
	@$(TS) parse $(PARSE_FLAGS) $(FILES)

##@ Verification ✅

check-generated:	## Verify committed parser artifacts match grammar.js
	@echo "$(YEL)Checking generated artifacts...$(D)"
	@$(TS) generate
	@git diff --exit-code HEAD -- $(PARSER) $(SRC_DIR)/grammar.json $(SRC_DIR)/node-types.json $(SRC_DIR)/tree_sitter || { \
		echo "$(RED)Generated artifacts are out of sync; run 'make generate'.$(D)"; \
		exit 1; \
	}
	@echo "$(YEL)* $(_SUCCESS) Generated artifacts are in sync$(D)"

verify: check-generated test test-query test-regressions	## Run the core CI gate (artifacts, corpus, queries, regressions)

verify-all: verify test-node test-package	## Run the core gate plus Node.js binding and package checks

ci: verify-all build	## Run the complete CI gate locally (requires npm ci first)

##@ Utility Rules 🛠

playground:	## Open the tree-sitter playground (npm prestart builds the WASM parser)
	@$(NPM) start

wasm:	## Build the WebAssembly parser
	@$(TS) build --wasm

local-install:	## Install official queries into the local nvim-treesitter directory
	@$(NPM) run local_install

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
