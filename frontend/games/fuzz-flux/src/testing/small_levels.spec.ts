import { itemAt } from "@fz/core/records";
import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { levelDealt, movePlayed } from "../rules/run/saved_game";
import { BLUE_LINE, PUFFER, REFUSED, SMALL_LEVELS } from "./small_levels";

/** The rules the levels are played by: the game's own. */
const RULES = { elements: ELEMENT_RULES, wind: WIND_RULE };

/** Returns how a level, by its number, stands once a swap is played on its first deal. */
function afterFirstMove(level: number, move = BLUE_LINE): string {
  const dealt = levelDealt(itemAt(SMALL_LEVELS, level - 1), 1, RULES);
  return movePlayed(dealt, move, RULES).record.outcome;
}

describe("SMALL_LEVELS", () => {
  it("clears the first level with the line of blue", () => {
    expect(afterFirstMove(1)).toBe("cleared");
  });

  it("runs the second out of moves with it", () => {
    expect(afterFirstMove(2)).toBe("over");
  });

  it("leaves the third in play after it", () => {
    expect(afterFirstMove(3)).toBe("playing");
  });

  it("refuses the swap that lines up nothing", () => {
    const dealt = levelDealt(itemAt(SMALL_LEVELS, 0), 1, RULES);

    expect(movePlayed(dealt, REFUSED, RULES).record.swap.refused).toBe(true);
  });

  it("leaves 5 moves on the third", () => {
    const dealt = levelDealt(itemAt(SMALL_LEVELS, 2), 1, RULES);

    expect(movePlayed(dealt, BLUE_LINE, RULES).inPlay.game.movesLeft).toBe(5);
  });

  it("sets off the fourth's puffer where it stands", () => {
    const dealt = levelDealt(itemAt(SMALL_LEVELS, 3), 1, RULES);
    const setOff = { from: PUFFER, to: PUFFER };

    expect(movePlayed(dealt, setOff, RULES).record.swap.refused).toBe(false);
  });

  it("teaches the line of blue on the third level", () => {
    expect(itemAt(SMALL_LEVELS, 2).data.hint).toEqual({
      from: { x: 2, y: 2 },
      to: { x: 3, y: 2 },
    });
  });
});
