// What the test files share: Claude Code's side beneath spor, and the rows
// it asks spor to draw.

import type { On, ToolGroupCall } from 'claude-code'
import type { ElementQuery, Engine, FoundElement } from 'claude-code/testing'

export const FOLDER = '/home/demo/app'

// Beneath spor: the session's folder, and Claude Code's own drawing of a
// folded run and of a turn's closing line, one line of text each.
export function engine(on: On, folder = FOLDER) {
  on('session.cwd', () => ({ value: folder }))
  on('ui.render', { component: 'ToolGroup' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{`Read ${e.props.calls.length} files`}</Text>
  })
  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{`✻ ${e.props.word} for ${e.props.durationMs / 1000}s`}</Text>
  })
}

// One call of a folded run, finished.
export function call(tool: string, input: Record<string, unknown>, { isErrored = false } = {}): ToolGroupCall {
  return { tool, input, isRunning: false, isErrored, isInterrupted: false }
}

// A folded run (or one ctrl+o unfolded) as the transcript asks for it, in a
// terminal `columns` wide.
export function group($: Engine, calls: ToolGroupCall[], { isExpanded = false, columns = 120 } = {}) {
  return $.ui.mount({
    plugin: 'spor',
    surface: 'terminal',
    component: 'ToolGroup',
    props: { calls, isActive: false, isExpanded },
    viewport: { columns, rows: 40 },
  })
}

// The id of the row that closes a turn, which its closing line is drawn
// with.
export const closingRow = (turnId: string) => `closing-${turnId}`

// A turn's closing line, in a terminal `columns` wide.
export function closingLine($: Engine, turnId: string, durationMs: number, { columns = 80 } = {}) {
  return $.ui.mount({
    plugin: 'spor',
    surface: 'terminal',
    component: 'TurnDuration',
    requestId: closingRow(turnId),
    props: { word: 'Baked', durationMs },
    viewport: { columns, rows: 40 },
  })
}

// The lines a mounted row draws.
export async function lines(ui: { findAll: (query: ElementQuery) => Promise<FoundElement[]> }): Promise<string[]> {
  return (await ui.findAll({ type: 'Text' })).map(text => text.text)
}

// Beneath spor: turns that start and end, and the tools a turn calls, each
// answering with the record Claude Code's own tool would.
export function tools(on: On) {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', { tool: 'Read' }, () => ({
    result: { type: 'text', file: { filePath: '', content: '', numLines: 0, startLine: 1, totalLines: 0 } },
  }))
  on('tool.call', { tool: 'Bash' }, (_$, e) =>
    e.command === 'false' ? { result: 'Exit code 1', isError: true } : { result: { stdout: '', stderr: '', interrupted: false } },
  )
  on('tool.call', { tool: 'Edit' }, (_$, e) => ({
    result: {
      filePath: e.file_path,
      oldString: e.old_string,
      newString: e.new_string,
      originalFile: '',
      structuredPatch: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 3, lines: [' ctx', '-old', '+new', '+more'] }],
      userModified: false,
      replaceAll: false,
      ...(e.file_path.endsWith('held.ts') ? { staged: true } : {}),
    },
  }))
  on('tool.call', { tool: 'Write' }, (_$, e) => ({
    result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null },
  }))
}

export const read = ($: Engine, path: string, agentId?: string) =>
  $.tool.call({ tool: 'Read', file_path: `/home/demo/app/${path}`, ...(agentId === undefined ? {} : { agentId }) })
export const edit = ($: Engine, path: string) =>
  $.tool.call({ tool: 'Edit', file_path: `/home/demo/app/${path}`, old_string: 'old', new_string: 'new\nmore' })
export const run = ($: Engine, command: string) => $.tool.call({ tool: 'Bash', command })
// The row Claude Code adds to the conversation to close a turn, and another
// notice, by its kind.
export const closes = ($: Engine, turnId: string) => notice($, closingRow(turnId), 'turn_duration')
export const notice = ($: Engine, uuid: string, name: string) =>
  $.session.append({ door: 'notice', origin: { kind: 'engine' }, uuid, message: { type: 'system', name, content: [] } })

// A turn of the main conversation, then the row that closes it. Claude Code
// adds that row as the turn completes, before spor's hook on it is done or
// after.
export const turn = async ($: Engine, turnId: string, durationMs: number, calls: () => Promise<unknown>) => {
  await $.turn.start({ text: '', turnId })
  await calls()
  await $.turn.complete({ answer: '', durationMs, isAborted: false, turnId, reason: 'answer' })
  await closes($, turnId)
}

// A session started as Claude Code starts one, and the dim lines spor logs
// into its transcript.
export async function started($: Engine, on: On): Promise<string[]> {
  const logged: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('classic.SessionStart', () => ({}))
  on('ui.log', (_$, e) => {
    logged.push(e.text)
    return { value: undefined }
  })
  await $.session.start({ cwd: FOLDER, surface: 'terminal', isInteractive: true })
  return logged
}

// /spor and what follows it, typed at the prompt.
export function spor($: Engine, args = '') {
  return $.command.run({ command: 'spor', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } })
}
