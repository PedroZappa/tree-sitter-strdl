# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.2] - 2026-11-26

### Fixed

- Release publishing: removed the unsupported `attestations` input from the upstream GitHub release workflow. It caused every tag-triggered `Publish packages` run to fail at startup before the GitHub release, npm, crates.io, or PyPI jobs could start.
- Release publishing: pass the correct `tree-sitter-strudel` package name to the npm, crates.io, and PyPI reusable workflows so their environment links point at the published artifacts.

## [2.0.1] - 2026-11-26

### Fixed

- CI/publish `test-generated-runtime`: allow network installs in the generated-runtime check script (removed forced offline npm install) so `node-addon-api` and related deps can be fetched when not present in a restricted cache.

## [2.0.0] - 2026-11-26

### Added

- Changelog and release notes maintenance guidance for the project.
- Documentation for Phase 8 procedures, including build/generation, testing, benchmarking, contribution workflow, and CI validation coverage.
- Release workflow gates that verify generated artifacts and package contents before publication jobs run.

### Changed

- Documentation, roadmap, and release process verified/documented for Phase 8 readiness (tag-only publishing, publish gates, changelog process).

## [1.4.0] - 2025-11-25

### Changed

- Phase 4 closeout updates for error recovery and incremental parsing verification.

## [1.3.0] - 2025-11-25

### Changed

- Phase 3 language coverage refactor and grammar/CST updates recorded in project documentation.

## [1.2.0] - 2025-11-25

### Changed

- Phase 1 repository audit documentation and baseline tracking updates.

## [1.1.8] - 2025-11-25

### Changed

- Release packaging and publishing workflow updates.

## [1.1.7] - 2025-11-25

### Changed

- Publishing workflow generation and release automation updates.

## [1.1.6] - 2025-11-25

### Changed

- Publishing workflow generation and release automation updates.

## [1.1.5] - 2025-11-25

### Changed

- Publishing workflow generation and release automation updates.

## [1.1.4] - 2025-11-25

### Changed

- Publishing workflow generation updates.

## [1.1.3] - 2025-11-25

### Changed

- Publishing workflow generation updates.

## [1.1.2] - 2025-11-25

### Changed

- Publishing workflow generation updates.

## [1.1.1] - 2025-11-25

### Changed

- Release metadata and packaging updates.

## [1.1.0] - 2025-11-25

### Added

- Initial 1.1 release line updates.

## [1.0.1] - 2025-11-25

### Changed

- Stopped committing generated parser artifacts in normal workflows.

## [1.0.0] - 2025-11-25

### Added

- Initial release.
