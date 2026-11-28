import { itemAt } from "@fz/core/records";
import { WINDS, type Game, type Wind } from "../board/board";
import { deal } from "../board/deal";
import { onScreen } from "../board/orientation";
import { ELEMENT_RULES } from "../elements/element_rules";
import { type Level, levelSetOf } from "../levels/level";
import windyDays from "../levels/windy-days.json";
import { play } from "../move/play";
import { legalMoves } from "../move/swap";
import { GUST_RULE } from "./gust";

/** Returns Windy days' level of an id, as the game keeps it. */
function windyLevel(id: string): Level {
  const level = levelSetOf(windyDays).levels.find((each) => each.id === id);
  if (level === undefined) {
    throw new Error(`Windy days has no level ${id}.`);
  }
  return level;
}

/** Returns the way the wind blows on a game's board, as its frame is turned. */
function blowingOn(game: Game): Wind {
  return itemAt(WINDS, game.turns);
}

/** Returns a game with the first move its board allows played on it. */
function firstMovePlayed(game: Game): Game {
  const move = itemAt(legalMoves(game.board, ELEMENT_RULES), 0);
  return play(
    game,
    onScreen(game, move.from),
    onScreen(game, move.to),
    ELEMENT_RULES,
    GUST_RULE,
  ).game;
}

describe("GUST_RULE", () => {
  it("counts a turning wind's wait down a move, turning nothing", () => {
    const turn = GUST_RULE.afterMove({ every: 3, quarters: 1, wait: 3 });

    expect(turn).toEqual({
      wind: { every: 3, quarters: 1, wait: 2 },
      quarters: 0,
    });
  });

  it("turns the board's frame its quarters on the move that runs its wait out, and begins its wait again", () => {
    const turn = GUST_RULE.afterMove({ every: 4, quarters: 2, wait: 1 });

    expect(turn).toEqual({
      wind: { every: 4, quarters: 2, wait: 4 },
      quarters: 2,
    });
  });

  it("turns once every so many moves", () => {
    let wind = { every: 3, quarters: 1, wait: 3 };
    const turned: number[] = [];

    for (let move = 0; move < 9; move++) {
      const turn = GUST_RULE.afterMove(wind);
      turned.push(turn.quarters);
      wind = turn.wind;
    }

    expect(turned).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  });

  it("turns Weather vane's wind counterclockwise after every 3 moves, from down to right and then up", () => {
    let game = deal(windyLevel("30"), 1, ELEMENT_RULES);
    const blowing: Wind[] = [];

    for (let move = 0; move < 6; move++) {
      game = firstMovePlayed(game);
      blowing.push(blowingOn(game));
    }

    expect(blowing).toEqual(["down", "down", "right", "right", "right", "up"]);
  });
});
