import { itemAt } from "./items";

describe("itemAt", () => {
  const frames = ["tile-0", "tile-1"];

  it("gives the item at a place in a list", () => {
    expect(itemAt(frames, 1)).toBe("tile-1");
  });

  it.each([-1, 2, 0.5])("refuses place %s, which the list hasn't", (at) => {
    expect(() => itemAt(frames, at)).toThrow(RangeError);
  });
});
