import type { Wave } from "../../rules/move/record";
import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import { gridOf, moveStartOf } from "../../testing/shown_board";
import type { GridShown } from "../run_state";
import { afterSwap, afterWave, goesOff } from "./board_after";
import { standingOn } from "./standing";

/** Returns the id of the piece on each square of a board, or null for none or a gap. */
function idsOf(grid: GridShown): readonly (number | null)[] {
  return grid.squares.map((square) => square?.piece?.id ?? null);
}

/** Returns the board after a move played by hand's swap and its first wave. */
function afterFirstWave(fixture: MoveFixture): GridShown {
  const [wave] = fixture.record.waves;
  if (wave === undefined) {
    throw new Error("The move plays no wave.");
  }
  return afterWave(
    afterSwap(moveStartOf(fixture).grid, fixture.record.swap),
    wave,
  );
}

/** A wave of nothing but the given hits and falls. */
function waveOf(parts: Partial<Wave>): Wave {
  return {
    number: 1,
    bunches: [],
    blasts: [],
    hits: [],
    falls: [],
    goalsLeft: [],
    ...parts,
  };
}

describe("afterSwap", () => {
  const grid = gridOf(boardFrom({ pieces: ["rgb"], marks: ["-o."] }));

  it("trades the two pieces of a swap kept", () => {
    expect(idsOf(afterSwap(grid, { from: 1, to: 2, refused: false }))).toEqual([
      1, 3, 2,
    ]);
  });

  it("stands the first of two specials on the second's square, the second gone", () => {
    expect(idsOf(afterSwap(grid, { from: 0, to: 1, refused: false }))).toEqual([
      null,
      1,
      3,
    ]);
  });

  it.each([
    ["a swap refused", { from: 1, to: 2, refused: true }],
    ["a special set off where it stands", { from: 1, to: 1, refused: false }],
  ])("leaves the board as it was after %s", (_, swap) => {
    expect(afterSwap(grid, swap)).toBe(grid);
  });
});

describe("afterWave", () => {
  it("lets fuzzballs in where a bunch was gathered", () => {
    expect(idsOf(afterFirstWave(MOVE_FIXTURES.bunch))).toEqual([
      10, 11, 12, 4, 2, 6, 7, 8, 9,
    ]);
  });

  it("stands the special a bunch made where it falls to", () => {
    const grid = afterFirstWave(MOVE_FIXTURES.dasherAcrossMade);

    expect(idsOf(grid)).toEqual([15, 2, 3, 14, 5, 6, 13, 7, 9, 8, 11, 12]);
    expect(grid.squares[9]?.piece).toEqual({
      what: "fuzzball",
      id: 8,
      kind: "blue",
      special: "dasher-across",
      caged: false,
      burred: false,
    });
  });

  it("makes a frizzball of a bunch that makes one", () => {
    expect(
      afterFirstWave(MOVE_FIXTURES.frizzballMade).squares[2]?.piece,
    ).toEqual({ what: "frizzball", id: 8 });
  });

  it("takes off the specials that go off, two swapped together among them", () => {
    expect(idsOf(afterFirstWave(MOVE_FIXTURES.twoDashers))).toEqual([
      10, 13, 14, 1, 12, 3, 7, 11, 9,
    ]);
  });

  it("rolls a fuzzball let in past a brick, and takes a layer off the brick", () => {
    const grid = afterFirstWave(MOVE_FIXTURES.rollAndRefill);

    expect(idsOf(grid)).toEqual([12, 2, 11, 1, 10, 3, 7, 5, 9]);
    expect(grid.squares[1]?.piece).toMatchObject({ what: "brick", layers: 1 });
  });

  it("sweeps a layer of dust off each square a bunch was on", () => {
    expect(
      afterFirstWave(MOVE_FIXTURES.dustSwept).squares.map(
        (square) => square?.dust,
      ),
    ).toEqual([1, 0, 1, 0, 0, 0, 0, 0, 0]);
  });

  it("frees a fuzzball of its cage and its burr", () => {
    const grid = gridOf(boardFrom({ pieces: ["R."], marks: [".*"] }));

    const freed = afterWave(
      grid,
      waveOf({
        hits: [
          { what: "uncaged", square: 0, step: 1, blast: null, piece: 1 },
          { what: "unburred", square: 1, step: 1, blast: null, piece: 2 },
        ],
      }),
    );

    expect(freed.squares.map((square) => square?.piece)).toMatchObject([
      { caged: false },
      { burred: false },
    ]);
  });

  it("takes a sleepyhead put to bed off the board once it has fallen", () => {
    const grid = gridOf(boardFrom(["z", " "]));

    const bedded = afterWave(
      grid,
      waveOf({
        hits: [{ what: "bedded", square: 1, piece: 1 }],
        falls: [{ piece: 1, kind: null, from: 0, path: [1], lane: 0 }],
      }),
    );

    expect(idsOf(bedded)).toEqual([null, null]);
  });

  it("refuses a fall of a piece from a square it isn't on", () => {
    const grid = gridOf(boardFrom(["r", " "]));

    expect(() =>
      afterWave(
        grid,
        waveOf({
          falls: [{ piece: 9, kind: "red", from: 0, path: [1], lane: 0 }],
        }),
      ),
    ).toThrow(RangeError);
  });

  it("refuses a fuzzball let in with no kind", () => {
    const grid = gridOf(boardFrom([" "]));

    expect(() =>
      afterWave(
        grid,
        waveOf({
          falls: [{ piece: 9, kind: null, from: null, path: [0], lane: 0 }],
        }),
      ),
    ).toThrow(RangeError);
  });
});

describe("goesOff", () => {
  it.each([
    ["a plain fuzzball", ["r"], false],
    ["a special", { pieces: ["r"], marks: ["o"] }, true],
    ["the frizzball", ["f"], true],
    ["a brick", ["1"], false],
  ] as const)(
    "says whether %s goes off as it is swapped",
    (_, picture, goes) => {
      expect(goesOff(standingOn(gridOf(boardFrom(picture)), 0).piece)).toBe(
        goes,
      );
    },
  );
});
