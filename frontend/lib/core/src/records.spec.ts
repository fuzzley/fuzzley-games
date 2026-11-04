import { keysOf, pick, recordOf } from "./records";

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

describe("pick", () => {
  it("copies the entries under the keys given, and no others", () => {
    const brick = { hits: 2, broken: false, cell: 7 };

    expect(pick(brick, ["hits", "broken"])).toEqual({ hits: 2, broken: false });
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
