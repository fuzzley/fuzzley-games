import { describe, expect, it } from "vitest";
import { seedFrom } from "@/engine/core/random/seed_from";

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
