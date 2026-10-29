import { count } from "@fz/core/format";
import { type CapsuleId, capsule } from "./catalog/capsules";
import type { LevelEntry } from "./levels";
import type { Run } from "./run";

/** How few bricks a level needs before the announcer says how many are left. */
export const FEW_BRICKS = 5;

/** Returns what is said as a level starts: its number, its name and the bricks it needs. */
export function describeLevel(entry: LevelEntry, needed: number): string {
  return `Level ${String(entry.number)}, ${entry.data.name}. ${count(needed, "brick", "bricks")}.`;
}

/** Returns what is said as a capsule is caught: its name. */
export function describeCaught(id: CapsuleId): string {
  return `${capsule(id).name}.`;
}

/**
 * Returns what is said of the lives a frame of play brought, from the run
 * before it and after: a life gained, by points or a capsule, then a ball
 * lost, the order the run takes them in, or null for a frame with neither.
 *
 * An extra life caught with the most lives held already is said by its
 * name, as any other capsule is, since the run can't take it.
 */
export function describeLives(before: Run, after: Run): string | null {
  const lost = after.levelLost - before.levelLost;
  const gained = after.lives + lost - before.lives;
  const words: string[] = [];
  if (gained > 0) {
    words.push(`Extra life. ${count(after.lives + lost, "life", "lives")}.`);
  } else if (after.levelGained > before.levelGained) {
    words.push(describeCaught("life"));
  }
  if (lost > 0) {
    words.push(`Ball lost. ${count(after.lives, "life", "lives")} left.`);
  }
  return words.length > 0 ? words.join(" ") : null;
}

/**
 * Returns what is said as a level comes down to few bricks left, from the
 * bricks it needed before a frame and after, or null for a frame that
 * didn't bring it there, such as one that cleared it.
 */
export function describeFewLeft(before: number, after: number): string | null {
  if (before <= FEW_BRICKS || after > FEW_BRICKS || after === 0) return null;
  return `${count(after, "brick", "bricks")} left.`;
}

/** Returns what is said as a level is cleared, short of the last: the level and the score. */
export function describeCleared(run: Run): string {
  return `Level ${String(run.level)} cleared! Score ${String(run.score)}.`;
}

/** Returns what is said as a run pauses. */
export function describePause(run: Run): string {
  return `Paused, with a score of ${String(run.score)}. Press Enter to go on.`;
}

/** Returns what is said as a paused run goes on. */
export function describeResume(): string {
  return "Going on.";
}

/** Returns what is said as a run ends: how, the score, the level reached, and whether it is a new best. */
export function describeEnd(run: Run, newBest: boolean): string {
  const how = run.outcome === "won" ? "Every level cleared!" : "Game over.";
  const best = newBest ? " A new best!" : "";
  return `${how} Score ${String(run.score)}, at level ${String(run.level)}.${best}`;
}
