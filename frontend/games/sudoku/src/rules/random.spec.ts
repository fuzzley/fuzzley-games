import { createRandom, randomSeed, shuffled } from "./random";

describe("createRandom", () => {
  it("gives the same numbers for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("gives numbers from 0 up to 1", () => {
    const random = createRandom(7);
    const numbers = Array.from({ length: 1000 }, random);

    expect(numbers.every((n) => n >= 0 && n < 1)).toBe(true);
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
});
