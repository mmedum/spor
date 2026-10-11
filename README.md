# spor

Puts back what Claude Code folds away in the transcript: the files Claude read and the commands it searched with, and what each turn did.

[![CI](https://github.com/mmedum/spor/actions/workflows/ci.yml/badge.svg)](https://github.com/mmedum/spor/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/v/release/mmedum/spor?label=release)](https://github.com/mmedum/spor/releases/latest)

_spor_ is Danish for tracks, the kind you can read: what someone left behind as they passed. Its icon says the same: the steps stay, and the latest one is lit.

Claude Code folds runs of reads and searches into one count line, like `Read 3 files, ran 1 shell command`. That keeps the transcript short, but it hides what you most want to check: which files Claude looked at, and what it searched for. spor adds one line under each folded run with the names, and one under each turn's closing line with what the turn did:

![The same turn in Claude Code twice. Without spor, the folded line says only "Searched for 1 pattern, read 1 file". With spor, a dim line under it names the search command and the file, and a dim line under the turn's closing line says "changed src/config.ts (+1 −1) · read 1 · ran 1".](docs/screenshot.png)

Nothing else changes. There's no pane and no band, ctrl+o still shows every call in full, and `/spor off` hides spor's lines whenever you want Claude Code's own view.

## Install

```text
/plugin install spor --marketplace mmedum/spor
```

Tested with Claude Code 2.1.295 in a terminal. Mods don't draw in the VS Code panel or with `-p`.

Third-party marketplaces don't update on their own. To update, run `claude plugin update spor@spor` and restart Claude Code. To remove spor, run `claude plugin uninstall spor@spor`.

## What it shows

- **Under a folded run:** each file read, as a path relative to the session's folder; each shell command by its first line, past any blank lines and comments before it (a heredoc's body is left out, marked `…`); a fetched address, a web search's question, or any other call by its tool. Each name shows once, in the order Claude first used it, and one that failed every time is marked `✗`. While a run is still going in the terminal, spor leaves it to Claude Code, which shows the latest call under its own line; spor's line, with every name, appears once the run ends. Names are never shortened: when they don't fit on one line, they wrap onto more lines, and a name wider than a line breaks at a space or after a slash. A long run shows three lines of names, then a line of its own, `… +N more (ctrl+o to expand)`, with N the names left out, as Claude Code itself folds long output; when one more line would show them all, it shows them all, and its first name always shows whole, however many lines it takes. ctrl+o is Claude Code's default key; a mod can't read a rebound one.
- **Under a turn's closing line:** the files the turn changed, by name, with the lines added and removed, then how many files it read and how many shell commands it ran. Only the main conversation counts; a subagent's calls belong to its own transcript. An edit held for review, a refused call and a failed one aren't counted. A turn that touched nothing gets no line. A turn that changed many files is capped like the names, its last line carrying the rest, as in `… +3 more (+16 −8) · read 2 · ran 1`; the counts always show.
- **In your theme's color:** by default spor's lines take Claude Code's own color for hints and timestamps, the `inactive` role, so they follow `/theme`, light or dark. In `/config` or with `/plugin configure spor@spor`, two options take another role, such as `claude` or `success`, or a color: `#7aa2f7`, `rgb(122,162,247)`, `ansi256(110)` or `ansi:cyan`. Names color paints the lines under a folded run, `✗` marks and all, and Tally color the lines under a turn's closing line. A value spor can't read leaves the default. To restyle quiet text all over Claude Code, override `inactive` in a [custom theme](https://code.claude.com/docs/en/terminal-config#create-a-custom-theme) instead; a hex or `rgb()` color doesn't follow light or dark themes, while color names, `ansi:` names and `ansi256()` from 0 to 15 follow your terminal's own palette.

The tallies cover the turns of this session since spor loaded. After `/clear` or `/resume`, older turns' closing lines show as Claude Code draws them.

## Turning it off

```text
/spor        says whether spor is on
/spor off    hides spor's lines
/spor on     shows them again
```

`/spor off` hides spor's lines on screen, those already drawn too, and `/spor on` brings them back. Turns that run while it's off are still tallied, so their lines show once it's on. The switch lasts for the session, through `/clear`, and a new session starts with spor on. To turn spor off for good, run `claude plugin disable spor@spor`.

`/spor` answers with a dim line that Claude doesn't read, and works while Claude is busy.

spor adds to the rows Claude Code draws. A mod that redraws a folded run or a turn's closing line as a whole, and doesn't pass the row on to the mods after it, hides spor's lines when it runs before spor. Some skin mods do this. If spor's lines don't show, check for such a mod with `/plugin`.

## How it works

Mods run with your permissions, so here is everything spor touches. `claude plugin validate` lists the same.

### What it reads

- The main conversation's tool calls as they finish, through the mod API: the tool, its input and its result.
- The calls of each folded run as the transcript draws it, whether the run is still going, and whether it's drawn in a terminal, to name them under it.
- The session's folder (`$.session.cwd`), to write paths relative to it.
- What you type after `/spor`, and the Names color and Tally color options.
- The kind and id of each row added to the conversation, to find the one that closes a turn and put the turn's tally under it. spor never reads a row's content.

### What it runs and writes

Nothing. spor runs no programs, reads no files, writes no files, makes no network requests and uses no plugin store. Each turn's tally, and whether you turned spor off, live in the session's own state and go with it.

### What its hooks change

- Two kinds of transcript rows: a folded run gets a line of names under Claude Code's own line, and a turn's closing line gets the tally under it. An unfolded run (ctrl+o, `--verbose`) is left as Claude Code draws it, and so is a run still going in the terminal.
- Its hook on tool calls only counts what passes, after the call has run, and hands the call and its result on unchanged. Its hooks on a turn's start and end only note the turn.
- Its hook on rows added to the conversation only notes the id of the row that closes a turn, and hands every row on unchanged.
- It adds the `/spor` command, which answers with a dim line in the transcript. Its hook on a session restarting (`/clear`, `/resume`, `/branch`) only puts the switch back as you left it.

## Privacy

spor collects no data about you and sends nothing anywhere. It runs only on your machine, inside Claude Code, and keeps nothing after the session ends.

## Contributing

Questions and bugs: [open an issue](https://github.com/mmedum/spor/issues). For a pull request, open an issue first. [CONTRIBUTING.md](CONTRIBUTING.md) says how to run, test and release spor. To report a security problem, see [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE) © 2026 Mark Medum Bundgaard
