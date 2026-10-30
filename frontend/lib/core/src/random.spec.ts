import { createRandom, drawAt, randomSeed, shuffled } from "./random";

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
