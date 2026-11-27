import { facing, moves, sets } from "./part";

describe("moves", () => {
  it("keys each number given, in the order of the look's numbers, over the while given", () => {
    expect(moves(4, 100, 50, "back", { y: 2, x: 1 })).toEqual([
      {
        what: "key",
        piece: 4,
        channel: "x",
        key: { atMs: 100, ms: 50, to: 1, easing: "back" },
      },
      {
        what: "key",
        piece: 4,
        channel: "y",
        key: { atMs: 100, ms: 50, to: 2, easing: "back" },
      },
    ]);
  });
});

describe("sets", () => {
  it("keys each number given to jump at the moment", () => {
    expect(sets(4, 100, { raise: 2 })).toEqual([
      {
        what: "key",
        piece: 4,
        channel: "raise",
        key: { atMs: 100, ms: 0, to: 2, easing: "linear" },
      },
    ]);
  });
});

describe("facing", () => {
  it("gives the piece's eyes the face at the moment", () => {
    expect(facing(4, 100, "cross")).toEqual({
      what: "face",
      piece: 4,
      atMs: 100,
      face: "cross",
    });
  });
});
