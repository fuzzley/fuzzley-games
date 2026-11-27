import { gameFrom } from "../../testing/board_picture";
import { DESIGN_PARTS, DESIGN_WIND } from "../../testing/made_up_rules";
import { MOVE_FIXTURES } from "../../testing/move_fixtures";
import { play } from "./play";

/** The moves the storyboards of two specials swapped together play, each on its own board. */
const STORYBOARDS = [
  "twoDashersStoryboard",
  "dasherAndPufferStoryboard",
  "twoPuffersStoryboard",
  "twoWispsStoryboard",
  "frizzballAndDasherStoryboard",
  "twoFrizzballsStoryboard",
] as const satisfies readonly (keyof typeof MOVE_FIXTURES)[];

describe("the storyboards of two specials swapped together", () => {
  it.each(STORYBOARDS)("play each wave as the sketch did, in %s", (name) => {
    const { picture, options, record } = MOVE_FIXTURES[name];

    const played = play(
      gameFrom(picture, options),
      record.swap.from,
      record.swap.to,
      DESIGN_PARTS,
      DESIGN_WIND,
    );

    expect(played.record.waves).toEqual(record.waves);
  });
});
