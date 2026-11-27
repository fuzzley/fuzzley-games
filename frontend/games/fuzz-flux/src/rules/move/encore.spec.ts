import { pick } from "@fz/core/records";
import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { DESIGN_PARTS } from "../../testing/made_up_rules";
import { ENCORE_FIXTURE } from "../../testing/move_fixtures";
import type { Game } from "../board/board";
import { turnFrame } from "../board/orientation";
import { encore } from "./encore";
import type { Blast, EncoreRecord } from "./record";

/** A board of plain fuzzballs, of the kinds `CLEARED` plays with. */
const PLAIN: BoardPicture = { pieces: ["bgbr", "rbra", "agga"] };

/** A game whose one goal is met. */
const CLEARED: GameOptions = {
  kinds: ["blue", "red", "amber", "green"],
  goals: [{ what: "gather", kind: "blue", count: 3 }],
  goalsLeft: [0],
  seed: 7,
};

/** Returns the special each spare move of an encore made and set off: what, where, and which fuzzball. */
function madeSpecial(
  record: EncoreRecord,
): readonly (Pick<Blast, "what" | "square" | "piece"> | undefined)[] {
  return record.spares.map(({ waves }) => {
    const blast = waves[0]?.blasts[0];
    return blast === undefined
      ? undefined
      : pick(blast, ["what", "square", "piece"]);
  });
}

/** Returns the encore played on a game, on the made-up elements. */
function encored(game: Game): ReturnType<typeof encore> {
  return encore(game, DESIGN_PARTS);
}

describe("encore", () => {
  it("plays each spare move as the sketch did", () => {
    const { picture, options, record } = ENCORE_FIXTURE;

    expect(encored(gameFrom(picture, options)).record).toEqual(record);
  });

  it("takes a move off the moves left for each spare move, and counts none played", () => {
    const game = gameFrom(PLAIN, { ...CLEARED, movesLeft: 3 });

    const { game: played, record } = encored(game);

    expect([
      record.spares.length,
      played.movesLeft,
      played.movesPlayed,
    ]).toEqual([3, 0, game.movesPlayed]);
  });

  it("sets off 12 spare moves at the most", () => {
    const { game, record } = encored(
      gameFrom(PLAIN, { ...CLEARED, movesLeft: 15 }),
    );

    expect([record.spares.length, game.movesLeft]).toEqual([12, 3]);
  });

  it("makes a puffer with 2, 5, 8 or 11 spare moves left after it, and otherwise a dasher, across with an odd number and down with an even", () => {
    const { record } = encored(gameFrom(PLAIN, { ...CLEARED, movesLeft: 12 }));

    expect(madeSpecial(record).map((made) => made?.what)).toEqual([
      "puffer",
      "dasher-down",
      "dasher-across",
      "puffer",
      "dasher-across",
      "dasher-down",
      "puffer",
      "dasher-down",
      "dasher-across",
      "puffer",
      "dasher-across",
      "dasher-down",
    ]);
  });

  it("makes none special where no plain fuzzball stands", () => {
    // A caged fuzzball, a burred one and a dasher.
    const game = gameFrom(
      { pieces: ["Bbb"], marks: [".*|"] },
      { ...CLEARED, movesLeft: 3 },
    );

    const { game: played, record } = encored(game);

    expect([record.spares, played]).toEqual([[], game]);
  });

  it("draws other fuzzballs once a move more is played", () => {
    const game = gameFrom(PLAIN, { ...CLEARED, movesLeft: 3 });

    const squares = (from: Game): readonly (number | undefined)[] =>
      madeSpecial(encored(from).record).map((made) => made?.square);

    expect(squares({ ...game, movesPlayed: 1 })).not.toEqual(squares(game));
  });

  it("hands its record back in the screen's frame, as the sketch does", () => {
    // The frame turned, the screen still shows the board as drawn, and a
    // dasher across the board's frame runs down the screen.
    const game = turnFrame(gameFrom(PLAIN, { ...CLEARED, movesLeft: 3 }), 1);

    const { record } = encored(game);

    expect(madeSpecial(record)).toEqual([
      { what: "puffer", square: 4, piece: 5 },
      { what: "dasher-down", square: 7, piece: 8 },
      { what: "dasher-across", square: 11, piece: 11 },
    ]);
  });

  it("leaves the game it is handed as it was", () => {
    const game = gameFrom(PLAIN, { ...CLEARED, movesLeft: 3 });
    const before = structuredClone(game);

    encored(game);

    expect(game).toEqual(before);
  });
});
