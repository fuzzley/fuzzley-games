import { describe, expect, it } from "vitest";
import { seedFrom, seededRandom } from "@/engine/core/random/seeded_random";

/** Returns the first `count` values a generator yields. */
function take(random: () => number, count: number): number[] {
  return Array.from({ length: count }, () => random());
}

describe("seededRandom", () => {
  it("yields the same sequence for the same seed", () => {
    expect(take(seededRandom(7), 5)).toEqual(take(seededRandom(7), 5));
  });

  it("yields a different sequence for a different seed", () => {
    expect(take(seededRandom(7), 5)).not.toEqual(take(seededRandom(8), 5));
  });

  it("stays within [0, 1)", () => {
    const values = take(seededRandom(1), 1000);

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("seedFrom", () => {
  it("gives the same seed for the same parts", () => {
    expect(seedFrom(["a", "b"])).toBe(seedFrom(["a", "b"]));
  });

  it("depends on the order of the parts", () => {
    expect(seedFrom(["a", "b"])).not.toBe(seedFrom(["b", "a"]));
  });

  it("tells apart parts that join to the same text", () => {
    expect(seedFrom(["ab", "c"])).not.toBe(seedFrom(["a", "bc"]));
  });
});
