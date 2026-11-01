import { isCount, isRecord, isWhole, unknownKey } from "./json";

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

describe("isCount", () => {
  it.each([0, 12, Number.MAX_SAFE_INTEGER])("accepts %j", (value) => {
    expect(isCount(value)).toBe(true);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3", null])(
    "refuses %j",
    (value) => {
      expect(isCount(value)).toBe(false);
    },
  );
});

describe("unknownKey", () => {
  /** The keys a spec's values may have. */
  const KNOWN = { id: true, pace: true } as const;

  it.each([
    ["known keys alone", { id: "a", pace: 1 }],
    ["no keys", {}],
  ])("finds none in a value of %s", (_, value) => {
    expect(unknownKey(value, KNOWN)).toBeNull();
  });

  it("finds the first key the known keys lack", () => {
    expect(unknownKey({ id: "a", pase: 1, colour: 2 }, KNOWN)).toBe("pase");
  });

  it("finds an empty key, as a half-typed one would leave", () => {
    expect(unknownKey({ "": 1 }, KNOWN)).toBe("");
  });

  it("knows no key from the known keys' prototype", () => {
    expect(unknownKey({ toString: 1 }, KNOWN)).toBe("toString");
  });
});
