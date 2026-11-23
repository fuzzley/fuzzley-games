import { DANGER_ROW } from "../../rules/wall";
import { madeUpPlay, readMadeUpShot } from "./wall";

/** Returns the hits of the bricks of a wall, by wall cell, `.` for none. */
function hitsOf(wall: {
  readonly bricks: readonly ({ readonly hits: number } | null)[];
}): string {
  return wall.bricks.map((brick) => brick?.hits ?? ".").join("");
}

describe("madeUpPlay", () => {
  it("opens a level where a jump would land its wall", () => {
    expect(madeUpPlay(["1........"], 11).opening.wall.lowestRow).toBe(5);
  });

  it("gives each of nine aims one shot, the aim alone", () => {
    expect(madeUpPlay(["1........"], 11).shots).toEqual([
      [0],
      [1],
      [2],
      [3],
      [4],
      [5],
      [6],
      [7],
      [8],
    ]);
  });

  it("breaks the lowest brick in its aim's column, whole, and brings the wall down a row", () => {
    const play = madeUpPlay(["3........", "2...1...."], 11);

    const { outcome, next } = play.play(play.opening, 0);

    expect({
      outcome,
      hits: hitsOf(next.wall),
      lowestRow: next.wall.lowestRow,
    }).toEqual({
      outcome: { result: "on", jumped: false },
      hits: "....1....3........",
      lowestRow: 4,
    });
  });

  it("is stopped by a brick that never breaks", () => {
    const play = madeUpPlay(["1........", "#...1...."], 11);

    const { next } = play.play(play.opening, 0);

    expect(hitsOf(next.wall)).toBe("0...1....1........");
  });

  it("clears a level once no clay is left, the wall where it stood", () => {
    const play = madeUpPlay(["m...1...."], 11);

    const { outcome, next } = play.play(play.opening, 4);

    expect({ outcome, lowestRow: next.wall.lowestRow }).toEqual({
      outcome: { result: "cleared", jumped: false },
      lowestRow: 5,
    });
  });

  it("jumps the wall once no clay stands under the jump line", () => {
    const play = madeUpPlay(
      ["1...1....", ".........", ".........", "........."],
      11,
    );

    const { outcome, next } = play.play(play.opening, 0);

    expect({ outcome, lowestRow: next.wall.lowestRow }).toEqual({
      outcome: { result: "on", jumped: true },
      lowestRow: 2,
    });
  });

  it("loses a level once clay reaches the floor's row", () => {
    const play = madeUpPlay(["#........"], 11);
    const start = { wall: { ...play.opening.wall, lowestRow: DANGER_ROW } };

    expect(play.play(start, 8).outcome.result).toBe("lost");
  });

  it.each([[9], [-1], [1.5]])(
    "throws a RangeError for a shot at %j, which isn't one of its aims",
    (aim) => {
      const play = madeUpPlay(["1........"], 11);

      expect(() => play.play(play.opening, aim)).toThrow(RangeError);
    },
  );

  it("measures a wall by the hits left in it, of every kind, the fewer the better", () => {
    const play = madeUpPlay(["m...2...1"], 11);

    const scores = [0, 4, 8].map((aim) =>
      play.score(play.play(play.opening, aim), 1),
    );

    expect(scores).toEqual([-3, -4, -5]);
  });

  it("measures a cleared level over any wall, the fewer rounds the better, and a lost one under", () => {
    const play = madeUpPlay(["1........"], 11);
    const round = (result: "cleared" | "lost") => ({
      outcome: { result, jumped: false },
      next: play.opening,
    });

    const scores = [
      play.score(round("cleared"), 2),
      play.score(round("cleared"), 3),
      play.score(play.play(play.opening, 8), 1),
      play.score(round("lost"), 1),
    ];

    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("tells starts apart by their bricks' hits and where the wall stands", () => {
    const play = madeUpPlay(["1...1...."], 11);
    const keys = [0, 4, 8].map((aim) =>
      play.keyOf(play.play(play.opening, aim).next),
    );

    expect(new Set([...keys, play.keyOf(play.opening)]).size).toBe(4);
  });
});

describe("readMadeUpShot", () => {
  it("reads an aim", () => {
    expect(readMadeUpShot(8)).toBe(8);
  });

  it.each([[9], [-1], [1.5], ["4"], [[4, 0]]])(
    "throws a RangeError for %j",
    (kept) => {
      expect(() => readMadeUpShot(kept)).toThrow(RangeError);
    },
  );
});
