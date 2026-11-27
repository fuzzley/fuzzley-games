import { SIM_TIMEOUT_MS } from "@fz/core/testing";
import { type GoldenGame, goldenSet, replayGolden } from "../../testing/golden";
import { PLAYABLE_LEVELS } from "../../testing/playable_levels";
import { deal } from "../board/deal";
import { ELEMENT_RULES, WIND_RULE } from "../elements/element_rules";
import { play } from "../move/play";

/** The golden games of each set a level the rules play is in, by the set, each file read once. */
const GOLDEN_GAMES = new Map(
  [...new Set(PLAYABLE_LEVELS.map(({ set }) => set))].map(
    (set): [string, readonly GoldenGame[]] => [set, goldenSet(set)],
  ),
);

// Every golden game of each level whose every part the rules play, dealt
// and played move by move on the game's own rules, each digest the
// sketch's.
describe("the golden games", { timeout: SIM_TIMEOUT_MS }, () => {
  it.each(PLAYABLE_LEVELS)(
    "play level $level.id of $set as the sketch did",
    ({ set, level }) => {
      const games = (GOLDEN_GAMES.get(set) ?? []).filter(
        (golden) => golden.level === level.id,
      );

      for (const golden of games) {
        replayGolden(
          golden,
          deal(
            { ...level, moves: golden.movesLeft },
            golden.deal,
            ELEMENT_RULES,
          ),
          (game, from, to) => play(game, from, to, ELEMENT_RULES, WIND_RULE),
        );
      }

      expect(games).not.toEqual([]);
    },
  );
});
