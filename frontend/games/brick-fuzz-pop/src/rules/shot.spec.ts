import { isAim, isCharge } from "./shot";

describe("isAim", () => {
  it.each([0, 1, 328, 656])("takes %s for an aim", (value) => {
    expect(isAim(value)).toBe(true);
  });

  it.each([-1, 657, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3", null])(
    "refuses %s",
    (value) => {
      expect(isAim(value)).toBe(false);
    },
  );
});

describe("isCharge", () => {
  it.each([0, 1, 2, 3, 4, 5])("takes %s for a charge", (value) => {
    expect(isCharge(value)).toBe(true);
  });

  it.each([-1, 6, 2.5, Number.NaN, "2", undefined])("refuses %s", (value) => {
    expect(isCharge(value)).toBe(false);
  });
});
