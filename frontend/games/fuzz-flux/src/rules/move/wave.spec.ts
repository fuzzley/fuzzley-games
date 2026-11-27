import {
  type BoardPicture,
  type GameOptions,
  gameFrom,
} from "../../testing/board_picture";
import { DESIGN_PARTS } from "../../testing/made_up_rules";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { findBunches } from "../bunches/find";
import { MOST_WAVES } from "../tuning";
import { type Swapped, playSwap } from "./swapped";
import { type Rested, playToRest } from "./wave";

/** Returns what a swap does on a game drawn as a picture, throwing where it is refused. */
function swappedOn(
  picture: BoardPicture,
  from: number,
  to: number,
  options: GameOptions = {},
): Swapped {
  const swapped = playSwap(gameFrom(picture, options), from, to, DESIGN_PARTS);
  if (swapped === null) {
    throw new Error("The swap is refused.");
  }
  return swapped;
}

/** Returns the waves a move played by hand plays to rest after its swap. */
function restedAfter(name: keyof typeof MOVE_FIXTURES): Rested {
  const { picture, options, record } = MOVE_FIXTURES[name];
  const { game, bunches, setOff } = swappedOn(
    picture,
    record.swap.from,
    record.swap.to,
    options,
  );
  return playToRest(game, bunches, setOff, DESIGN_PARTS);
}

describe("playToRest", () => {
  it("plays no wave where no bunch stands and nothing is set off", () => {
    const game = gameFrom(["bgb", "rbr", "avp"]);

    const rested = playToRest(game, [], [], DESIGN_PARTS);

    expect(rested).toEqual({ game, waves: [] });
  });

  it("plays each wave the sketch played, numbered from 1, until a fall leaves no bunch", () => {
    const rested = restedAfter("twoWaves");

    expect(rested.waves).toEqual(MOVE_FIXTURES.twoWaves.record.waves);
  });

  it("leaves the game as the last wave's fall left it, no bunch standing", () => {
    const { game } = restedAfter("twoWaves");

    expect([findBunches(game.board, null), game.nextPieceId]).toEqual([[], 19]);
  });

  it("sets off what the move sets off in its first wave alone", () => {
    const { game, setOff } = swappedOn(
      { pieces: ["bgb", "rbr", "avp"], marks: ["...", ".-.", "..."] },
      4,
      4,
    );

    const { waves } = playToRest(game, [], setOff, DESIGN_PARTS);

    expect(
      waves.map(({ blasts }) =>
        blasts.map(({ what, square, setOffBy }) => [what, square, setOffBy]),
      ),
    ).toEqual([[["dasher-across", 4, null]]]);
  });

  it("stops at the most waves a move plays, though a bunch still stands", () => {
    // Every fuzzball let in is blue, so each fall stands up the bunch again.
    const game = gameFrom(["b", "b", "b"], { kinds: ["blue"] });

    const rested = playToRest(
      game,
      findBunches(game.board, null),
      [],
      DESIGN_PARTS,
    );

    expect([
      rested.waves.length,
      rested.waves.at(-1)?.number,
      findBunches(rested.game.board, null).length,
    ]).toEqual([MOST_WAVES, MOST_WAVES, 1]);
  });
});
