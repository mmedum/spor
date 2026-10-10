// The names a folded run of tool calls stands for: the file a read read,
// the command a shell call ran (searches are rg, grep or find there), what
// a fetch fetched or a web search asked; any other call by its tool.

import type { ToolGroupCall } from 'claude-code'
import { capped, isRecord, relative } from './text'

// One name in full, and whether every call of it failed or was cut short
// (a read that failed and then worked is no failure).
export type Name = { text: string; isFailed: boolean }

export function nameOf(call: ToolGroupCall, folder: string): string {
  const input = isRecord(call.input) ? call.input : {}
  const text = (field: string) => (typeof input[field] === 'string' ? input[field] : '')
  if (call.tool === 'Read' && text('file_path') !== '') {
    return relative(text('file_path'), folder)
  }
  if (call.tool === 'Bash' && text('command') !== '') {
    return commandLine(text('command'))
  }
  if (call.tool === 'WebFetch' && text('url') !== '') {
    return text('url').replace(/^https?:\/\//, '')
  }
  if (call.tool === 'WebSearch' && text('query') !== '') {
    return `"${text('query')}"`
  }

  return call.tool.startsWith('mcp__') ? call.tool.split('__').slice(2).join('__') : call.tool
}

// A command on one line: its first, with the lines a backslash continues
// joined on; a heredoc's body or the rest of a script after it is left out,
// marked "…". Blank lines and comments before it are passed over, unless
// the script is nothing else.
export function commandLine(command: string): string {
  const lines = command.replace(/\\\r?\n/g, ' ').split('\n')
  const isText = (line: string) => line.trim() !== ''
  const isCommand = (line: string) => isText(line) && !line.trim().startsWith('#')
  const start = lines.some(isCommand) ? lines.findIndex(isCommand) : Math.max(lines.findIndex(isText), 0)
  const [first = '', ...rest] = lines.slice(start)
  const line = first.replace(/\s+/g, ' ').trim()
  return rest.some(more => more.trim() !== '') ? `${line} …` : line
}

// Each name once, in the order first called.
export function namesOf(calls: readonly ToolGroupCall[], folder: string): Name[] {
  const names: Name[] = []
  for (const call of calls) {
    const text = nameOf(call, folder)
    const isFailed = call.isErrored || call.isInterrupted
    const seen = names.findIndex(one => one.text === text)
    if (seen === -1) {
      names.push({ text, isFailed })
    } else if (!isFailed) {
      names[seen] = { text, isFailed: false }
    }
  }

  return names
}

// The names in lines of `room` cells, a failed one marked ✗; a long run
// capped (see capped), its marker naming ctrl+o, Claude Code's own key for
// showing every call.
export function namesLines(names: readonly Name[], room: number): string[] {
  return capped(
    names.map(name => (name.isFailed ? `${name.text} ✗` : name.text)),
    room,
    { more: hidden => `… +${hidden} more (ctrl+o to expand)` },
  )
}
