import { PICKUP_IDS } from "../catalog/pickups";
import type { RockKindId } from "../catalog/rocks";
import { endlessWave, waveToPlay } from "./endless";
import { ENDLESS_PLAYED } from "../../testing/autopilot";
import { ROCK_CAP } from "../tuning";
import {
  ENDLESS,
  FORMATIONS,
  WAVES,
  type Wave,
  parseWave,
  waveEntryOf,
} from "./waves";

/** What a rock of each kind and size is worth of a wave's budget, in large stones, as the plan prices them. */
const WORTH: Readonly<Record<string, number>> = {
  "boulder boulder": 3,
  "crystal large": 1,
  "stone large": 1,
  "ice large": 1.2,
  "volatile medium": 0.75,
  "lodestone large": 1.6,
  "iron large": 2,
};

/** The seeds a spec makes waves from, to judge the making by more than one run. */
const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);

/** Endless's waves the autopilot is held to, by number. */
const NUMBERS = ENDLESS_PLAYED.map((entry) => entry.number);

/** Returns a wave's budget, in large stones, as the plan climbs it: 10 at wave 31, 0.5 more a wave, 24 at most. */
function budgetOf(number: number): number {
  return Math.min(24, 10 + 0.5 * (number - 31));
}

/** Returns every wave a spec makes: each of {@link NUMBERS} from each of {@link SEEDS}. */
function everyWave(): Wave[] {
  return NUMBERS.flatMap((number) =>
    SEEDS.map((seed) => endlessWave(seed, number)),
  );
}

/** Returns what a wave's rocks are worth of its budget, failing the spec for a rock the plan doesn't price. */
function worthOf(wave: Wave): number {
  return wave.rocks.reduce((sum, { kind, size, count }) => {
    const worth = WORTH[`${kind} ${size}`];
    if (worth === undefined) throw new Error(`No worth for ${size} ${kind}.`);
    return sum + worth * count;
  }, 0);
}

/** Returns how many rocks of a kind a wave lays. */
function countOf(wave: Wave, kind: RockKindId): number {
  return wave.rocks
    .filter((rocks) => rocks.kind === kind)
    .reduce((sum, rocks) => sum + rocks.count, 0);
}

