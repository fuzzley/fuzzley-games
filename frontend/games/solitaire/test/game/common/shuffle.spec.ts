import { describe, it, expect } from "vitest";
import { shuffle } from "@/game/common/shuffle";
import { sequenceRandom } from "@test/support/sequence_random";

describe("shuffle", () => {
  it("reorders the items using the provided randomness source", () => {
    const items = ["a", "b", "c"];

    shuffle(items, sequenceRandom([0.6, 0.2, 0.8]));

    expect(items).toEqual(["c", "a", "b"]);
  });

  it("keeps every item it was given", () => {
    const items = [1, 2, 3, 4, 5];

    shuffle(items, sequenceRandom([0.1, 0.9, 0.5, 0.3]));

    expect([...items].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("leaves a single-item array alone", () => {
    const items = ["only"];

    shuffle(items, sequenceRandom([0.5]));

    expect(items).toEqual(["only"]);
  });

  it("does not throw on an empty array", () => {
    const items: string[] = [];

    expect(() => shuffle(items, sequenceRandom([0.5]))).not.toThrow();
  });
});
