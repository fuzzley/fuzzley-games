import { stepsBetween } from "../testing/numbers";
import { PICKUPS, PICKUP_IDS, pickup } from "./catalog/pickups";
import {
  type BySize,
  ROCK_KINDS,
  ROCK_KIND_IDS,
  ROCK_SIZES,
  type RockSize,
  type RockTrait,
  rockKind,
  sizeAfter,
} from "./catalog/rocks";
import { WEAPONS } from "./catalog/weapons";
import { EFFECT_KINDS } from "./pickups";
import { stepsIn } from "./stepper";
import { MAX_SHIPS, SHOT_LIFE_MS } from "./tuning";

/** Every rock kind, with its id. */
const ROCK_ENTRIES = ROCK_KIND_IDS.map((id) => [id, rockKind(id)] as const);

const WEAPON_ENTRIES = Object.entries(WEAPONS);

/** Every pickup, with its id. */
const PICKUP_ENTRIES = PICKUP_IDS.map((id) => [id, pickup(id)] as const);

/** Every pickup whose effect lasts a time, with its id and that time. */
const TIMED = PICKUP_ENTRIES.flatMap(([id, entry]) =>
  "ms" in entry.effect ? [[id, entry, entry.effect.ms] as const] : [],
);

/** Returns the sizes a record has a number for, largest first. */
function sizesOf(record: BySize): RockSize[] {
  return ROCK_SIZES.filter((size) => record[size] !== undefined);
}

/** Spells a share as the catalogs' sentences do, twice or half. */
function share(n: number): string {
  const words: Readonly<Record<number, string>> = { 2: "twice", 0.5: "half" };
  return words[n] ?? String(n);
}

/** Returns a pattern that finds a time, in whole seconds, in a sentence. */
function seconds(ms: number): RegExp {
  return new RegExp(String.raw`\b${String(ms / 1000)} seconds\b`);
}

/** Returns a record's numbers, largest size first. */
function valuesOf(record: BySize): number[] {
  return ROCK_SIZES.flatMap((size) => record[size] ?? []);
}

/** Returns the numbers that set a trait, which are all above 0. */
function settingsOf(trait: RockTrait): number[] {
  switch (trait.kind) {
    case "blasts":
      return [...valuesOf(trait.reach), trait.delayMs];
    case "drawn":
      return [trait.pull];
    case "gives":
    case "rings":
      return [];
  }
}

/** Spells a count from one to eight, as the catalogs' sentences do. */
function spelled(n: number): string {
  const words = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
  ];
  return words[n - 1] ?? String(n);
}

/** Every rock kind that breaks into pieces of its own kind or of stone, with its id. */
const SPLITTING = ROCK_ENTRIES.filter(
  ([, kind]) => kind.splits !== null && kind.splits.into !== "wave",
);

/** Every rock kind that blasts, with its id and its blast. */
const BLASTING = ROCK_ENTRIES.flatMap(([id, kind]) =>
  kind.traits.flatMap((trait) =>
    trait.kind === "blasts" ? [[id, kind, trait] as const] : [],
  ),
);

