import type { SectorSpan } from "../../rules/run/progress";
import type { WaveEntry } from "../../rules/waves/waves";

/**
 * What is new in each of the game's sectors, Endless's among them, by its
 * id, a sentence each, as the card over its first wave says it.
 */
export const SECTOR_NEWS: Readonly<Record<string, readonly string[]>> = {
  "inner-belt": [
    "Break every rock to clear a wave.",
    "Crystals let pickups go.",
  ],
  "iron-reach": [
    "Iron holds its hits.",
    "Volatile rocks blast, and comets cross.",
  ],
  storm: ["Lodestones drift toward the ship."],
  endless: [
    "Its waves are made anew each run, and never end.",
    "Comets cross every one, and a boulder comes every tenth.",
  ],
};

/**
 * Describes the card over a wave waiting for its first move at the start of
 * the run or of a sector: the sector, its waves, what is new there, and the
 * wave.
 */
export interface SectorCard {
  /** Whether it opens the run, at its first wave, rather than a sector the run reached. */
  readonly opensRun: boolean;
  /** What it opens, in words: "A new run", or "A new sector". */
  readonly kicker: string;
  /** The sector's name. */
  readonly name: string;
  /** The sector's waves, in words, as the Sectors dialog says them. */
  readonly waves: string;
  /** What is new there, a sentence each, or none for a sector the game doesn't write of. */
  readonly news: readonly string[];
  /** The wave waiting, by its number and its name: "Wave 11, Ore". */
  readonly wave: string;
}

/**
 * Returns the card over a wave waiting for its first move: at the run's
 * first wave, wherever that is in its sector, or at a sector's first;
 * else null, as no card lies over a wave gone on to within a sector.
 */
export function sectorCardOf(
  spans: readonly SectorSpan[],
  entry: WaveEntry,
  opensRun: boolean,
): SectorCard | null {
  const span = spans.find(({ id }) => id === entry.sector.id);
  if (!span || (!opensRun && span.firstWave !== entry.number)) return null;
  return {
    opensRun,
    kicker: opensRun ? "A new run" : "A new sector",
    name: span.name,
    waves: wavesInWords(span.firstWave, span.lastWave),
    news: SECTOR_NEWS[span.id] ?? [],
    wave: `Wave ${String(entry.number)}, ${entry.data.name}`,
  };
}

/**
 * Returns what is said as the card over a wave at the start of the run or
 * of a sector shows: what it opens, the sector and its waves, what is new
 * there, the wave, in the words given, and that it starts when the player
 * flies.
 */
export function describeSector(card: SectorCard, wave: string): string {
  return [
    `${card.kicker}: ${card.name}.`,
    `${card.waves}.`,
    ...card.news,
    wave,
    "It starts when you fly.",
  ].join(" ");
}

/** Returns the waves a sector holds, in words: "Waves 1 to 5", "Wave 6" for one, or "From wave 31" for Endless. */
export function wavesInWords(first: number, last: number | null): string {
  if (last === null) return `From wave ${String(first)}`;
  return first === last
    ? `Wave ${String(first)}`
    : `Waves ${String(first)} to ${String(last)}`;
}
