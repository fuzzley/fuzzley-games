import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { commonestKind, frizzballStrikes } from "./frizzball";

describe("commonestKind", () => {
  it("takes the kind in play the board holds the most fuzzballs of", () => {
    const board = boardFrom(["rgr", "gbg"]);

    expect(commonestKind(board, ["red", "green", "blue"])).toBe("green");
  });

  it("counts every fuzzball of a kind, special, caged or burred", () => {
    const board = boardFrom({
      pieces: ["rGgb", "brbg"],
      marks: ["..-.", "...*"],
    });

    expect(commonestKind(board, ["red", "green", "blue"])).toBe("green");
  });

  it("takes the first in play of the kinds held most", () => {
    const board = boardFrom(["rgbg", "brf1"]);

    expect([
      commonestKind(board, ["red", "green", "blue"]),
      commonestKind(board, ["blue", "green", "red"]),
    ]).toEqual(["red", "blue"]);
  });

  it("takes the first kind in play from a board with no fuzzball", () => {
    const board = boardFrom(["f1z"]);

    expect(commonestKind(board, ["violet", "red"])).toBe("violet");
  });
});

describe("frizzballStrikes", () => {
  it("strikes each fuzzball of its kind, special, caged or burred, nearest first, a step each in turn", () => {
    const board = boardFrom({
      pieces: ["Rgrg", "g rr", "r1gr"],
      marks: ["....", "...o", "*..."],
    });

    expect(frizzballStrikes(board, 5, "red")).toEqual([
      { square: 6, step: 1 },
      { square: 0, step: 2 },
      { square: 2, step: 3 },
      { square: 7, step: 4 },
      { square: 8, step: 5 },
      { square: 11, step: 6 },
    ]);
  });

  it("strikes what the sketch's frizzball struck, on the board its swap left", () => {
    const [blast] = MOVE_FIXTURES.frizzballGoesOff.record.waves[0].blasts;
    const board = boardFrom(["b a", "grp", "rab"]);

    expect(frizzballStrikes(board, blast.square, blast.kind)).toEqual(
      blast.strikes,
    );
  });
});
