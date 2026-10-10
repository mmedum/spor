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

declare module 'claude-code' {
  interface PluginState {
    spor: {
      // The turn of the main conversation running now, counted as it goes;
      // null between turns.
      turn: Tally | null
      // What each finished turn did, oldest first, by the turn's duration
      // in milliseconds ("41000ms"): the one number turn.complete and the
      // turn's closing line both carry.
      tallies: Record<string, Summary>
      // Whether spor draws its lines; /spor off hides them for the session.
      isShown: boolean
    }
  }
}