describe("ROCK_KINDS", () => {
  it.each(ROCK_ENTRIES)("names %s in a word or a few", (_, kind) => {
    expect(kind.name).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
  });

  it.each(ROCK_ENTRIES)("says what %s does, in a sentence", (_, kind) => {
    expect(kind.about).toMatch(/^[A-Z].*\.$/);
  });

  it("names every kind apart", () => {
    const names = ROCK_ENTRIES.map(([, kind]) => kind.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it.each([
    [
      "the boulder's hits",
      ROCK_KINDS.boulder.about,
      `${spelled(ROCK_KINDS.boulder.hits.boulder)} hits`,
    ],
    [
      "the boulder's pieces",
      ROCK_KINDS.boulder.about,
      `into ${spelled(ROCK_KINDS.boulder.splits.count)} large`,
    ],
    [
      "ice's pieces",
      ROCK_KINDS.ice.about,
      `into ${spelled(ROCK_KINDS.ice.splits.count)}`,
    ],
    [
      "stone's pieces",
      ROCK_KINDS.stone.about,
      `into ${spelled(ROCK_KINDS.stone.splits.count)}`,
    ],
    [
      "crystal's pieces",
      ROCK_KINDS.crystal.about,
      `into ${spelled(ROCK_KINDS.crystal.splits.count)}`,
    ],
  ])("spells out %s as they are", (_, about, counted) => {
    expect(about).toContain(counted);
  });

  it.each(ROCK_ENTRIES)(
    "gives %s hits and points at every size it comes in, and no other",
    (_, kind) => {
      expect(sizesOf(kind.points)).toEqual(sizesOf(kind.hits));
    },
  );

  it.each(ROCK_ENTRIES)(
    "breaks %s with whole hits, one at least, into whole pieces, for whole points",
    (_, kind) => {
      const counts = [
        ...valuesOf(kind.hits),
        ...valuesOf(kind.points),
        ...(kind.splits ? [kind.splits.count] : []),
      ];

      expect(counts.filter((n) => !(Number.isInteger(n) && n >= 1))).toEqual(
        [],
      );
    },
  );

  it.each(ROCK_ENTRIES)(
    "keeps the boulder's size, and pieces of the wave's kind, to the boulder, not %s",
    (id, kind) => {
      expect([
        kind.hits.boulder !== undefined,
        kind.splits?.into === "wave",
      ]).toEqual([id === "boulder", id === "boulder"]);
    },
  );

  it.each(SPLITTING)(
    "breaks %s into pieces that come in the size after each of its own",
    (_, kind) => {
      const pieces = kind.splits?.into === "stone" ? rockKind("stone") : kind;

      const missing = sizesOf(kind.hits)
        .map(sizeAfter)
        .filter((size) => size !== null && pieces.hits[size] === undefined);

      expect(missing).toEqual([]);
    },
  );

  it.each(ROCK_ENTRIES)("scores %s more at each smaller size", (_, kind) => {
    const falls = stepsBetween(valuesOf(kind.points)).filter(
      (step) => step <= 0,
    );

    expect(falls).toEqual([]);
  });

  it.each(ROCK_ENTRIES)("gives %s each trait once at most", (_, kind) => {
    const traits = kind.traits.map((trait) => trait.kind);

    expect(new Set(traits).size).toBe(traits.length);
  });

  it.each(ROCK_ENTRIES)("sets %s's traits with numbers above 0", (_, kind) => {
    const settings = kind.traits.flatMap(settingsOf);

    expect(settings.filter((n) => !(n > 0))).toEqual([]);
  });

  it.each(BLASTING)(
    "lets %s's blast reach from every size it comes in",
    (_, kind, blast) => {
      expect(sizesOf(blast.reach)).toEqual(sizesOf(kind.hits));
    },
  );

  // A beat of no steps would set a whole chain off in one step.
  it.each(BLASTING)(
    "sets %s's blasts a step apart at least",
    (_, __, blast) => {
      expect(stepsIn(blast.delayMs)).toBeGreaterThanOrEqual(1);
    },
  );

  // Its slot waits for its blast, so a split at the cap would have no room.
  it.each(BLASTING)("breaks %s into nothing, as it blasts", (_, kind) => {
    expect(kind.splits).toBeNull();
  });
});

/** The weapons a pickup gives, every one but the gun. */
const PICKED_WEAPONS = WEAPON_ENTRIES.filter(([id]) => id !== "gun");

describe("WEAPONS", () => {
  it.each(WEAPON_ENTRIES)(
    "keeps %s's shots in flight to whole pulls, one at least",
    (_, weapon) => {
      expect([
        weapon.inFlight >= weapon.count,
        weapon.inFlight % weapon.count,
      ]).toEqual([true, 0]);
    },
  );

  it.each(WEAPON_ENTRIES)(
    "holds a shot's life of %s's pulls in flight, so held fire never waits on its most",
    (_, weapon) => {
      const pulls = Math.ceil(stepsIn(SHOT_LIFE_MS) / stepsIn(weapon.everyMs));

      expect(weapon.inFlight / weapon.count).toBeGreaterThanOrEqual(pulls);
    },
  );

  it.each(WEAPON_ENTRIES)(
    "fans %s's shots only if it fires several a pull",
    (_, weapon) => {
      expect(weapon.spreadDeg > 0).toBe(weapon.count > 1);
    },
  );

  // No pickup is bad, so nothing has to be dodged that looks like a reward.
  it.each(PICKED_WEAPONS)("makes %s no worse than the gun", (_, weapon) => {
    const { gun } = WEAPONS;

    expect({
      count: weapon.count >= gun.count,
      everyMs: weapon.everyMs <= gun.everyMs,
      pullsInFlight: weapon.inFlight / weapon.count >= gun.inFlight / gun.count,
      breaks: weapon.breaks >= gun.breaks,
    }).toEqual({
      count: true,
      everyMs: true,
      pullsInFlight: true,
      breaks: true,
    });
  });

  it.each(PICKED_WEAPONS)(
    "makes %s better than the gun in a way",
    (_, weapon) => {
      const { gun } = WEAPONS;

      expect([
        weapon.count > gun.count,
        weapon.everyMs < gun.everyMs,
        weapon.breaks > gun.breaks,
      ]).toContain(true);
    },
  );
});

describe("PICKUPS", () => {
  it.each(PICKUP_ENTRIES)("names %s in a word or a few", (_, entry) => {
    expect(entry.name).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
  });

  it.each(PICKUP_ENTRIES)("says what %s does, in a sentence", (_, entry) => {
    expect(entry.about).toMatch(/^[A-Z].*\.$/);
  });

  it("names every pickup apart", () => {
    const names = PICKUP_ENTRIES.map(([, entry]) => entry.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it.each(PICKUP_ENTRIES)("weighs %s above nothing", (_, entry) => {
    expect(entry.weight).toBeGreaterThan(0);
  });

  it.each(PICKUP_ENTRIES)(
    "lets %s join from a wave after the first",
    (_, entry) => {
      expect(entry.from).toBeGreaterThan(1);
    },
  );

  it("lists the pickups in the order they join the pool", () => {
    const froms = PICKUP_ENTRIES.map(([, entry]) => entry.from);

    expect(froms).toEqual([...froms].sort((a, b) => a - b));
  });

  it.each(TIMED)("says how long %s lasts", (_, entry, ms) => {
    expect(entry.about).toMatch(seconds(ms));
  });

  it("gives every kind of effect a pickup", () => {
    const given = new Set(PICKUP_ENTRIES.map(([, entry]) => entry.effect.kind));

    expect(EFFECT_KINDS.filter((kind) => !given.has(kind))).toEqual([]);
  });

  it.each(PICKED_WEAPONS)("lets a pickup hand the ship %s", (id) => {
    const handing = PICKUP_ENTRIES.filter(
      ([, entry]) =>
        entry.effect.kind === "weapon" && entry.effect.weapon === id,
    );

    expect(handing).not.toEqual([]);
  });

  it.each([
    [
      "Spread's fan",
      PICKUPS.spread.about.toLowerCase(),
      `${spelled(WEAPONS.spread.count)} shots at each pull, ${String(WEAPONS.spread.spreadDeg)}° apart`,
    ],
    [
      "Rapid's rate",
      PICKUPS.rapid.about,
      `${share(WEAPONS.gun.everyMs / WEAPONS.rapid.everyMs)} as often`,
    ],
    [
      "the Slow's share",
      PICKUPS.slow.about,
      `at ${share(PICKUPS.slow.effect.scale)} their speed`,
    ],
    [
      "the Lance's breaks",
      PICKUPS.lance.about,
      `up to ${spelled(WEAPONS.lance.breaks)} rocks`,
    ],
    [
      "the Magnet's reach",
      PICKUPS.magnet.about,
      `from ${String(PICKUPS.magnet.effect.reach)} units`,
    ],
    [
      "the Extra ship's most",
      PICKUPS.ship.about,
      `up to ${spelled(MAX_SHIPS)}`,
    ],
    [
      "the Nova's reach",
      PICKUPS.nova.about,
      `${String(PICKUPS.nova.effect.reach)} units out`,
    ],
  ])("spells out %s as it is", (_, about, words) => {
    expect(about).toContain(words);
  });
});
