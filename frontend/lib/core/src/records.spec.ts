import { keysOf, recordOf } from "./records";

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
