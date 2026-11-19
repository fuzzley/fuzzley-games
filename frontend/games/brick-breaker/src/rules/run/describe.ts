import { count, formatPoints, listed } from "@fz/core/format";
import { type CapsuleId, capsule } from "../catalog/capsules";
import type { LevelEntry } from "../levels/levels";
import type { Run } from "./run";
import type { StarId } from "./stars";

/** Writes Custom's ball speed, a percent of Normal's, as its sliders read it: "150% of Normal". */
export function formatCustomPercent(percent: number): string {
  return `${String(percent)}% of Normal`;
}

/** How few bricks a level needs before the announcer says how many are left. */
export const FEW_BRICKS = 5;

/** Returns what is said as a level starts: its number, its name and the bricks it needs. */
export function describeLevel(entry: LevelEntry, needed: number): string {
  return `Level ${String(entry.number)}, ${entry.data.name}. ${count(needed, "brick", "bricks")}.`;
}

/** Returns what is said as a capsule is caught: its name, and that it pays double if it does. */
export function describeCaught(id: CapsuleId): string {
  const { name, pays } = capsule(id);
  return pays === undefined ? `${name}.` : `${name}. Double pay.`;
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

/** Returns what is said as the level's last key breaks and every gate opens. */
export function describeOpened(): string {
  return "The gates are open.";
}

/** Returns what is said as a level is cleared, short of the last: the level and the score. */
export function describeCleared(run: Run): string {
  return `Level ${String(run.level)} cleared! Score ${formatPoints(run.score)}.`;
}

/**
 * Returns what a level's star asks, as the bench and the cards name it:
 * "Clear the level", "Don't lose a life", or the streak the level's mark sets,
 * "Reach a streak of 15".
 */
export function starAsks(id: StarId, mark: number): string {
  switch (id) {
    case "clear":
      return "Clear the level";
    case "clean":
      return "Don't lose a life";
    case "streak":
      return `Reach a streak of ${String(mark)}`;
  }
}

/**
 * Returns what is said of the stars a level's clearing won that it didn't
 * hold before, and what each was won for, or null for none:
 * "2 new stars, for clearing the level and losing no life."
 */
export function describeStarsWon(
  won: readonly StarId[],
  mark: number,
): string | null {
  if (won.length === 0) return null;
  const reasons = won.map((id) => starWonFor(id, mark));
  return `${count(won.length, "new star", "new stars")}, for ${listed(reasons)}.`;
}

/** Returns what a star is won for, as the announcer says it. */
function starWonFor(id: StarId, mark: number): string {
  switch (id) {
    case "clear":
      return "clearing the level";
    case "clean":
      return "losing no life";
    case "streak":
      return `reaching a streak of ${String(mark)}`;
  }
}

/** Returns what is said as a run pauses. */
export function describePause(run: Run): string {
  return `Paused, with a score of ${formatPoints(run.score)}. Press Enter to go on.`;
}

/** Returns what is said as a paused run goes on. */
export function describeResume(): string {
  return "Going on.";
}

/** Returns what is said as a run kept before the page was left is taken up: where it stands, paused. */
export function describeTakenUp(run: Run, entry: LevelEntry): string {
  return `Your last run is paused on level ${String(entry.number)}, ${entry.data.name}, with a score of ${formatPoints(run.score)} and ${count(run.lives, "life", "lives")}. Press Enter to go on.`;
}

/** Returns what an ended run is called, on its cards and as the announcer says it ends. */
export function endTitle(run: Pick<Run, "outcome">): string {
  return run.outcome === "won" ? "Every level cleared!" : "Game over";
}

/** Returns what is said as a run ends: how, the score, the level reached, and whether it is a new best. */
export function describeEnd(run: Run, newBest: boolean): string {
  const best = newBest ? " A new best!" : "";
  return `${asSentence(endTitle(run))} Score ${formatPoints(run.score)}, at level ${String(run.level)}.${best}`;
}

/** Returns words as a sentence: ending in a full stop, unless they end in a mark of their own. */
function asSentence(words: string): string {
  return /[.!?]$/.test(words) ? words : `${words}.`;
}
