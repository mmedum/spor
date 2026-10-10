// Text as the transcript draws it: measured, split and wrapped in cells.

// A string is measured and cut by its code points, so it is spread into
// them here.
/* oxlint-disable typescript/no-misused-spread */

// Marks drawn on the character before them, and the joiners and selectors
// that shape a character without a cell of their own.
const NO_CELL = /^(?:\p{Mn}|\p{Me}|[\u200b-\u200f]|[\ufe00-\ufe0f])$/u

// Characters a terminal draws two cells wide: Chinese, Japanese and Korean
// script, their punctuation and full-width forms, and emoji drawn as emoji.
const TWO_CELLS =
  /^[\p{Emoji_Presentation}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff01-\uff60\uffe0-\uffe6]$/u

function cellsOf(char: string): number {
  if (NO_CELL.test(char)) {
    return 0
  }

  return TWO_CELLS.test(char) ? 2 : 1
}

export function cells(text: string): number {
  return [...text].reduce((sum, char) => sum + cellsOf(char), 0)
}

// Text split to fit `width` cells: the head and the rest, broken at the
// last space, or after the last slash or backslash, that keeps the head
// within it; a word wider than that is broken where it reaches `width`
// cells, never through a character, and after its first character at least.
export function splitAt(text: string, width: number): [string, string] {
  const chars = [...text]
  let fits = 0
  for (let used = 0; fits < chars.length; fits += 1) {
    used += cellsOf(chars[fits] ?? '')
    if (used > width) {
      break
    }
  }
  for (let at = Math.min(fits, chars.length - 1); at > 0; at -= 1) {
    if (chars[at] === ' ') {
      return [chars.slice(0, at).join(''), chars.slice(at + 1).join('')]
    }
    if (chars[at - 1] === '/' || chars[at - 1] === '\\') {
      return [chars.slice(0, at).join(''), chars.slice(at).join('')]
    }
  }
  const head = Math.max(fits, 1)

  return [chars.slice(0, head).join(''), chars.slice(head).join('')]
}

// Parts in lines of `room` cells, joined by ` · `, each line as many parts
// as fit. No part is cut or left out: one wider than a line breaks across
// lines whole (see splitAt).
export function wrapped(parts: readonly string[], room: number): string[] {
  const width = Math.max(room, 1)
  const lines: string[] = []
  let line = ''
  for (const part of parts) {
    const joined = line === '' ? part : `${line} · ${part}`
    if (cells(joined) <= width) {
      line = joined
      continue
    }
    if (line !== '') {
      lines.push(line)
    }
    let rest = part
    while (cells(rest) > width) {
      const [head, tail] = splitAt(rest, width)
      lines.push(head)
      rest = tail
    }
    line = rest
  }
  if (line !== '') {
    lines.push(line)
  }

  return lines
}

// The rows of items a capped list shows (see capped), as Claude Code shows
// three lines of a tool's output above its own `… +N lines` line.
export const ROWS = 3

// Items, then parts that always show, wrapped in lines of `room` cells: all
// of them while they take at most ROWS + 1 rows, so no row is hidden just to
// save one; past that, as many items as fill ROWS rows, the first always and
// whole however many rows it takes, then on a row of its own `more` with how
// many are hidden, followed by the parts. `suffix` goes on the last item
// shown, or on the marker.
export function capped(
  items: readonly string[],
  room: number,
  options: { more: (hidden: number) => string; suffix?: string; tail?: readonly string[] },
): string[] {
  const { more, suffix = '', tail = [] } = options
  const withSuffix = (parts: readonly string[]) => parts.map((part, i) => (i === parts.length - 1 ? `${part}${suffix}` : part))
  const all = wrapped([...withSuffix(items), ...tail], room)
  if (all.length <= ROWS + 1) {
    return all
  }
  let shown = 1
  while (shown < items.length - 1 && wrapped(items.slice(0, shown + 1), room).length <= ROWS) {
    shown += 1
  }
  if (shown >= items.length) {
    return all
  }

  return [...wrapped(items.slice(0, shown), room), ...wrapped([`${more(items.length - shown)}${suffix}`, ...tail], room)]
}

// A value's fields, when it is an object.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A path inside `folder` written relative to it, its parts parted by a
// slash or, on Windows, a backslash; any other as it is.
export function relative(path: string, folder: string): string {
  if (folder === '') {
    return path
  }
  if (path === folder) {
    return '.'
  }

  return path.startsWith(`${folder}/`) || path.startsWith(`${folder}\\`) ? path.slice(folder.length + 1) : path
}
