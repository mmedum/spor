# Security policy

## Supported versions

Only the latest release gets fixes.

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub instead: [report a vulnerability](https://github.com/mmedum/spor/security/advisories/new), under the repository's Security tab.

Say which spor and Claude Code versions you use, what someone could do with the problem, and how to reproduce it. spor is maintained by one person, so allow a few days for an answer.

## What counts

spor runs inside Claude Code with your permissions. These are in scope:

- spor reading, running, writing or sending anything that [How it works](README.md#how-it-works) doesn't list.
- spor changing a tool call or its result. It must always hand both on unchanged.
- A transcript row that spor draws showing something it shouldn't, such as content from another session.

A problem in Claude Code itself goes to Anthropic, through [Claude Code's security policy](https://github.com/anthropics/claude-code/blob/main/SECURITY.md).
