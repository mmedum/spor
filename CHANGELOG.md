# Changelog

Notable changes to spor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and spor uses [Semantic Versioning](https://semver.org/). While it is on 0.x, what it shows may change between minor versions.

## [Unreleased]

## [0.2.1] - 2026-10-11

### Fixed

- `/spor` and the README no longer call spor's lines dim, which they aren't once Names color or Tally color sets another color; only the screenshot's description, of the default look, still does.
- A short hex color, such as `#f80`, now goes to Claude Code as `#ff8800`, as an `rgb()` color does, so it no longer depends on how Claude Code reads short hex.
- Only color names, `ansi:` names and `ansi256()` from 0 to 15 follow the terminal's own palette. The README, and the notes for 0.2.0, said every `ansi256()` color did.

## [0.2.0] - 2026-10-11

### Added

- Names color and Tally color options, set in `/config` or with `/plugin configure spor@spor`, for the lines under a folded run and under a turn's closing line. Each takes a theme role or a color, and by default follows `/theme` as before.
- In a color option, a color name, `ansi256(n)` and `ansi:<name>` are drawn in the terminal's own palette.

## [0.1.1] - 2026-10-10

### Fixed

- Two turns that took as long, to the millisecond, shared one tally. Each turn's tally now goes under the line that closes it.
- A run whose only name took more than four lines showed just `… +1 more`. The first name now always shows whole.
- Chinese, Japanese and Korean characters and emoji count as two cells, and an accent written apart from its letter as none, so a line of names no longer runs past the edge of the terminal.
- On Windows, paths are written relative to the session's folder and break after a backslash.
- A command that starts with blank lines or comments is named by its first line that runs.

## [0.1.0] - 2026-10-10

### Added

- Under each folded run of reads and searches, the files read and the commands run, in full, wrapped onto dim lines; a long run shows three lines of names, then `… +N more (ctrl+o to expand)` on a line of its own.
- Under each turn's closing line, what the turn did: the files it changed, by name, with the lines added and removed, and how many files it read and commands it ran, capped the same way.
- `/spor` says whether spor's lines are on. `/spor off` hides them, those already drawn too, and `/spor on` shows them again; the switch lasts for the session.

[Unreleased]: https://github.com/mmedum/spor/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/mmedum/spor/releases/tag/v0.2.1
[0.2.0]: https://github.com/mmedum/spor/releases/tag/v0.2.0
[0.1.1]: https://github.com/mmedum/spor/releases/tag/v0.1.1
[0.1.0]: https://github.com/mmedum/spor/releases/tag/v0.1.0
