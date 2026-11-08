import {
  booleanOr,
  countsByIdOf,
  isCount,
  isFiniteNumber,
  isListOf,
  isRecord,
  isWhole,
  knownIdsOf,
  listOf,
  unknownKey,
} from "./json";

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

describe("isFiniteNumber", () => {
  it.each([0, -2.5, Number.MAX_VALUE])("accepts %j", (value) => {
    expect(isFiniteNumber(value)).toBe(true);
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "3",
    null,
    undefined,
  ])("refuses %s", (value) => {
    expect(isFiniteNumber(value)).toBe(false);
  });
});

describe("listOf", () => {
  /** Reads a spec's item: a whole number, doubled. */
  const doubled = (item: unknown): number | null =>
    isWhole(item) ? item * 2 : null;

  it("reads each item of a list, in its order", () => {
    expect(listOf([3, 1, 2], doubled)).toEqual([6, 2, 4]);
  });

  it("reads an empty list as an empty list", () => {
    expect(listOf([], doubled)).toEqual([]);
  });

  it("keeps an item that reads as nothing but null", () => {
    expect(listOf([0, "", false], (item) => item)).toEqual([0, "", false]);
  });

  it("reads no list from one with an item that doesn't read", () => {
    expect(listOf([3, 1.5, 2], doubled)).toBeNull();
  });

  it.each([undefined, null, "12", { 0: 1 }])(
    "reads no list from %j, which isn't one",
    (value) => {
      expect(listOf(value, doubled)).toBeNull();
    },
  );

  it("types the list as one of what each item reads as", () => {
    expectTypeOf(listOf([3], doubled)).toEqualTypeOf<number[] | null>();
  });
});

describe("isListOf", () => {
  it.each([[[3, 0, -1]], [[]]])("accepts %j", (value) => {
    expect(isListOf(value, isWhole)).toBe(true);
  });

  it.each([[[3, 1.5]], [[null]], [undefined], ["12"], [{ 0: 1 }]])(
    "refuses %j",
    (value) => {
      expect(isListOf(value, isWhole)).toBe(false);
    },
  );

  it("hands the check each item alone, not its index", () => {
    const isZero = (item: unknown, index?: number): item is 0 =>
      item === 0 && index === undefined;

    expect(isListOf([0, 0], isZero)).toBe(true);
  });

  it("types the list as one of the items its check passes", () => {
    expectTypeOf((value: unknown) =>
      isListOf(value, isWhole),
    ).guards.toEqualTypeOf<number[]>();
  });
});

describe("booleanOr", () => {
  it.each([true, false])("takes %j", (value) => {
    expect(booleanOr(value, !value)).toBe(value);
  });

  it.each<[unknown, boolean]>([
    ["true", false],
    [1, false],
    [0, true],
    [null, true],
    [undefined, false],
  ])("takes the fallback for %j", (value, fallback) => {
    expect(booleanOr(value, fallback)).toBe(fallback);
  });
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

describe("knownIdsOf", () => {
  /** The ids a spec's lists may hold. */
  const KNOWN = new Set(["near", "far"]);

  it("takes the known ids of a list", () => {
    expect(knownIdsOf(["far", "near"], KNOWN)).toEqual(
      new Set(["far", "near"]),
    );
  });

  it("drops an id it doesn't know, and what isn't an id", () => {
    expect(knownIdsOf(["far", "gone", 3, null], KNOWN)).toEqual(
      new Set(["far"]),
    );
  });

  it.each([undefined, "far", { 0: "far" }])(
    "takes none from %j, which isn't a list",
    (value) => {
      expect(knownIdsOf(value, KNOWN)).toEqual(new Set());
    },
  );
});

describe("countsByIdOf", () => {
  /** The ids a spec's records hold counts for. */
  const IDS = ["near", "far"];
  /** The keys a spec's records hold counts under. */
  const KEYS = ["relaxed", "normal", "fast"] as const;

  it("takes each id's counts under the keys given", () => {
    expect(
      countsByIdOf(
        { near: { relaxed: 40, fast: 0 }, far: { normal: 900 } },
        IDS,
        KEYS,
      ),
    ).toEqual({ near: { relaxed: 40, fast: 0 }, far: { normal: 900 } });
  });

  it("drops what isn't a count, a key not given and an id not given", () => {
    expect(
      countsByIdOf(
        {
          near: { normal: 900, fast: -1, relaxed: "2", custom: 5 },
          gone: { normal: 1 },
        },
        IDS,
        KEYS,
      ),
    ).toEqual({ near: { normal: 900 } });
  });

  it("leaves out an id with no counts", () => {
    expect(countsByIdOf({ near: { fast: 1.5 }, far: null }, IDS, KEYS)).toEqual(
      {},
    );
  });

  it("takes no counts from a list, even under its index", () => {
    expect(countsByIdOf({ near: [900] }, ["near"], ["0"])).toEqual({});
  });

  it("takes none from a list, even with an id that is its index", () => {
    expect(countsByIdOf([{ relaxed: 40 }], ["0"], KEYS)).toEqual({});
  });
});
