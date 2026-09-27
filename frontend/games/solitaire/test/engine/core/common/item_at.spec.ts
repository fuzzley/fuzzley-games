import { describe, it, expect } from "vitest";
import { itemAt } from "@/engine/core/common/item_at";

describe("itemAt", () => {
  it("returns the item at an index in range", () => {
    expect(itemAt(["a", "b", "c"], 1)).toBe("b");
  });

  it("returns an item that is itself undefined", () => {
    expect(itemAt([undefined], 0)).toBeUndefined();
  });

  it.each([
    ["past the end", 3],
    ["before the start", -1],
    ["between two items", 0.5],
  ])("throws for an index %s", (_name, index) => {
    expect(() => itemAt(["a", "b", "c"], index)).toThrow(RangeError);
  });
});
