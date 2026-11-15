import { count, formatPoints } from "@fz/core/format";
import { pickup } from "../catalog/pickups";
import type { FieldEvent } from "../field/events";
import { aboard } from "../ship/pilots";
import type { Run } from "./run";
import { type WaveEntry, isEndless, opensEndless } from "../waves/waves";

/** Returns what is said as a wave begins: its number, its name and the rocks it holds. */
export function describeWave(entry: WaveEntry, rocks: number): string {
  return `Wave ${String(entry.number)}, ${entry.data.name}. ${count(rocks, "rock", "rocks")}.`;
}

/**
 * Returns what is said of an event of the field, as the event left the
 * crew: a stray drifting in or brought home, a ship lost while others are
 * left, and a pickup caught, by its name; or null for any other.
 *
 * A pilot's color is never said: it only tells pilots apart.
 */
export function describeEvent(event: Readonly<FieldEvent>): string | null {
  switch (event.kind) {
    case "strayed":
      return "A stray fuzzball drifts in.";
    case "home":
      return `Brought home. ${shipsOf(event)}.`;
    case "lost":
      return event.ships > 0 ? `Ship lost. ${shipsOf(event)} left.` : null;
    case "caught":
      return event.pickup === null ? null : `${pickup(event.pickup).name}.`;
    default:
      return null;
  }
}

/** Returns the ships an event counts, in words. */
function shipsOf(event: Readonly<FieldEvent>): string {
  return count(event.ships, "ship", "ships");
}

/** Says what an ended run set, which is said of it as it ends. */
export interface EndMarks {
  /** Whether its score is a new best. */
  readonly newBest: boolean;
  /** Whether it has cleared every written wave, from the first. */
  readonly clearedAll: boolean;
}

/**
 * Returns what is said as a wave is cleared, with the one after it: the
 * wave, or the last sector, by its name, and Endless beginning after it,
 * and the score.
 */
export function describeCleared(
  run: Run,
  cleared: WaveEntry,
  next: WaveEntry,
): string {
  const said = opensEndless(cleared, next)
    ? `${cleared.sector.name} cleared! Endless begins.`
    : `Wave ${String(cleared.number)} cleared!`;
  return `${said} Score ${formatPoints(run.score)}.`;
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
export function describeTakenUp(run: Run, entry: WaveEntry): string {
  return `Your last run is paused on wave ${String(entry.number)}, ${entry.data.name}, with a score of ${formatPoints(run.score)} and ${count(aboard(run.crew), "ship", "ships")}. Press Enter to go on.`;
}

/** Returns where a run was lost: the wave its last ship went down on, Endless's named so. */
export function whereLost(entry: WaveEntry): string {
  return `Lost on ${waveIn(entry)}`;
}

/** Returns what is said as a run ends: the score, the wave it was lost on, and what it set. */
export function describeEnd(
  run: Run,
  entry: WaveEntry,
  { newBest, clearedAll }: EndMarks,
): string {
  const best = newBest ? " A new best!" : "";
  const all = clearedAll ? " Cleared all thirty!" : "";
  return `Game over. Score ${formatPoints(run.score)}, on ${waveIn(entry)}.${best}${all}`;
}

/** Returns a wave by its number, in words: "wave 4", or "wave 37, Endless". */
function waveIn(entry: WaveEntry): string {
  const wave = `wave ${String(entry.number)}`;
  return isEndless(entry) ? `${wave}, Endless` : wave;
}
