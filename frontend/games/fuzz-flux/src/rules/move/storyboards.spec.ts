import { gameFrom } from "../../testing/board_picture";
import { DESIGN_PARTS } from "../../testing/made_up_rules";
import { MOVE_FIXTURES, type MoveFixture } from "../../testing/move_fixtures";
import { strikeWave } from "../blasts/chain";
import { findBunches } from "../bunches/find";
import type { Wave } from "./record";
import { settle } from "./settle";
import { playSwap } from "./swapped";

/** The moves the storyboards of two specials swapped together play, each on its own board. */
const STORYBOARDS = [
  "twoDashersStoryboard",
  "dasherAndPufferStoryboard",
  "twoPuffersStoryboard",
  "twoWispsStoryboard",
  "frizzballAndDasherStoryboard",
  "twoFrizzballsStoryboard",
] as const satisfies readonly (keyof typeof MOVE_FIXTURES)[];

/**
 * Returns the waves a move played by hand plays to rest, each struck and
 * then let fall, the next standing on what the fall left.
 *
 * @throws {Error} for a swap refused.
 */
function playedToRest({
  picture,
  options,
  record,
}: MoveFixture): readonly Wave[] {
  const swapped = playSwap(
    gameFrom(picture, options),
    record.swap.from,
    record.swap.to,
    DESIGN_PARTS,
  );
  if (swapped === null) {
    throw new Error("The storyboard's swap is refused.");
  }
  const waves: Wave[] = [];
  let { game, bunches, setOff } = swapped;
  while (bunches.length > 0 || setOff.length > 0) {
    const struck = strikeWave(game, bunches, setOff, DESIGN_PARTS);
    const settled = settle(struck.game, DESIGN_PARTS);
    waves.push({
      number: waves.length + 1,
      bunches: struck.bunches,
      blasts: struck.blasts,
      hits: struck.hits,
      falls: settled.falls,
      goalsLeft: struck.game.goalsLeft,
    });
    game = settled.game;
    bunches = findBunches(game.board, null);
    setOff = [];
  }
  return waves;
}

describe("the storyboards of two specials swapped together", () => {
  it.each(STORYBOARDS)("play each wave as the sketch did, in %s", (name) => {
    const fixture = MOVE_FIXTURES[name];

    expect(playedToRest(fixture)).toEqual(fixture.record.waves);
  });
});
