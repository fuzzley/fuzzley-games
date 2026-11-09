import { isKeyOf, isOneOf, keysOf, pick, recordOf } from "./records";

describe("keysOf", () => {
  it("returns a record's keys in the order they were written", () => {
    expect(keysOf({ normal: 1, fire: 2, blast: 3 })).toEqual([
      "normal",
      "fire",
      "blast",
    ]);
  });

  it("types the keys as the record's own", () => {
    expectTypeOf(keysOf({ normal: 1, fire: 2 })).toEqualTypeOf<
      readonly ("normal" | "fire")[]
    >();
  });
});

describe("isKeyOf", () => {
  /** A catalog whose ids a spec's values may name. */
  const KINDS = { stone: 1, iron: 2 } as const;

  it.each(["stone", "iron"])(
    "accepts %j, a key of the record's own",
    (value) => {
      expect(isKeyOf(value, KINDS)).toBe(true);
    },
  );

  it.each(["gold", "", "toString", "constructor", 1, null, undefined])(
    "refuses %j",
    (value) => {
      expect(isKeyOf(value, KINDS)).toBe(false);
    },
  );

  it("refuses a number, even one a record holds a key for", () => {
    expect(isKeyOf(0, { 0: "zero" })).toBe(false);
  });

  it("types the key as the record's own", () => {
    expectTypeOf((value: unknown) =>
      isKeyOf(value, KINDS),
    ).guards.toEqualTypeOf<"stone" | "iron">();
  });
});

describe("isOneOf", () => {
  /** The choices a spec's values may name. */
  const SPEEDS = ["slow", "normal", "fast"] as const;

  it.each(SPEEDS)("accepts %j", (value) => {
    expect(isOneOf(value, SPEEDS)).toBe(true);
  });

  it.each(["Normal", "", "length", 0, null, undefined])(
    "refuses %j",
    (value) => {
      expect(isOneOf(value, SPEEDS)).toBe(false);
    },
  );

  it("refuses a list holding one", () => {
    expect(isOneOf(["slow"], SPEEDS)).toBe(false);
  });

  it("refuses a value only loosely equal to one", () => {
    expect(isOneOf("1", [1, 2])).toBe(false);
  });

  it("types the value as one of those given", () => {
    expectTypeOf((value: unknown) =>
      isOneOf(value, SPEEDS),
    ).guards.toEqualTypeOf<"slow" | "normal" | "fast">();
  });
});

describe("pick", () => {
  it("copies the entries under the keys given, and no others", () => {
    const brick = { hits: 2, broken: false, cell: 7 };

    expect(pick(brick, ["hits", "broken"])).toEqual({ hits: 2, broken: false });
  });

  it("leaves out a key the record doesn't have, rather than setting it to undefined", () => {
    const brick: { hits: number; capsule?: string } = { hits: 2 };

    expect(pick(brick, ["hits", "capsule"])).toStrictEqual({ hits: 2 });
  });

  it("keeps a key the record has, even one set to undefined", () => {
    const brick: { hits: number; capsule: string | undefined } = {
      hits: 2,
      capsule: undefined,
    };

    expect(pick(brick, ["hits", "capsule"])).toStrictEqual({
      hits: 2,
      capsule: undefined,
    });
  });

  it("types the copy as the record's entries under those keys alone", () => {
    const brick = { hits: 2, broken: false, cell: 7 };

    expectTypeOf(pick(brick, ["hits", "broken"])).toEqualTypeOf<{
      hits: number;
      broken: boolean;
    }>();
  });
});

describe("recordOf", () => {
  it("makes an entry for each key from the key", () => {
    expect(recordOf(["a", "bb"], (key) => key.length)).toEqual({ a: 1, bb: 2 });
  });

  it("makes the entries in the keys' order, as a scene's layers are", () => {
    const made: string[] = [];

    recordOf(["back", "middle", "front"], (key) => made.push(key));

    expect(made).toEqual(["back", "middle", "front"]);
  });
});
