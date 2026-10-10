// What one turn of the main conversation did: the files it read and the
// files it changed (each once, in the order first touched), the lines its
// changes added and removed, and how many shell commands it ran.
export type Tally = {
  read: string[]
  edited: string[]
  added: number
  removed: number
  ran: number
}

// What a finished turn did, as the line under its closing line shows it:
// the files it changed (relative to the session's folder when inside it),
// the lines they gained and lost (as "(+41 −7)", or empty), and the counts
// of files read and commands run (as "read 6", "ran 2").
export type Summary = {
  changed: string[]
  lines: string
  counts: string[]
}

// What each finished turn did, oldest first, by the id of the row that
// closes it, which its closing line is drawn with; and while a turn
// completes, whichever of its summary and that row came first, waiting for
// the other (null while nothing waits).
export type Tallies = {
  kept: Record<string, Summary>
  summary: Summary | null
  row: string | null
}

declare module 'claude-code' {
  interface PluginState {
    spor: {
      // The turn of the main conversation running now, counted as it goes;
      // null between turns.
      turn: Tally | null
      // What the finished turns did, and a finished turn on its way there.
      tallies: Tallies
      // Whether spor draws its lines; /spor off hides them for the session.
      isShown: boolean
    }
  }
}
