import { itemAt } from "./items";

describe("itemAt", () => {
  const items = ["first", "second"] as const;

  it("returns the item at a place in a list", () => {
    expect(itemAt(items, 1)).toBe("second");
  });

  it.each([-1, 2, 0.5])("refuses %d, a place the list hasn't", (at) => {
    expect(() => itemAt(items, at)).toThrow(RangeError);
  });
});
