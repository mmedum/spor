// spor puts back the trail Claude Code folds away in the transcript: under
// each folded run of reads and searches, the files and commands it stands
// for, and under the line that closes a turn, what the turn did.

import type { Register } from 'claude-code'
import { atom, read, update } from 'claude-code'
import type { Summary, Tallies } from '../types'
import { namesLines, namesOf } from './names'
import { colorOf } from './paint'
import { EMPTY, counted, summaryLines, summaryOf } from './tally'
import { cells } from './text'

const turn = atom({ plugin: 'spor', key: 'turn' } as const, null)
const tallies = atom({ plugin: 'spor', key: 'tallies' } as const, { kept: {}, summary: null, row: null })
const isShown = atom({ plugin: 'spor', key: 'isShown' } as const, true)

// The finished turns' tallies kept, the newest; older closing lines draw
// as Claude Code draws them.
const TALLIES_KEPT = 200

// A turn's summary and the row that closes it arrive in either order: the
// second to come keeps the summary under the row's id, the newest kept.
// Each of these is one write, so the two can't miss each other.
function withSummary(now: Tallies, summary: Summary | null): Tallies {
  if (now.row === null) {
    return { ...now, summary }
  }

  return { kept: summary === null ? now.kept : kept(now.kept, now.row, summary), summary: null, row: null }
}
function withRow(now: Tallies, row: string): Tallies {
  if (now.summary === null) {
    return { ...now, row }
  }

  return { kept: kept(now.kept, row, now.summary), summary: null, row: null }
}
function kept(all: Tallies['kept'], row: string, summary: Summary): Tallies['kept'] {
  return Object.fromEntries([...Object.entries(all), [row, summary]].slice(-TALLIES_KEPT))
}

// How spor's lines start, as a tool's result does under its row, and how
// a line that goes on from the one above starts.
const LEAD = '  ⎿  '
const ON = ' '.repeat(cells(LEAD))

// Whether the person last asked for spor's lines on or off, for state
// that starts over at /clear.
let isShownNow = true

// What /spor answers, from what was asked and whether the lines showed.
// Claude Code puts "spor: " before it.
function answerTo(asked: string, was: boolean): string {
  switch (asked) {
    case '':
      return was
        ? "on. The lines under folded runs and under each turn's closing line are spor's. /spor off hides them."
        : 'off for this session. /spor on shows its lines again.'
    case 'on':
      return was ? 'already on. /spor off hides its lines.' : 'on: its lines show again. /spor off hides them.'
    case 'off':
      return was ? 'off for this session: its lines are hidden. /spor on shows them again.' : 'already off. /spor on shows its lines again.'
    default:
      return "/spor takes on or off, or nothing to say whether it's on. To turn spor off for good: claude plugin disable spor@spor"
  }
}

export const register: Register = (on, options) => {
  // The Names color and Tally color options, by default Claude Code's own
  // color for hints and timestamps.
  const namesColor = colorOf(options.namesColor, 'inactive')
  const tallyColor = colorOf(options.tallyColor, 'inactive')

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'spor',
      description: "Show whether spor's lines are on, or turn them on or off for this session",
      argumentHint: '[on|off]',
      immediate: true,
    })
    return next(e)
  })

  // /spor says whether spor is on; /spor on and /spor off switch it, and
  // say how it stands after. The answer is a dim line Claude doesn't read.
  on('command.run', { command: 'spor' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const was = await read($, isShown)
    if (asked === 'on' || asked === 'off') {
      isShownNow = asked === 'on'
      await update($, isShown, () => isShownNow)
    }
    $.ui.log(answerTo(asked, was))
    return {}
  })

  // /clear, /resume and /branch put spor's state back to how it starts,
  // and the person's switch outlives them.
  on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => {
    await update($, isShown, () => isShownNow)
    return next(e)
  })

  // A folded run: Claude Code's own line, and under it the names it stands
  // for, a long run capped at a few lines. Unfolded (ctrl+o, --verbose),
  // each call shows its own row.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const drawn = await next(e)
    if (e.props.isExpanded || !(await read($, isShown))) {
      return drawn
    }
    const names = namesOf(e.props.calls, await $.session.cwd().catch(() => ''))
    if (names.length === 0) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const room = (e.viewport?.columns ?? 80) - cells(LEAD)
    return (
      <Box flexDirection="column">
        {drawn}
        {namesLines(names, room).map((line, i) => (
          <Text color={namesColor}>
            {i === 0 ? LEAD : ON}
            {line}
          </Text>
        ))}
      </Box>
    )
  })

  // The main conversation's turns: a subagent's run raises no turn.start.
  on('turn.start', async ($, e, next) => {
    await update($, turn, () => EMPTY)
    await update($, tallies, now => ({ ...now, summary: null, row: null }))
    return next(e)
  })

  // Each call of the main conversation counts once it has finished; a
  // subagent's calls belong to its own transcript. The call itself passes
  // on untouched.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined && ran.deny === undefined && ran.isError !== true) {
      try {
        await update($, turn, now => (now === null ? now : counted(now, e.tool, e, ran.result)))
      } catch {
        // A count that fails leaves the turn's tally as it was.
      }
    }

    return ran
  })

  // A finished turn's tally goes under the row that closes it, which Claude
  // Code adds as the turn completes, before this or after.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      const done = await read($, turn)
      const summary = done === null ? null : summaryOf(done, await $.session.cwd().catch(() => ''))
      await update($, tallies, now => withSummary(now, summary))
      await update($, turn, () => null)
    }

    return next(e)
  })

  // The row that closes a turn of the main conversation, whose id its
  // closing line is drawn with. Every row passes on unchanged, its content
  // unread.
  on('session.append', async ($, e, next) => {
    if (e.agentId === undefined && e.message.type === 'system' && e.message.name === 'turn_duration') {
      await update($, tallies, now => withRow(now, e.uuid))
    }

    return next(e)
  })

  // The line that closes a turn, and under it what the turn did, capped
  // like the names. Beside it the tally would wrap badly: Claude
  // Code's line takes more room than its text.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const summary = (await read($, tallies)).kept[e.requestId]
    const drawn = await next(e)
    if (summary === undefined || !(await read($, isShown))) {
      return drawn
    }

    const { Box, Text } = $.ui.resolve(e)
    const room = (e.viewport?.columns ?? 80) - cells(LEAD)
    return (
      <Box flexDirection="column">
        {drawn}
        {summaryLines(summary, room).map((line, i) => (
          <Text color={tallyColor}>
            {i === 0 ? LEAD : ON}
            {line}
          </Text>
        ))}
      </Box>
    )
  })
}
