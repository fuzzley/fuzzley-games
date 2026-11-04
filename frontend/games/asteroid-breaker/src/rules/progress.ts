// The sectors a player has reached, at any speed, which a run may start at:
// the first from the start, and each after it once a run has reached it.

import { knownIdsOf } from "@fz/core/json";
import type { WaveEntry } from "./waves";

/** Describes the waves a sector spans: its id, its name, and its first and last waves' numbers. */
export interface SectorSpan {
  readonly id: string;
  readonly name: string;
  readonly firstWave: number;
  readonly lastWave: number;
}

/** Returns each sector of the waves, in the order played, with the numbers of its first and last waves. */
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
  return spans;
}

/** Returns whether a run may start at a sector: the first, or one a run has reached. */
export function isOpen(
  waves: readonly WaveEntry[],
  reached: ReadonlySet<string>,
  sector: string,
): boolean {
  return waves[0]?.sector.id === sector || reached.has(sector);
}

/** Returns the ids of the sectors reached, as stored, keeping only those the game still has. */
export function reachedOf(
  value: unknown,
  waves: readonly WaveEntry[],
): ReadonlySet<string> {
  return knownIdsOf(value, new Set(waves.map(({ sector }) => sector.id)));
}
