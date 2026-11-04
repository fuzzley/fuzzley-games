// Endless's waves, which come after the last sector's and never end, are
// made rather than written: from the run's seed and the wave's number, so a
// run that reaches a wave with the same seed meets the same one, and a saved
// game makes its wave again from the two. Each climbs from the last
// sector's last wave until wave 60, and holds there.

import { createRandom } from "@fz/core/random";
import { PICKUP_IDS } from "./catalog/pickups";
import type { Span } from "./tuning";
import {
  ENDLESS,
  FORMATIONS,
  type Formation,
  WAVES,
  type Wave,
  type WaveEntry,
  type WaveRocks,
  isEndless,
  parseWave,
} from "./waves";

/** The number of Endless's first wave: the one after the last sector's. */
export const ENDLESS_FROM = WAVES.length + 1;

/** Describes a number that climbs from Endless's first wave: by a step a wave from its first, until its most. */
interface Climb {
  readonly first: number;
  readonly rise: number;
  readonly most: number;
}

/** What a wave's rocks are worth, in large stones, for a field of 40 by 40. */
const BUDGET: Climb = { first: 10, rise: 0.5, most: 24 };

/** The rocks' speed against their own. */
const PACE: Climb = { first: 1.25, rise: 0.015, most: 1.6 };

/** The time from one comet to the next at Endless's first wave, in seconds. */
const FIRST_COMETS: Span = { least: 12, most: 15 };

/** The time from one comet to the next from {@link COMETS_CLOSED_AT} on, in seconds. */
const CLOSED_COMETS: Span = { least: 6, most: 8 };

/** The wave by which the comets have closed from {@link FIRST_COMETS} to {@link CLOSED_COMETS}. */
const COMETS_CLOSED_AT = 60;

/** How many waves apart the boulder waves come: every tenth, counting from the last sector's last. */
const BOULDER_EVERY = 10;

/** The most boulders a wave lays: one for each ten waves past the last sector's, up to three. */
const MOST_BOULDERS = 3;

/** The wave from which two strays cross a wave, not one. */
const TWO_STRAYS_FROM = 50;

/**
 * The most rocks a wave lays in a ring or a cluster, as many as a sector's
 * do: more, on a field grown for them, pack too tight to fly among, so a
 * wave of more is scattered or a wall.
 */
const GATHERED_MOST = 13;

/** The formations a wave of more than {@link GATHERED_MOST} rocks is drawn from. */
const SPREAD_FORMATIONS: readonly Formation[] = ["scatter", "wall"];

/** The share of a wave's budget at most spent on iron, its toughest rocks. */
const IRON_SHARE = 1 / 3;

/** Describes rocks a wave's budget buys at a time, and what they cost of it, in large stones. */
interface Buy {
  readonly rocks: WaveRocks;
  readonly worth: number;
}

/** The crystal every wave lays, so pickups keep coming. */
const CRYSTAL: Buy = {
  rocks: { kind: "crystal", size: "large", count: 1 },
  worth: 1,
};

/** A boulder, which breaks into three large stones. */
const BOULDER: Buy = {
  rocks: { kind: "boulder", size: "boulder", count: 1 },
  worth: 3,
};

/**
 * What the rest of a wave's budget is spent on, drawn alike: each kind's
 * large rock, by how hard it is to clear, but a volatile, which buys two
 * medium ones, as a large one's blast clears too much for the player.
 */
const BUYS: readonly Buy[] = [
  { rocks: { kind: "stone", size: "large", count: 1 }, worth: 1 },
  { rocks: { kind: "ice", size: "large", count: 1 }, worth: 1.2 },
  { rocks: { kind: "volatile", size: "medium", count: 2 }, worth: 1.5 },
  { rocks: { kind: "lodestone", size: "large", count: 1 }, worth: 1.6 },
  { rocks: { kind: "iron", size: "large", count: 1 }, worth: 2 },
];

