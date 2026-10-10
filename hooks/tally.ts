// What a turn did, counted from the main conversation's tool calls: the
// files it read, the files it changed with the lines added and removed,
// and the shell commands it ran.

import type { Summary, Tally } from '../types'
import { capped, isRecord, relative } from './text'

export const EMPTY: Tally = { read: [], edited: [], added: 0, removed: 0, ran: 0 }

// The tally with one finished call counted: `input` as the call was made,
// `result` the tool's own record. An edit held for review (staged) changed
// nothing, so it isn't counted.
export function counted(tally: Tally, tool: string, input: unknown, result: unknown): Tally {
  const args = isRecord(input) ? input : {}
  const record = isRecord(result) ? result : {}
  if (tool === 'Read' && typeof args.file_path === 'string') {
    return { ...tally, read: withItem(tally.read, args.file_path) }
  }
  if (tool === 'Bash') {
    return { ...tally, ran: tally.ran + 1 }
  }
  if ((tool === 'Edit' || tool === 'Write') && record.staged !== true) {
    const path = typeof record.filePath === 'string' ? record.filePath : args.file_path
    if (typeof path !== 'string') {
      return tally
    }
    const lines = changedLines(record)
    return { ...tally, edited: withItem(tally.edited, path), added: tally.added + lines.added, removed: tally.removed + lines.removed }
  }
  if (tool === 'NotebookEdit' && typeof args.notebook_path === 'string') {
    return { ...tally, edited: withItem(tally.edited, args.notebook_path) }
  }

  return tally
}

// The lines an edit or a write added and removed, from its patch; a new
// file written whole, from its content where the patch is empty.
export function changedLines(record: Record<string, unknown>): { added: number; removed: number } {
  const hunks = Array.isArray(record.structuredPatch) ? record.structuredPatch : []
  const lines = hunks.flatMap((hunk: unknown) => (isRecord(hunk) && Array.isArray(hunk.lines) ? hunk.lines : []))
  if (lines.length === 0 && record.type === 'create' && typeof record.content === 'string') {
    const content = record.content.endsWith('\n') ? record.content.slice(0, -1) : record.content
    return { added: content === '' ? 0 : content.split('\n').length, removed: 0 }
  }

  return {
    added: lines.filter(line => typeof line === 'string' && line.startsWith('+')).length,
    removed: lines.filter(line => typeof line === 'string' && line.startsWith('-')).length,
  }
}

// What the turn did, as its line under the closing line shows it: the files
// it changed, by name (relative to `folder` when inside it), the lines they
// gained and lost, and how many files it read and commands it ran; null when
// it did none of these.
export function summaryOf(tally: Tally, folder: string): Summary | null {
  const changed = tally.edited.map(path => relative(path, folder))
  const lines = tally.added + tally.removed > 0 ? `(+${tally.added} −${tally.removed})` : ''
  const counts = [...(tally.read.length > 0 ? [`read ${tally.read.length}`] : []), ...(tally.ran > 0 ? [`ran ${tally.ran}`] : [])]

  return changed.length + counts.length === 0 ? null : { changed, lines, counts }
}

// The summary in lines of `room` cells, as in `changed src/api.ts ·
// src/db/pool.ts (+41 −7) · read 6 · ran 2`; many changed files capped (see
// capped), the counts always shown.
export function summaryLines(summary: Summary, room: number): string[] {
  return capped(
    summary.changed.map((name, i) => (i === 0 ? `changed ${name}` : name)),
    room,
    { more: hidden => `… +${hidden} more`, suffix: summary.lines === '' ? '' : ` ${summary.lines}`, tail: summary.counts },
  )
}

function withItem(list: string[], item: string): string[] {
  return list.includes(item) ? list : [...list, item]
}
