import { facing, facingAgain, moves, sets, spawns, tuftsOf } from "./part";

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

describe("facingAgain", () => {
  it("gives a piece a face again at a moment, as of a moment before", () => {
    expect(facingAgain(4, 300, "rest", 100)).toEqual({
      what: "face-again",
      piece: 4,
      atMs: 300,
      face: "rest",
      sinceMs: 100,
    });
  });
});

describe("spawns", () => {
  it("spawns the effect", () => {
    const shake = { what: "shake", atMs: 100, px: 3 } as const;

    expect(spawns(shake)).toEqual({ what: "effect", effect: shake });
  });
});

describe("tuftsOf", () => {
  it("throws tufts of a kind's fur from a place", () => {
    expect(tuftsOf("red", 100, { x: 1, y: 2 }, 5, 1.5)).toEqual([
      {
        what: "effect",
        effect: {
          what: "fluff",
          atMs: 100,
          at: { x: 1, y: 2 },
          tuft: "tuft-red",
          count: 5,
          power: 1.5,
        },
      },
    ]);
  });

  it("throws none for no kind", () => {
    expect(tuftsOf(null, 100, { x: 1, y: 2 }, 5, 1.5)).toEqual([]);
  });
});