/**
 * Returns a wave of the game ready to play: a sector's, as its data says,
 * or Endless's, made from the run's seed and its number.
 */
export function waveToPlay(entry: WaveEntry, seed: number): Wave {
  return isEndless(entry) ? endlessWave(seed, entry.number) : parseWave(entry);
}

/**
 * Returns an Endless wave, made from a run's seed and the wave's number: a
 * budget of rocks, one crystal among them and, every tenth wave, boulders;
 * a formation drawn from the four, but a scatter or a wall for more rocks
 * than {@link GATHERED_MOST}; comets in every wave; and its pace, comets
 * and strays by how far into Endless it is.
 *
 * A number before Endless's first makes its first.
 */
export function endlessWave(seed: number, number: number): Wave {
  // Mixed apart from the field's seed, so the wave's makeup draws nothing
  // alike with its field.
  const random = createRandom(seed ^ Math.imul(number, 0xc2b2ae35));
  const past = Math.max(0, number - ENDLESS_FROM);
  const boulders =
    (past + 1) % BOULDER_EVERY === 0
      ? Math.min((past + 1) / BOULDER_EVERY, MOST_BOULDERS)
      : 0;
  const closed = Math.min(1, past / (COMETS_CLOSED_AT - ENDLESS_FROM));
  const rocks = rocksOf(climbed(BUDGET, past), boulders, random);
  const laid = rocks.reduce((sum, each) => sum + each.count, 0);
  const formations = laid > GATHERED_MOST ? SPREAD_FORMATIONS : FORMATIONS;
  return {
    rocks,
    formation:
      formations[Math.floor(random() * formations.length)] ?? "scatter",
    pace: climbed(PACE, past),
    waveKind: "stone",
    drops: ENDLESS.drops,
    pool: PICKUP_IDS,
    strays: number >= TWO_STRAYS_FROM ? 2 : 1,
    cometEvery: {
      least: 1000 * between(FIRST_COMETS.least, CLOSED_COMETS.least, closed),
      most: 1000 * between(FIRST_COMETS.most, CLOSED_COMETS.most, closed),
    },
  };
}

/** Returns a number that climbs, as it stands a number of waves past Endless's first. */
function climbed({ first, rise, most }: Climb, past: number): number {
  return Math.min(most, first + rise * past);
}

/** Returns the number a share of the way from one to another. */
function between(from: number, to: number, share: number): number {
  return from + (to - from) * share;
}

/**
 * Returns the rocks a budget buys: the boulders and the crystal, then
 * rocks drawn alike from those the rest still buys, no more of it on iron
 * than its share, until it buys none.
 */
function rocksOf(
  budget: number,
  boulders: number,
  random: () => number,
): WaveRocks[] {
  const bought = new Map<Buy, number>();
  let left = budget - CRYSTAL.worth - boulders * BOULDER.worth;
  let ironLeft = budget * IRON_SHARE;
  for (;;) {
    const fits = BUYS.filter(
      ({ rocks, worth }) =>
        worth <= left && (rocks.kind !== "iron" || worth <= ironLeft),
    );
    const buy = fits[Math.floor(random() * fits.length)];
    if (!buy) break;
    bought.set(buy, (bought.get(buy) ?? 0) + 1);
    // Kept to tenths, as every worth is, so the sum never drifts under a
    // worth it holds.
    left = Math.round((left - buy.worth) * 10) / 10;
    if (buy.rocks.kind === "iron") ironLeft -= buy.worth;
  }
  const rocks = BUYS.flatMap((buy) => {
    const times = bought.get(buy) ?? 0;
    return times > 0 ? [{ ...buy.rocks, count: buy.rocks.count * times }] : [];
  });
  const boulder = { ...BOULDER.rocks, count: boulders };
  return [...(boulders > 0 ? [boulder] : []), CRYSTAL.rocks, ...rocks];
}
