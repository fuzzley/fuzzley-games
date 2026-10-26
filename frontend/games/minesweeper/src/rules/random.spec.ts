import { createRandom, randomSeed } from "./random";

describe("createRandom", () => {
  it("draws the same numbers for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("draws other numbers for another seed", () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it("draws from 0 up to 1", () => {
    const random = createRandom(7);

    const draws = Array.from({ length: 1000 }, random);

    expect(draws.every((n) => n >= 0 && n < 1)).toBe(true);
  });
});

describe("randomSeed", () => {
  it("makes a whole number of 32 bits", () => {
    expect(randomSeed(() => 0.75)).toBe(-(2 ** 30));
  });
});
