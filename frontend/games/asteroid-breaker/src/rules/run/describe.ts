import { count, formatPoints } from "@fz/core/format";
import { pickup } from "../catalog/pickups";
import type { FieldEvent } from "../field/events";
import { FULL_STEP } from "../sparks/charge";
import type { Run } from "./run";
import { type WaveEntry, isEndless, opensEndless } from "../waves/waves";

/** Returns what is said as a wave begins: its number, its name and the rocks it holds. */
export function describeWave(entry: WaveEntry, rocks: number): string {
  return `Wave ${String(entry.number)}, ${entry.data.name}. ${count(rocks, "rock", "rocks")}.`;
}

/**
 * Returns what is said of an event of the field, as the event left the
 * crew: a stray drifting in, caught into the line in tow or brought
 * straight home, one of the crew knocked loose, caught again or floating
 * home, with how many ride in tow after a hit or a catch, a pickup caught,
 * by its name, static coming to full, a zap and a burr clinging; or null for any other, the hit
 * that ends the run and the crew floating home with it among them, as the
 * run's end is said.
 *
 * A pilot's color is never said: it only tells pilots apart.
 */
export function describeEvent(event: Readonly<FieldEvent>): string | null {
  switch (event.kind) {
    case "strayed":
      return "A stray fuzzball drifts in.";
    case "joined":
      return `Caught. ${inTowWords(event.inTow)}.`;
    case "home":
      return "Crew full. The stray goes straight home.";
    case "knocked":
      return `Hit. One knocked loose. ${inTowWords(event.inTow)}.`;
    case "recaught":
      return `Caught again. ${inTowWords(event.inTow)}.`;
    case "floated":
      return event.runOver ? null : "A fuzzball floats home.";
    case "caught":
      return event.pickup === null ? null : `${pickup(event.pickup).name}.`;
    case "stepped":
      return event.step === FULL_STEP && !event.fell ? "Static full." : null;
    case "zapped":
      return "Zap.";
    case "clung":
      return "A burr sticks to you.";
    default:
      return null;
  }
}

/** Returns how many ride in tow, in words, as the announcer and the bar say it: "3 following", or "No one following". */
export function inTowWords(inTow: number): string {
  return inTow === 0 ? "No one following" : `${String(inTow)} following`;
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
    ? `${cleared.sector.name} cleared. Endless begins.`
    : `Wave ${String(cleared.number)} cleared.`;
  return `${said} Score ${formatPoints(run.score)}.`;
}

/** Returns what is said as a run pauses. */
export function describePause(run: Run): string {
  return `Paused. Score ${formatPoints(run.score)}. Press Enter to resume.`;
}

/** Returns what is said as a paused run goes on. */
export function describeResume(): string {
  return "Resumed.";
}

/** Returns what is said as a run kept before the page was left is taken up: where it stands, paused. */
export function describeTakenUp(run: Run, entry: WaveEntry): string {
  return `Paused on wave ${String(entry.number)}, ${entry.data.name}. Score ${formatPoints(run.score)}. ${inTowWords(run.crew.tow.length)}. Press Enter to resume.`;
}

/**
 * What the run's end is called, as the announcer says it and the result
 * card shows it.
 */
export const END_TITLE = "Game over";

/**
 * Returns what is said of what an ended run set, each a sentence after a
 * space, a new best first, or nothing for a run that set nothing: the
 * announcer's words, and what a screen reader hears of the result card.
 */
export function marksWords({ newBest, clearedAll }: EndMarks): string {
  const best = newBest ? " New best." : "";
  const all = clearedAll ? " All 30 waves cleared." : "";
  return `${best}${all}`;
}

/**
 * Returns what is said as a run ends: its title ({@link END_TITLE}), the
 * score, the wave it ended on, and what it set ({@link marksWords}).
 */
export function describeEnd(
  run: Run,
  entry: WaveEntry,
  marks: EndMarks,
): string {
  return `${END_TITLE}. Score ${formatPoints(run.score)}, on ${waveIn(entry)}.${marksWords(marks)}`;
}

/** Returns a wave by its number, in words: "wave 4", or "wave 37, Endless". */
function waveIn(entry: WaveEntry): string {
  const wave = `wave ${String(entry.number)}`;
  return isEndless(entry) ? `${wave}, Endless` : wave;
}
