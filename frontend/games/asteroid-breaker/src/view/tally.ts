import { formatPoints } from "@fz/core/format";
import { easeOutCubic, shareDone } from "@fz/core/math";
import { keysOf } from "@fz/core/records";
import type { WaveTally } from "../rules/field/scoring";
import type { WaveEntry } from "../rules/waves/waves";

/**
 * How long the Cleared card's sum takes to count up as the card opens, in
 * milliseconds, its lines counting one after another in equal shares of it.
 */
export const TALLY_COUNT_MS = 1200;

/** What the Cleared card calls each part of a cleared wave's points, in its order. */
const TALLY_LABELS: Readonly<Record<keyof WaveTally, string>> = {
  rocks: "Rocks",
  chains: "Chains",
  strays: "Strays brought home",
  cleared: "Wave cleared",
  clean: "No ship lost",
};

/** Every part of a cleared wave's points, in the Cleared card's order. */
const TALLY_PARTS = keysOf(TALLY_LABELS);

/** Describes a line of the Cleared card's sum: what it counts, and its points as written. */
export interface TallyLine {
  readonly label: string;
  readonly points: string;
}

/** Describes the Cleared card's sum as it shows: a line for each part of a cleared wave's points, and their total. */
export interface TallyShown {
  readonly lines: readonly TallyLine[];
  /** What the lines show added up, as written. */
  readonly total: string;
}

/**
 * Returns how a cleared wave's points add up as the Cleared card shows them
 * a time after it opens: each line counting up from nothing in turn,
 * easing out, and the total of what they show, whole from
 * {@link TALLY_COUNT_MS} on.
 */
export function tallyShownAt(tally: WaveTally, ms: number): TallyShown {
  const lineMs = TALLY_COUNT_MS / TALLY_PARTS.length;
  const counted = TALLY_PARTS.map((part, i) => {
    const done = easeOutCubic(shareDone(i * lineMs, ms, lineMs));
    return { part, points: Math.round(tally[part] * done) };
  });
  return {
    lines: counted.map(({ part, points }) => ({
      label: TALLY_LABELS[part],
      points: formatPoints(points),
    })),
    total: formatPoints(counted.reduce((sum, { points }) => sum + points, 0)),
  };
}

/** Returns what the Cleared card says comes next: the wave by its number and its name, as "Next: wave 10, Boulder". */
export function nextWaveWords(next: WaveEntry): string {
  return `Next: wave ${String(next.number)}, ${next.data.name}`;
}
