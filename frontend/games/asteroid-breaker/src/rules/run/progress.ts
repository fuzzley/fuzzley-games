// The sectors a player has reached, at any speed, which a run may start at:
// the first from the start, and each after it once a run has reached it,
// Endless among them once a run has cleared the last written wave.

import { knownIdsOf } from "@fz/core/json";
import { ENDLESS, type WaveEntry } from "../waves/waves";

/** Describes the waves a sector spans: its id, its name, and its first and last waves' numbers. */
export interface SectorSpan {
  readonly id: string;
  readonly name: string;
  readonly firstWave: number;
  /** The number of its last wave, or null for Endless, which has none. */
  readonly lastWave: number | null;
}

/**
 * Returns each sector of the waves, in the order played, with the numbers
 * of its first and last waves, and Endless after them.
 */
export function sectorSpans(waves: readonly WaveEntry[]): SectorSpan[] {
  const spans: SectorSpan[] = [];
  for (const { number, sector } of waves) {
    const last = spans.at(-1);
    if (last?.id === sector.id) {
      spans[spans.length - 1] = { ...last, lastWave: number };
    } else {
      spans.push({
        id: sector.id,
        name: sector.name,
        firstWave: number,
        lastWave: number,
      });
    }
  }
  const { id, name } = ENDLESS;
  return [...spans, { id, name, firstWave: waves.length + 1, lastWave: null }];
}

/** Returns whether a run may start at a sector: the first, or one a run has reached. */
export function isOpen(
  waves: readonly WaveEntry[],
  reached: ReadonlySet<string>,
  sector: string,
): boolean {
  return waves[0]?.sector.id === sector || reached.has(sector);
}

/**
 * Returns the ids of the sectors reached, as stored, keeping only those the
 * game still has, Endless among them.
 */
export function readReached(
  value: unknown,
  waves: readonly WaveEntry[],
): ReadonlySet<string> {
  return knownIdsOf(value, new Set(sectorSpans(waves).map(({ id }) => id)));
}
