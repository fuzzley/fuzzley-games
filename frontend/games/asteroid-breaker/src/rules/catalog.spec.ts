import { stepsBetween } from "../testing/numbers";
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
import { stepsIn } from "./stepper";
import { SHOT_LIFE_MS } from "./tuning";

/** Every rock kind, with its id. */
const ROCK_ENTRIES = ROCK_KIND_IDS.map((id) => [id, rockKind(id)] as const);

const WEAPON_ENTRIES = Object.entries(WEAPONS);

/** Returns the sizes a record has a number for, largest first. */
function sizesOf(record: BySize): RockSize[] {
  return ROCK_SIZES.filter((size) => record[size] !== undefined);
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
