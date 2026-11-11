// The words an ended run is told in, by the result and by the board's Ended
// card after it, kept in one place so the two say the same.

/** Returns where a run was lost: "Lost on level 3, Thicker". */
export function whereLost(level: number, name: string): string {
  return `Lost on level ${String(level)}, ${name}`;
}

/** Returns what the button that tries a lost level again says: "Try again from level 3". */
export function tryAgainLabel(level: number): string {
  return `Try again from level ${String(level)}`;
}
