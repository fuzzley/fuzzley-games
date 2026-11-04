// The sectors a player has reached, at any speed, which a run may start at:
// the first from the start, and each after it once a run has reached it.

import type { WaveEntry } from "./waves";

/** Describes a sector as a run may start at it: its id, its name and its first wave's number. */
export interface SectorStart {
  readonly id: string;
  readonly name: string;
  readonly firstWave: number;
}

/** Returns each sector of the waves, in the order played, with the number of its first wave. */
export function sectorStarts(waves: readonly WaveEntry[]): SectorStart[] {
  const starts: SectorStart[] = [];
  for (const { number, sector } of waves) {
    if (starts.at(-1)?.id === sector.id) continue;
    starts.push({ id: sector.id, name: sector.name, firstWave: number });
  }
  return starts;
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
  if (!Array.isArray(value)) return new Set();
  const known = new Set(waves.map(({ sector }) => sector.id));
  return new Set(
    value.filter(
      (id: unknown): id is string => typeof id === "string" && known.has(id),
    ),
  );
}
