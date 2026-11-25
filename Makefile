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

# Test inputs (override on the command line)
FILTER ?=
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

.PHONY: all build generate test test-query test-node parse playground wasm \
	local-install install uninstall clean check-generated verify verify-all \
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

test-query:	## Compile and run official queries against the fixtures
	@echo "$(YEL)Running query checks...$(D)"
	@for query in $(QUERIES); do \
		$(TS) query --quiet --grammar-path . "$$query" $(FIXTURES) || exit 1; \
	done
	@echo "$(YEL)* $(_SUCCESS) Queries compiled and executed$(D)"

test-node:	## Run Node.js binding tests (requires a matching native ABI)
	@echo "$(YEL)Running Node.js binding tests...$(D)"
	@$(NPM) test
	@echo "$(YEL)* $(_SUCCESS) Node.js binding tests completed$(D)"

parse:	## Parse files with the current parser (FILES=..., PARSE_FLAGS=...)
	@$(TS) parse $(PARSE_FLAGS) $(FILES)

##@ Verification ✅

check-generated:	## Verify committed parser artifacts match grammar.js
	@echo "$(YEL)Checking generated artifacts...$(D)"
	@$(TS) generate
	@git diff --exit-code -- $(PARSER) $(SRC_DIR)/grammar.json $(SRC_DIR)/node-types.json $(SRC_DIR)/tree_sitter || { \
		echo "$(RED)Generated artifacts are out of sync; run 'make generate'.$(D)"; \
		exit 1; \
	}
	@echo "$(YEL)* $(_SUCCESS) Generated artifacts are in sync$(D)"

verify: check-generated test test-query	## Run the core CI gate (artifacts, corpus, queries)

verify-all: verify test-node	## Run the core gate plus Node.js binding tests

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
