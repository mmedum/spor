import type { ToolGroupCall } from 'claude-code'
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

  // An escaped bug: under a live run Claude Code shows its latest call, as
  // `⎿  $ cd ~/src/app && python3 - <<'EOF'`, and spor's line said it again.
  test('leaves a live run in the terminal to Claude Code, which shows its latest call under its own line, for one call and for several', async ($, on) => {
    engine(on)
    const rows: [ToolGroupCall[], string][] = [
      [[call('Bash', { command: "cd ~/src/app && python3 - <<'EOF'\nimport re\nEOF" })], 'Read 1 files'],
      [[call('Read', { file_path: '/home/demo/app/src/api.ts' }), call('Bash', { command: 'npm test' })], 'Read 2 files'],
    ]
    for (const [calls, own] of rows) {
      const ui = await group($, calls, { isActive: true })
      expect(await lines(ui)).toEqual([own])
      await ui.unmount()
    }
  })

  test('names every call of a live run once it settles', async ($, on) => {
    engine(on)
    const calls = [call('Read', { file_path: '/home/demo/app/src/api.ts' }), call('Bash', { command: 'npm test' })]
    const ui = await group($, calls, { isActive: true })
    await ui.redraw({ calls, isActive: false, isExpanded: false })

    expect(await lines(ui)).toEqual(['Read 2 files', '  ⎿  src/api.ts · npm test'])
  })

  test('names every call of a live run on the other surfaces, where Claude Code shows none under its line', async ($, on) => {
    engine(on)
    for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
      const ui = await group($, [call('Read', { file_path: '/home/demo/app/src/api.ts' }), call('Bash', { command: 'npm test' })], {
        isActive: true,
        surface,
      })
      expect(await lines(ui)).toEqual(['Read 2 files', '  ⎿  src/api.ts · npm test'])
      await ui.unmount()
    }
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

  test('passes over blank lines and comments before a command, unless the script is nothing else', async ($, on) => {
    engine(on)
    const ui = await group($, [
      call('Bash', { command: '# build it\nnpm run build' }),
      call('Bash', { command: '\n\nnpm test' }),
      call('Bash', { command: '\n#!/bin/sh\n# nothing to run' }),
    ])

    expect(await lines(ui)).toEqual(['Read 3 files', '  ⎿  npm run build · npm test · #!/bin/sh …'])
  })

  // An escaped bug: a name alone that took more than four rows was hidden
  // behind "… +1 more".
  test('shows a name that takes more than four rows whole, even alone', async ($, on) => {
    engine(on)
    const command = 'echo one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'
    // 25 columns less the lead's 5 leave 20 cells.
    const ui = await group($, [call('Bash', { command })], { columns: 25 })

    expect(await lines(ui)).toEqual([
      'Read 1 files',
      '  ⎿  echo one two three',
      '     four five six seven',
      '     eight nine ten',
      '     eleven twelve',
      '     thirteen fourteen',
      '     fifteen sixteen',
    ])
  })

  test('measures Chinese, Japanese and Korean characters and emoji two cells wide', async ($, on) => {
    engine(on)
    // 14 and 24 cells, 41 joined, in 40 cells; counted in code points they
    // would be 37 and fit on one line.
    const ui = await group($, [call('Read', { file_path: '/home/demo/app/docs/設計書.md' }), call('Bash', { command: 'git commit -m "✨ ready"' })], {
      columns: 45,
    })

    expect(await lines(ui)).toEqual(['Read 2 files', '  ⎿  docs/設計書.md', '     git commit -m "✨ ready"'])
  })

  test('breaks a name of wide characters by the cells it takes', async ($, on) => {
    engine(on)
    // In 16 cells: "docs/設計書/" takes 12, and "docs/設計書/仕様/" 17, one past the
    // line; counted in code points it would be 12 and fit.
    const ui = await group($, [call('Read', { file_path: '/home/demo/app/docs/設計書/仕様/一覧と設計.md' })], { columns: 21 })

    expect(await lines(ui)).toEqual(['Read 1 files', '  ⎿  docs/設計書/', '     仕様/', '     一覧と設計.md'])
  })

  test('counts an accent written apart from its letter as no cell of its own', async ($, on) => {
    engine(on)
    // "docs/å.md" with å as a and a combining ring: 9 cells, 20 joined, in
    // 20 cells; counted in code points they would be 21 and wrap.
    const ui = await group(
      $,
      [call('Read', { file_path: '/home/demo/app/docs/a\u030a.md' }), call('Read', { file_path: '/home/demo/app/src/a.ts' })],
      {
        columns: 25,
      },
    )

    expect(await lines(ui)).toEqual(['Read 2 files', '  ⎿  docs/a\u030a.md · src/a.ts'])
  })

  test('writes Windows paths relative to the folder and breaks them after a backslash', async ($, on) => {
    engine(on, 'C:\\Users\\demo\\app')
    const ui = await group(
      $,
      [
        call('Read', { file_path: 'C:\\Users\\demo\\app\\src\\api.ts' }),
        call('Read', { file_path: 'C:\\Users\\demo\\other\\a-rather-long-folder\\file.ts' }),
      ],
      { columns: 30 },
    )

    expect(await lines(ui)).toEqual([
      'Read 2 files',
      '  ⎿  src\\api.ts',
      '     C:\\Users\\demo\\other\\',
      '     a-rather-long-folder\\',
      '     file.ts',
    ])
  })
})
