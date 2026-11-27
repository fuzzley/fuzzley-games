// The careful player: the hint's move, which can't see what falls in, made
// a move at a time to the level's end, as the design's sketch's careful
// player plays. Its games set each level's stars and help set its moves,
// so this is held as the rules are (eslint.config.js), to their fence and
// their exact arithmetic.

import type { Game } from "../rules/board/board";
import type { ElementId } from "../rules/catalog/elements";
import type { ElementRule, WindRule } from "../rules/elements/element_rule";
import { carefulMove } from "../rules/move/hint";
import { type PlayedOut, playOut } from "./play_out";

/** Returns a game played to its end by the careful player, by the elements' rules and the wind's, each move `carefulMove()`'s. */
export function playCarefully(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
  wind: WindRule,
): PlayedOut {
  return playOut(
    game,
    (playing) => carefulMove(playing, rules, wind),
    rules,
    wind,
  );
}
