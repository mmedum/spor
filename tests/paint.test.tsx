import { describe, expect, test } from 'claude-code/testing'
import { colorOf } from '../hooks/paint'
import { call, closingLine, engine, group, read, tools, turn } from './kit'

describe('colors', () => {
  test("reads a color as Claude Code's custom themes spell one, and falls back on anything else", () => {
    const cases: [unknown, string][] = [
      ['inactive', 'inactive'],
      ['claude', 'claude'],
      ['briefLabelClaude', 'briefLabelClaude'],
      ['inactiveShimmer', 'inactiveShimmer'],
      ['blue_FOR_SUBAGENTS_ONLY', 'blue_FOR_SUBAGENTS_ONLY'],
      ['rainbow_violet_shimmer', 'rainbow_violet_shimmer'],
      ['cyan', 'ansi256(6)'],
      ['redBright', 'ansi256(9)'],
      ['gray', 'ansi256(8)'],
      [' #F80 ', '#ff8800'],
      ['#7AA2F7', '#7aa2f7'],
      ['rgb(122, 162, 247)', '#7aa2f7'],
      ['rgb(255, 255, 255)', '#ffffff'],
      ['ansi256(0)', 'ansi256(0)'],
      ['ansi256( 110 )', 'ansi256(110)'],
      ['ansi256(255)', 'ansi256(255)'],
      ['ansi:black', 'ansi256(0)'],
      ['ansi:cyan', 'ansi256(6)'],
      [' ansi:blackBright ', 'ansi256(8)'],
      ['ansi:whiteBright', 'ansi256(15)'],
      ['ansi:grey', 'ansi256(8)'],
      ['rgb(256, 0, 0)', 'inactive'],
      ['ansi256(256)', 'inactive'],
      ['ansi:teal', 'inactive'],
      ['#12345', 'inactive'],
      ['nonsense', 'inactive'],
      [42, 'inactive'],
    ]
    for (const [value, expected] of cases) {
      expect(colorOf(value, 'inactive')).toBe(expected)
    }
  })

  test("draws the names under a folded run in Claude Code's color for hints and timestamps", async ($, on) => {
    engine(on)
    const ui = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' })])

    expect((await ui.find({ type: 'Text', text: '  ⎿  src/a.ts' }))?.props).toEqual({ color: 'inactive' })
  })

  // An ansi: name, which Claude Code refuses as written: the whole row
  // would fall back to its own drawing.
  test('draws the names, a ✗ too, in the Names color option', { options: { namesColor: 'ansi:cyan' } }, async ($, on) => {
    engine(on)
    const ui = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' }, { isErrored: true })])

    expect((await ui.find({ type: 'Text', text: '  ⎿  src/a.ts ✗' }))?.props).toEqual({ color: 'ansi256(6)' })
  })

  test("draws a turn's tally in Claude Code's color for hints and timestamps", async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 3_000, () => read($, 'src/a.ts'))

    expect((await (await closingLine($, 't1', 3_000)).find({ type: 'Text', text: '  ⎿  read 1' }))?.props).toEqual({ color: 'inactive' })
  })

  test('draws the tally in the Tally color option', { options: { tallyColor: 'rgb(122,162,247)' } }, async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 3_000, () => read($, 'src/a.ts'))

    expect((await (await closingLine($, 't1', 3_000)).find({ type: 'Text', text: '  ⎿  read 1' }))?.props).toEqual({ color: '#7aa2f7' })
  })

  test("leaves the default for a color spor can't read", { options: { namesColor: 'teal', tallyColor: '#12345' } }, async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 3_000, () => read($, 'src/a.ts'))
    const names = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' })])
    const tally = await closingLine($, 't1', 3_000)

    expect((await names.find({ type: 'Text', text: '  ⎿  src/a.ts' }))?.props).toEqual({ color: 'inactive' })
    expect((await tally.find({ type: 'Text', text: '  ⎿  read 1' }))?.props).toEqual({ color: 'inactive' })
  })
})
