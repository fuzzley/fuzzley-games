import { isRecord, isWhole } from "./json";

describe("isRecord", () => {
  it("accepts an object", () => {
    expect(isRecord({ level: "easy" })).toBe(true);
  });

  it.each([null, [], "{}", 3])("refuses %j", (value) => {
    expect(isRecord(value)).toBe(false);
  });
});

describe("isWhole", () => {
  it("accepts a whole number", () => {
    expect(isWhole(-3)).toBe(true);
  });

  it.each([1.5, "3", Number.NaN, null])("refuses %j", (value) => {
    expect(isWhole(value)).toBe(false);
  });
});
