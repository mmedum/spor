import { describe, expect, test } from 'claude-code/testing'
import { call, closingLine, engine, group, lines, read, spor, started, tools, turn } from './kit'

describe('/spor', () => {
  test("off hides spor's lines already drawn, and on shows them again, each saying how spor stands", async ($, on) => {
    engine(on)
    tools(on)
    const logged = await started($, on)
    await turn($, 't1', 9_000, () => read($, 'src/a.ts'))
    const run = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' })])
    const closing = await closingLine($, 9_000)

    await spor($, 'off')
    expect(await lines(run)).toEqual(['Read 1 files'])
    expect(await lines(closing)).toEqual(['✻ Baked for 9s'])

    await spor($, 'on')
    expect(await lines(run)).toEqual(['Read 1 files', '  ⎿  src/a.ts'])
    expect(await lines(closing)).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
    expect(logged).toEqual([
      'off for this session: its lines are hidden. /spor on shows them again.',
      'on: its lines show again. /spor off hides them.',
    ])
  })

  test('alone, says whether spor is on and changes nothing', async ($, on) => {
    engine(on)
    const logged = await started($, on)
    const run = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' })])

    await spor($)
    expect(await lines(run)).toEqual(['Read 1 files', '  ⎿  src/a.ts'])
    await spor($, 'off')
    await spor($)
    expect(await lines(run)).toEqual(['Read 1 files'])
    expect(logged).toEqual([
      "on. The dim lines under folded runs and under each turn's closing line are spor's. /spor off hides them.",
      'off for this session: its lines are hidden. /spor on shows them again.',
      'off for this session. /spor on shows its lines again.',
    ])
  })

  test('says so when spor already stands as asked', async ($, on) => {
    engine(on)
    const logged = await started($, on)

    await spor($, 'on')
    await spor($, 'off')
    await spor($, 'off')

    expect(logged).toEqual([
      'already on. /spor off hides its lines.',
      'off for this session: its lines are hidden. /spor on shows them again.',
      'already off. /spor on shows its lines again.',
    ])
  })

  test('answers anything else with how to use it, and changes nothing', async ($, on) => {
    engine(on)
    const logged = await started($, on)
    const run = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' })])

    await spor($, 'toggle')

    expect(await lines(run)).toEqual(['Read 1 files', '  ⎿  src/a.ts'])
    expect(logged).toEqual(["/spor takes on or off, or nothing to say whether it's on. To turn spor off for good: claude plugin disable spor@spor"])
  })

  test('takes on and off in any case, with spaces around', async ($, on) => {
    engine(on)
    const logged = await started($, on)

    await spor($, '  OFF ')

    expect(logged).toEqual(['off for this session: its lines are hidden. /spor on shows them again.'])
  })

  test('still tallies the turns that run while off, and shows them once on', async ($, on) => {
    engine(on)
    tools(on)
    await started($, on)

    await spor($, 'off')
    await turn($, 't1', 9_000, () => read($, 'src/a.ts'))
    await spor($, 'on')

    expect(await lines(await closingLine($, 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
  })

  test('stays off after /clear, /resume and /branch', async ($, on) => {
    engine(on)
    await started($, on)
    const run = await group($, [call('Read', { file_path: '/home/demo/app/src/a.ts' })])

    await spor($, 'off')
    for (const source of ['clear', 'resume', 'fork'] as const) {
      await $.classic.SessionStart({ source })
      expect(await lines(run)).toEqual(['Read 1 files'])
    }
  })
})
