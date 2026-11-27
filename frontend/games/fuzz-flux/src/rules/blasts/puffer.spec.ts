import { itemAt } from "@fz/core/records";
import { boardFrom } from "../../testing/board_picture";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import type { Blast } from "../move/record";
import { PUFFER_REACH, TWO_PUFFERS_REACH } from "../tuning";
import { pufferStrikes } from "./puffer";

/** A board 7 squares a side, with no gap. */
const BOARD = boardFrom(
  Array.from({ length: 7 }, (_, y) => (y % 2 === 0 ? "rgrgrgr" : "grgrgrg")),
);

describe("pufferStrikes", () => {
  it("strikes the 13 squares within 2 steps, in 2 rings out from itself", () => {
    const strikes = pufferStrikes(BOARD, 24, PUFFER_REACH);

    expect(strikes).toEqual([
      { square: 24, step: 0 },
      { square: 17, step: 1 },
      { square: 23, step: 1 },
      { square: 25, step: 1 },
      { square: 31, step: 1 },
      { square: 10, step: 2 },
      { square: 16, step: 2 },
      { square: 18, step: 2 },
      { square: 22, step: 2 },
      { square: 26, step: 2 },
      { square: 30, step: 2 },
      { square: 32, step: 2 },
      { square: 38, step: 2 },
    ]);
  });

  it("strikes each square within 4 steps for two puffers, on a board 7 squares a side", () => {
    const strikes = pufferStrikes(BOARD, 24, TWO_PUFFERS_REACH);

    expect({
      count: strikes.length,
      farthest: strikes.at(-1)?.step,
    }).toEqual({ count: 37, farthest: 4 });
  });

  it("strikes no square past the board's edge or in a gap", () => {
    const board = boardFrom(["rg_", "grg"]);

    expect(pufferStrikes(board, 0, PUFFER_REACH)).toEqual([
      { square: 0, step: 0 },
      { square: 1, step: 1 },
      { square: 3, step: 1 },
      { square: 4, step: 2 },
    ]);
  });

  it.each([
    ["pufferGoesOff", 0],
    ["dasherSetsOffPuffer", 1],
  ] as const)(
    "strikes what the sketch's puffer struck, in %s",
    (name, place) => {
      const { picture, record } = MOVE_FIXTURES[name];
      const blasts: readonly Blast[] = record.waves[0].blasts;
      const blast = itemAt(blasts, place);

      expect({
        what: blast.what,
        strikes: pufferStrikes(boardFrom(picture), blast.square, PUFFER_REACH),
      }).toEqual({ what: "puffer", strikes: blast.strikes });
    },
  );
});
