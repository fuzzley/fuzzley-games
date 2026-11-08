import {
  type SeedStream,
  createRandom,
  drawAt,
  mixSeed,
  randomSeed,
  shuffled,
} from "./random";
import { keysOf } from "./records";

/**
 * The seeds each stream mixes from seed 1 for the numbers 1 to 3, which saved
 * games rely on, typed by every stream so a new one is pinned too.
 */
const PINS = {
  draw: [-1640531536, 1013904227, -626627310],
  field: [-2048144790, 198677719, -1849467072],
  makeup: [-1028477388, -2056954773, 1209535134],
  scenery: [374761392, 749522787, 1124284178],
} satisfies Record<SeedStream, readonly number[]>;

/** The seeds each stream mixes from seed −7 for the numbers 1 to 3. */
const NEGATIVE_PINS = {
  draw: [1640531528, -1013904229, 626627306],
  field: [2048144786, -198677713, 1849467064],
  makeup: [1028477388, 2056954771, -1209535130],
  scenery: [-374761400, -749522789, -1124284182],
} satisfies Record<SeedStream, readonly number[]>;

describe("createRandom", () => {
  it("keeps Mulberry32's sequence, which saved games rely on", () => {
    const random = createRandom(1);

    const draws = Array.from({ length: 3 }, () => random() * 2 ** 32);

    expect(draws).toEqual([2693262067, 11749833, 2265367787]);
  });

  it("gives the same numbers for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gives other numbers for another seed", () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it("gives numbers from 0 up to 1", () => {
    const random = createRandom(7);
    const numbers = Array.from({ length: 1000 }, random);

    expect(numbers.every((n) => n >= 0 && n < 1)).toBe(true);
  });
});

describe("drawAt", () => {
  it("keeps the numbers a seed draws, which saved games rely on", () => {
    const draws = [1, 2, 3].map((n) => drawAt(1, n) * 2 ** 32);

    expect(draws).toEqual([2197834832, 2224532361, 1846942522]);
  });

  it("keeps the numbers a negative seed draws", () => {
    const draws = [1, 2, 3].map((n) => drawAt(-7, n) * 2 ** 32);

    expect(draws).toEqual([1618267339, 634116645, 624449489]);
  });
});

describe("mixSeed", () => {
  it.each(keysOf(PINS))(
    "keeps the seeds its %s stream mixes, which saved games rely on",
    (stream) => {
      expect([1, 2, 3].map((n) => mixSeed(1, n, stream))).toEqual(PINS[stream]);
    },
  );

  it.each(keysOf(NEGATIVE_PINS))(
    "keeps the seeds its %s stream mixes from a negative seed",
    (stream) => {
      expect([1, 2, 3].map((n) => mixSeed(-7, n, stream))).toEqual(
        NEGATIVE_PINS[stream],
      );
    },
  );

  it("mixes a seed apart in every stream, for each of the first thousand numbers", () => {
    const streams = keysOf(PINS);

    const mixed = new Set(
      streams.flatMap((stream) =>
        Array.from({ length: 1000 }, (_, n) => mixSeed(1, n + 1, stream)),
      ),
    );

    expect(mixed.size).toBe(streams.length * 1000);
  });
});

describe("randomSeed", () => {
  it("makes a whole number of 32 bits from the source given", () => {
    expect(randomSeed(() => 0.5)).toBe(-2147483648);
  });
});

describe("shuffled", () => {
  it("keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    expect(shuffled(items, createRandom(3)).sort()).toEqual(items);
  });

  it("orders them by the source given", () => {
    expect(shuffled(["a", "b", "c"], () => 0)).toEqual(["a", "b", "c"]);
  });

  it("keeps the order a seed gives, which seeded deals rely on", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    expect(shuffled(items, createRandom(3))).toEqual([
      7, 1, 5, 2, 8, 4, 6, 3, 9,
    ]);
  });
});
