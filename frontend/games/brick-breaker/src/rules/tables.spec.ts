import { keysOf, pick, recordOf } from "./tables";

describe("keysOf", () => {
  it("returns a record's keys in the order they were written", () => {
    expect(keysOf({ normal: 1, fire: 2, blast: 3 })).toEqual([
      "normal",
      "fire",
      "blast",
    ]);
  });
});

describe("recordOf", () => {
  it("makes an entry for each key from the key", () => {
    expect(recordOf(["a", "bb"], (key) => key.length)).toEqual({ a: 1, bb: 2 });
  });

  it("makes the entries in the keys' order, as the scene's layers are", () => {
    const made: string[] = [];

    recordOf(["back", "middle", "front"], (key) => made.push(key));

    expect(made).toEqual(["back", "middle", "front"]);
  });
});

describe("pick", () => {
  it("copies the entries under the keys given, and no others", () => {
    const brick = { hits: 2, broken: false, cell: 7 };

    expect(pick(brick, ["hits", "broken"])).toEqual({ hits: 2, broken: false });
  });
});
