// A level's stars (C4): one for clearing it, and the second and third for
// clearing it with as many moves to spare as its own thresholds ask, which
// the sketch set from how its careful player did.

import type { Level } from "../levels/level";

/** The most stars a level earns: one for each of its thresholds. */
export const MOST_STARS: Level["stars"]["length"] = 3;

/** Returns how many stars a level earns cleared with so many moves to spare: one for each of its thresholds met, the first at clearing it. */
export function starsEarned(level: Level, spare: number): number {
  return level.stars.filter((threshold) => spare >= threshold).length;
}
