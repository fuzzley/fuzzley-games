import { isBoon, isCharge } from "./shot";

describe("isCharge", () => {
  it.each([0, 1, 2, 3, 4, 5])("takes %s for a charge", (value) => {
    expect(isCharge(value)).toBe(true);
  });

  it.each([-1, 6, 2.5, Number.NaN, "2", undefined])("refuses %s", (value) => {
    expect(isCharge(value)).toBe(false);
  });
});

describe("isBoon", () => {
  it.each(["hot", "triple"])("takes %s for a boon", (value) => {
    expect(isBoon(value)).toBe(true);
  });

  it.each(["Hot", "double", "", "toString", 1, null])("refuses %s", (value) => {
    expect(isBoon(value)).toBe(false);
  });
});
