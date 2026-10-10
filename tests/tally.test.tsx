import { describe, expect, test } from 'claude-code/testing'
import { closes, closingLine, edit, engine, lines, notice, read, run, tools, turn } from './kit'

describe("under a turn's closing line", () => {
  test('names the files the turn changed with the lines added and removed, then counts the files read and commands run', async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 41_000, async () => {
      await read($, 'src/a.ts')
      await read($, 'src/a.ts')
      await read($, 'src/b.ts')
      await edit($, 'src/a.ts')
      await $.tool.call({ tool: 'Write', file_path: '/home/demo/app/src/new.ts', content: 'one\ntwo\nthree\n' })
      await run($, 'npm test')
      await run($, 'git status')
    })

    expect(await lines(await closingLine($, 't1', 41_000))).toEqual([
      '✻ Baked for 41s',
      '  ⎿  changed src/a.ts · src/new.ts (+5 −1) · read 2 · ran 2',
    ])
  })

  test('wraps a turn that changed many files onto more lines, a file outside the folder named whole', async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 20_000, async () => {
      await edit($, 'src/server/handlers/authentication.ts')
      await edit($, 'src/server/handlers/authorization.ts')
      await $.tool.call({ tool: 'Edit', file_path: '/home/demo/other/config.ts', old_string: 'old', new_string: 'new\nmore' })
      await $.tool.call({ tool: 'Write', file_path: '/home/demo/app/docs/notes.md', content: 'one\ntwo\n' })
      await run($, 'npm test')
    })

    // 60 columns less the lead's 5 leave 55 cells.
    expect(await lines(await closingLine($, 't1', 20_000, { columns: 60 }))).toEqual([
      '✻ Baked for 20s',
      '  ⎿  changed src/server/handlers/authentication.ts',
      '     src/server/handlers/authorization.ts',
      '     /home/demo/other/config.ts · docs/notes.md (+8 −3)',
      '     ran 1',
    ])
  })

  test('caps a turn that changed many files at three rows, then a row with how many more, the lines and the counts', async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 25_000, async () => {
      for (let n = 1; n <= 8; n += 1) {
        await edit($, `src/server/handlers/h${n}.ts`)
      }
      await read($, 'src/a.ts')
      await read($, 'src/b.ts')
      await run($, 'npm test')
    })

    expect(await lines(await closingLine($, 't1', 25_000, { columns: 60 }))).toEqual([
      '✻ Baked for 25s',
      '  ⎿  changed src/server/handlers/h1.ts',
      '     src/server/handlers/h2.ts · src/server/handlers/h3.ts',
      '     src/server/handlers/h4.ts · src/server/handlers/h5.ts',
      '     … +3 more (+16 −8) · read 2 · ran 1',
    ])
  })

  test("leaves out a subagent's calls, an edit held for review and a command that failed", async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 12_000, async () => {
      await read($, 'src/a.ts', 'agent-1')
      await edit($, 'src/held.ts')
      await run($, 'false')
    })

    expect(await lines(await closingLine($, 't1', 12_000))).toEqual(['✻ Baked for 12s'])
  })

  test('puts each tally on its own turn, and leaves a line it has no tally for as Claude Code draws it', async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 9_000, () => read($, 'src/a.ts'))
    await turn($, 't2', 30_000, () => run($, 'npm test'))

    expect(await lines(await closingLine($, 't1', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
    expect(await lines(await closingLine($, 't2', 30_000))).toEqual(['✻ Baked for 30s', '  ⎿  ran 1'])
    expect(await lines(await closingLine($, 't3', 5_000))).toEqual(['✻ Baked for 5s'])
  })

  // An escaped bug: kept by duration, the longest turns stayed and the
  // newest short ones went.
  test('keeps the tallies of the newest 200 turns, however long each took', async ($, on) => {
    engine(on)
    tools(on)
    // Each turn shorter than the one before: 201s first, 1s last.
    for (let n = 1; n <= 201; n += 1) {
      await turn($, `t${n}`, (202 - n) * 1000, () => run($, 'true'))
    }

    expect(await lines(await closingLine($, 't1', 201_000))).toEqual(['✻ Baked for 201s'])
    expect(await lines(await closingLine($, 't2', 200_000))).toEqual(['✻ Baked for 200s', '  ⎿  ran 1'])
    expect(await lines(await closingLine($, 't201', 1000))).toEqual(['✻ Baked for 1s', '  ⎿  ran 1'])
  })

  // An escaped bug: kept by duration, two turns that took as long shared
  // one tally.
  test('keeps two turns that took as long apart', async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 9_000, () => read($, 'src/a.ts'))
    await turn($, 't2', 9_000, () => run($, 'npm test'))

    expect(await lines(await closingLine($, 't1', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
    expect(await lines(await closingLine($, 't2', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  ran 1'])
  })

  test('puts the tally on the row that closes the turn, past other notices added before it', async ($, on) => {
    engine(on)
    tools(on)
    await $.turn.start({ text: '', turnId: 't1' })
    await read($, 'src/a.ts')
    await $.turn.complete({ answer: '', durationMs: 9_000, isAborted: false, turnId: 't1', reason: 'answer' })
    await notice($, 'hooks-ran', 'stop_hook_summary')
    await closes($, 't1')

    expect(await lines(await closingLine($, 't1', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
  })

  test("gives a turn's tally to the one row that closes it", async ($, on) => {
    engine(on)
    tools(on)
    await turn($, 't1', 9_000, () => read($, 'src/a.ts'))
    await closes($, 't2')

    expect(await lines(await closingLine($, 't1', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
    expect(await lines(await closingLine($, 't2', 4_000))).toEqual(['✻ Baked for 4s'])
  })

  // An escaped bug: Claude Code added the closing row before spor's hook on
  // the turn's end was done, and each tally went under the next turn's line.
  test('keeps each tally under its own line when the closing row comes before the turn is done', async ($, on) => {
    engine(on)
    tools(on)
    for (const [turnId, calls] of [
      ['t1', () => read($, 'src/a.ts')],
      ['t2', () => run($, 'npm test')],
    ] as const) {
      await $.turn.start({ text: '', turnId })
      await calls()
      await closes($, turnId)
      await $.turn.complete({ answer: '', durationMs: 9_000, isAborted: false, turnId, reason: 'answer' })
    }

    expect(await lines(await closingLine($, 't1', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  read 1'])
    expect(await lines(await closingLine($, 't2', 9_000))).toEqual(['✻ Baked for 9s', '  ⎿  ran 1'])
  })

  test('leaves no tally waiting from a turn that had no closing row', async ($, on) => {
    engine(on)
    tools(on)
    await $.turn.start({ text: '', turnId: 't1' })
    await read($, 'src/a.ts')
    await $.turn.complete({ answer: '', durationMs: 9_000, isAborted: true, turnId: 't1', reason: 'answer' })
    await $.turn.start({ text: '', turnId: 't2' })
    await closes($, 't2')
    await $.turn.complete({ answer: '', durationMs: 4_000, isAborted: false, turnId: 't2', reason: 'answer' })

    expect(await lines(await closingLine($, 't2', 4_000))).toEqual(['✻ Baked for 4s'])
  })
})
