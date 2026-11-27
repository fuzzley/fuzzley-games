import { KIND_IDS, isKindId } from "./kinds";

describe("KIND_IDS", () => {
  it("lists the design's six kinds, in its order", () => {
    expect(KIND_IDS).toEqual([
      "blue",
      "red",
      "amber",
      "green",
      "violet",
      "pink",
    ]);
  });
});

describe("isKindId", () => {
  it.each(KIND_IDS)("takes %s", (id) => {
    expect(isKindId(id)).toBe(true);
  });

  it.each(["yellow", "Blue", "toString", "", 0, null])(
    "refuses %j",
    (value) => {
      expect(isKindId(value)).toBe(false);
    },
  );
});
