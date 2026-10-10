import { describe, expect, test } from 'claude-code/testing'
import { call, engine, group, lines } from './kit'

describe('folded runs', () => {
  test('names the files read and the commands run under the run, paths inside the folder relative', async ($, on) => {
    engine(on)
    const ui = await group($, [
      call('Read', { file_path: '/home/demo/app/src/api.ts' }),
      call('Read', { file_path: '/home/demo/app/src/db/pool.ts' }),
      call('Bash', { command: 'rg -n "retryCount" src/' }),
    ])

    expect(await lines(ui)).toEqual(['Read 3 files', '  ⎿  src/api.ts · src/db/pool.ts · rg -n "retryCount" src/'])
  })

  test('leaves a run unfolded with ctrl+o to Claude Code, which shows each call', async ($, on) => {
    engine(on)
    const ui = await group($, [call('Read', { file_path: '/home/demo/app/src/api.ts' })], { isExpanded: true })

    expect(await lines(ui)).toEqual(['Read 1 files'])
  })

  test('names each file once, marks one that never read, and writes a path outside the folder whole', async ($, on) => {
    engine(on)
    const ui = await group($, [
      call('Read', { file_path: '/home/demo/app/src/api.ts' }, { isErrored: true }),
      call('Read', { file_path: '/home/demo/app/src/api.ts' }),
      call('Read', { file_path: '/etc/hosts' }, { isErrored: true }),
      // Beside the folder, not in it.
      call('Read', { file_path: '/home/demo/appendix/notes.md' }),
      call('Bash', { command: 'rg -n retry \\\n  src/ tests/' }),
    ])

    expect(await lines(ui)).toEqual(['Read 5 files', '  ⎿  src/api.ts · /etc/hosts ✗ · /home/demo/appendix/notes.md · rg -n retry src/ tests/'])
  })

  test("shows a command's first line, joining the lines a backslash continues, and marks a heredoc's body left out", async ($, on) => {
    engine(on)
    const ui = await group($, [
      call('Bash', { command: "cd ~/src/app && python3 -I - README.md <<'EOF'\nimport sys\nprint(sys.argv)\nEOF" }),
      call('Bash', { command: 'npm test \\\n  -- --watch=false' }),
    ])

    expect(await lines(ui)).toEqual(['Read 2 files', "  ⎿  cd ~/src/app && python3 -I - README.md <<'EOF' … · npm test -- --watch=false"])
  })

  test('past the width, wraps whole names onto more lines and leaves none out', async ($, on) => {
    engine(on)
    // 100 columns less the lead's 5 leave 95 cells; the names take 104.
    const ui = await group(
      $,
      [
        call('Read', { file_path: '/home/demo/app/reports/Claude Code plugin name.md' }),
        call('Read', { file_path: '/home/demo/app/reports/Next mod from TUI requests.md' }),
        call('Bash', { command: 'rg -c footprints reports/ .' }),
      ],
      { columns: 100 },
    )

    expect(await lines(ui)).toEqual([
      'Read 3 files',
      '  ⎿  reports/Claude Code plugin name.md · reports/Next mod from TUI requests.md',
      '     rg -c footprints reports/ .',
    ])
  })

  test('wraps a long run onto as many lines as it takes', async ($, on) => {
    engine(on)
    const reads = ['a', 'b', 'c', 'd', 'e', 'f'].map(name => call('Read', { file_path: `/home/demo/app/src/${name}.ts` }))
    // 40 columns less the lead's 5 leave 35 cells.
    const ui = await group($, reads, { columns: 40 })

    expect(await lines(ui)).toEqual(['Read 6 files', '  ⎿  src/a.ts · src/b.ts · src/c.ts', '     src/d.ts · src/e.ts · src/f.ts'])
  })

  test('breaks a name wider than a line at its last space or slash that fits, losing nothing', async ($, on) => {
    engine(on)
    const command = call('Bash', { command: 'find . -name "*.ts" -not -path "./node_modules/*" -newer package.json' })
    const wide = await group($, [command, call('Read', { file_path: '/home/demo/app/src/a.ts' })])
    expect(await lines(wide)).toEqual(['Read 2 files', '  ⎿  find . -name "*.ts" -not -path "./node_modules/*" -newer package.json · src/a.ts'])
    await wide.unmount()

    // 65 columns leave 60 cells: the command breaks at a space.
    const narrow = await group($, [command, call('Read', { file_path: '/home/demo/app/src/a.ts' })], { columns: 65 })
    expect(await lines(narrow)).toEqual([
      'Read 2 files',
      '  ⎿  find . -name "*.ts" -not -path "./node_modules/*" -newer',
      '     package.json · src/a.ts',
    ])
    await narrow.unmount()

    // 35 columns leave 30 cells: a path breaks after a slash, and a word
    // wider than the line breaks where the line ends.
    const path = await group($, [call('Read', { file_path: '/home/demo/app-elsewhere/deeply/nested/folder/structure/with/a/long-file-name.ts' })], {
      columns: 35,
    })
    expect(await lines(path)).toEqual([
      'Read 1 files',
      '  ⎿  /home/demo/app-elsewhere/',
      '     deeply/nested/folder/',
      '     structure/with/a/',
      '     long-file-name.ts',
    ])
    await path.unmount()
    const word = await group($, [call('Bash', { command: `${'x'.repeat(25)}${'y'.repeat(10)}` })], { columns: 35 })
    expect(await lines(word)).toEqual(['Read 1 files', '  ⎿  xxxxxxxxxxxxxxxxxxxxxxxxxyyyyy', '     yyyyy'])
  })

  test('caps a long run at three rows of names and a row of its own saying how many more and the key that shows them, but never hides just one row', async ($, on) => {
    engine(on)
    const reads = (count: number) =>
      'abcdefghijklm'
        .split('')
        .slice(0, count)
        .map(name => call('Read', { file_path: `/home/demo/app/src/${name}.ts` }))
    // 40 columns less the lead's 5 leave 35 cells: three names a row.
    const twelve = await group($, reads(12), { columns: 40 })
    expect(await lines(twelve)).toEqual([
      'Read 12 files',
      '  ⎿  src/a.ts · src/b.ts · src/c.ts',
      '     src/d.ts · src/e.ts · src/f.ts',
      '     src/g.ts · src/h.ts · src/i.ts',
      '     src/j.ts · src/k.ts · src/l.ts',
    ])
    await twelve.unmount()

    const thirteen = await group($, reads(13), { columns: 40 })
    expect(await lines(thirteen)).toEqual([
      'Read 13 files',
      '  ⎿  src/a.ts · src/b.ts · src/c.ts',
      '     src/d.ts · src/e.ts · src/f.ts',
      '     src/g.ts · src/h.ts · src/i.ts',
      '     … +4 more (ctrl+o to expand)',
    ])
    await thirteen.unmount()

    // The marker keeps a row of its own, even where the last row of names
    // has room for it: here a long name doesn't fit on the third.
    const long = call('Read', { file_path: '/home/demo/app/src/a-very-long-folder-name/with-a-long-file-name.ts' })
    const mixed = await group($, [...reads(7), long, ...reads(12).slice(7)], { columns: 45 })
    expect(await lines(mixed)).toEqual([
      'Read 13 files',
      '  ⎿  src/a.ts · src/b.ts · src/c.ts',
      '     src/d.ts · src/e.ts · src/f.ts',
      '     src/g.ts',
      '     … +6 more (ctrl+o to expand)',
    ])
  })

  test('names a fetch by its address, a web search by its question, and any other call by its tool', async ($, on) => {
    engine(on)
    const ui = await group($, [
      call('WebFetch', { url: 'https://code.claude.com/docs/en/plugins/mods', prompt: 'p' }),
      call('WebSearch', { query: 'claude code mods' }),
      call('mcp__docs__lookup', {}),
    ])

    expect(await lines(ui)).toEqual(['Read 3 files', '  ⎿  code.claude.com/docs/en/plugins/mods · "claude code mods" · lookup'])
  })
})
