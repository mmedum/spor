# Changelog

Notable changes to spor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and spor uses [Semantic Versioning](https://semver.org/). While it is on 0.x, what it shows may change between minor versions.

## [Unreleased]

## [0.1.0] - 2026-10-10

### Added

- Under each folded run of reads and searches, the files read and the commands run, in full, wrapped onto dim lines; a long run shows three lines of names, then `… +N more (ctrl+o to expand)` on a line of its own.
- Under each turn's closing line, what the turn did: the files it changed, by name, with the lines added and removed, and how many files it read and commands it ran, capped the same way.
- `/spor` says whether spor's lines are on. `/spor off` hides them, those already drawn too, and `/spor on` shows them again; the switch lasts for the session.

[Unreleased]: https://github.com/mmedum/spor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mmedum/spor/releases/tag/v0.1.0
