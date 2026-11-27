// A move's waves, played to rest: each gathers the bunches standing and
// sets off what they and the move set off, then the board falls, and the
// next gathers the bunches the fall left, until a fall leaves none.

import { recordOf } from "@fz/core/records";
import type { Game } from "../board/board";
import { strikeWave } from "../blasts/chain";
import type { SetOff } from "../blasts/striking";
import { type FoundBunch, findBunches } from "../bunches/find";
import { ELEMENT_IDS, type ElementId } from "../catalog/elements";
import type { ElementRule } from "../elements/element_rule";
import { MOST_WAVES } from "../tuning";
import type { Wave } from "./record";
import { settle } from "./settle";

/** Describes a move's waves played to rest, and the game they leave. */
export interface Rested {
  /** The game as the last wave's fall left it. */
  readonly game: Game;
  /** Each wave, numbered from 1, in the board's own frame. */
  readonly waves: readonly Wave[];
  /** How many of each element's changes counted, over every wave. */
  readonly counted: Readonly<Record<ElementId, number>>;
}

/**
 * Returns the waves a game plays to rest from the bunches standing on its
 * board and what a move sets off, each struck and then let fall, the next
 * gathering the bunches the fall left, until a fall leaves none or the
 * most waves a move plays are played.
 *
 * @param game The game as the move's swap or the wind's turn left it,
 *   whose moves played the waves' draws take: not yet counting the move
 *   after its swap, and counting it after the wind's turn.
 * @param bunches The bunches standing, in the order found.
 * @param setOff What the move sets off itself, which goes off in its first
 *   wave.
 */
export function playToRest(
  game: Game,
  bunches: readonly FoundBunch[],
  setOff: readonly SetOff[],
  rules: Readonly<Record<ElementId, ElementRule>>,
): Rested {
  const waves: Wave[] = [];
  const counted = recordOf(ELEMENT_IDS, () => 0);
  let resting = game;
  let standing = bunches;
  let goingOff = setOff;
  while (
    (standing.length > 0 || goingOff.length > 0) &&
    waves.length < MOST_WAVES
  ) {
    const struck = strikeWave(resting, standing, goingOff, rules);
    const fallen = settle(struck.game, rules);
    waves.push({
      number: waves.length + 1,
      bunches: struck.bunches,
      blasts: struck.blasts,
      hits: [...struck.hits, ...fallen.hits],
      falls: fallen.falls,
      goalsLeft: fallen.game.goalsLeft,
    });
    for (const element of ELEMENT_IDS) {
      counted[element] += struck.counted[element] + fallen.counted[element];
    }
    resting = fallen.game;
    standing = findBunches(resting.board, null);
    goingOff = [];
  }
  return { game: resting, waves, counted };
}