describe("endlessWave", () => {
  it("keeps the wave a seed makes, which a game taken up in Endless relies on", () => {
    const { rocks, formation } = endlessWave(1, 31);

    expect({ rocks, formation }).toEqual({
      rocks: [
        { kind: "crystal", size: "large", count: 1 },
        { kind: "stone", size: "large", count: 1 },
        { kind: "ice", size: "large", count: 3 },
        { kind: "lodestone", size: "large", count: 1 },
        { kind: "iron", size: "large", count: 1 },
      ],
      formation: "scatter",
    });
  });

  it("makes the same wave from the same seed and number", () => {
    expect(endlessWave(5, 40)).toEqual(endlessWave(5, 40));
  });

  it("makes waves apart from different seeds", () => {
    const waves = SEEDS.map((seed) => JSON.stringify(endlessWave(seed, 31)));

    expect(new Set(waves).size).toBeGreaterThan(SEEDS.length / 2);
  });

  it.each([
    [31, 10],
    [32, 10.5],
    [45, 17],
    [58, 23.5],
    [59, 24],
    [80, 24],
  ])("spends wave %d's budget of %s large stones' worth", (number, budget) => {
    const worths = SEEDS.map((seed) => worthOf(endlessWave(seed, number)));

    expect(
      worths.filter((worth) => worth > budget + 1e-9 || worth <= budget - 1),
    ).toEqual([]);
  });

  it("lays one crystal in every wave, so pickups keep coming", () => {
    const crystals = everyWave().map((wave) => countOf(wave, "crystal"));

    expect(new Set(crystals)).toEqual(new Set([1]));
  });

  it("spends no more than a third of its budget on iron, two large stones' worth a rock", () => {
    const over = NUMBERS.filter((number) =>
      SEEDS.some(
        (seed) =>
          2 * countOf(endlessWave(seed, number), "iron") > budgetOf(number) / 3,
      ),
    );

    expect(over).toEqual([]);
  });

  it("lays every kind in some wave, its volatiles medium, two at a time", () => {
    const rocks = everyWave().flatMap((wave) => wave.rocks);
    const volatiles = rocks.filter(({ kind }) => kind === "volatile");

    expect({
      kinds: new Set(rocks.map(({ kind }) => kind)),
      volatiles: volatiles.every(
        ({ size, count }) => size === "medium" && count % 2 === 0,
      ),
    }).toEqual({
      kinds: new Set([
        "boulder",
        "crystal",
        "stone",
        "ice",
        "volatile",
        "lodestone",
        "iron",
      ]),
      volatiles: true,
    });
  });

  it.each([
    [31, 0],
    [39, 0],
    [40, 1],
    [41, 0],
    [50, 2],
    [60, 3],
    [70, 3],
  ])("lays wave %d %d boulders", (number, boulders) => {
    const counts = SEEDS.map((seed) =>
      countOf(endlessWave(seed, number), "boulder"),
    );

    expect(new Set(counts)).toEqual(new Set([boulders]));
  });

  it.each([
    [31, 1.25],
    [32, 1.265],
    [50, 1.535],
    [55, 1.6],
    [90, 1.6],
  ])("flies wave %d's rocks at a pace of %s", (number, pace) => {
    expect(endlessWave(1, number).pace).toBeCloseTo(pace);
  });

  it.each([
    [31, { least: 12_000, most: 15_000 }],
    [60, { least: 6000, most: 8000 }],
    [90, { least: 6000, most: 8000 }],
  ])("sends wave %d's comets as often as %o ms apart", (number, every) => {
    expect(endlessWave(1, number).cometEvery).toEqual(every);
  });

  it("sends comets closer together wave by wave until wave 60", () => {
    const leasts = NUMBERS.map(
      (number) => endlessWave(1, number).cometEvery?.least ?? 0,
    );

    expect({
      closing: [...leasts].sort((a, b) => b - a),
      apart: new Set(leasts).size,
    }).toEqual({ closing: leasts, apart: leasts.length });
  });

  it.each([
    [31, 1],
    [49, 1],
    [50, 2],
    [70, 2],
  ])("sends wave %d %d strays", (number, strays) => {
    expect(endlessWave(1, number).strays).toBe(strays);
  });

  it("draws its formation from every one", () => {
    const formations = SEEDS.map((seed) => endlessWave(seed, 31).formation);

    expect(new Set(formations)).toEqual(new Set(FORMATIONS));
  });

  it("scatters a wave of more rocks than a ring or a cluster holds, or lays it as a wall", () => {
    const gathered = everyWave().filter(
      (wave) =>
        wave.rocks.reduce((sum, rocks) => sum + rocks.count, 0) > 13 &&
        (wave.formation === "ring" || wave.formation === "cluster"),
    );

    expect(gathered).toEqual([]);
  });

  it("scatters a wave of boulders, or lays it as a wall", () => {
    const gathered = everyWave().filter(
      (wave) =>
        wave.rocks.some((rocks) => rocks.size === "boulder") &&
        (wave.formation === "ring" || wave.formation === "cluster"),
    );

    expect(gathered).toEqual([]);
  });

  it("lets every pickup come, at Endless's chance, its boulders breaking into stone", () => {
    const { pool, drops, waveKind } = endlessWave(1, 40);

    expect({ pool, drops, waveKind }).toEqual({
      pool: PICKUP_IDS,
      drops: ENDLESS.drops,
      waveKind: "stone",
    });
  });

  it("lays no more rocks than a field holds", () => {
    const counts = everyWave().map((wave) =>
      wave.rocks.reduce((sum, rocks) => sum + rocks.count, 0),
    );

    expect(Math.max(...counts)).toBeLessThanOrEqual(ROCK_CAP);
  });

  it("makes a wave before Endless's first as hard as its first", () => {
    const { pace, cometEvery, strays } = endlessWave(1, 3);

    expect({ pace, cometEvery, strays }).toEqual({
      pace: 1.25,
      cometEvery: { least: 12_000, most: 15_000 },
      strays: 1,
    });
  });
});

describe("waveToPlay", () => {
  it("plays a sector's wave as its data says", () => {
    const entry = waveEntryOf(WAVES, 4);

    expect(waveToPlay(entry, 9)).toEqual(parseWave(entry));
  });

  it("makes an Endless wave from the run's seed and its number", () => {
    expect(waveToPlay(waveEntryOf(WAVES, 40), 9)).toEqual(endlessWave(9, 40));
  });
});
