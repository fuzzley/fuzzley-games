import { keysOf } from "./records";

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
