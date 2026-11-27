// A level in play as the game keeps one, its moves made by the rules, for
// the scripts under `tools/` to hand a page to take up. It plays moves as
// the rules play them, so it is held as the rules are (eslint.config.js), to
// their fence and their exact arithmetic.

import { levelAt } from "@fz/core/levels";
import type { LevelEntry } from "../rules/levels/levels";
import {
  type PlayRules,
  type SavedGame,
  levelDealt,
  movePlayed,
  savedGameOf,
} from "../rules/run/saved_game";

/** Describes a level in play: its level, the deal it is played on, and the moves made on it. */
export interface KeptRun {
  /** The level, by its number. */
  readonly level: number;
  /** The deal it is played on, by its seed, one of the level's own. */
  readonly deal: number;
  /** Each move made on it, in the order made, the square picked up and its neighbor, in the screen's frame. */
  readonly moves: readonly (readonly [from: number, to: number])[];
}

/**
 * Returns a level in play as storage keeps it, for a page to take up: dealt
 * on one of its own deals, and each move made by the rules, the level
 * still on.
 *
 * It throws for a level the game doesn't have, as `levelAt()` does, a deal
 * that isn't one of the level's own, a move the rules refuse, and a move
 * that ends the level, which no level in play has made.
 */
export function keptRun(
  levels: readonly LevelEntry[],
  rules: PlayRules,
  kept: KeptRun,
): SavedGame {
  const level = levelAt(levels, kept.level);
  if (!level.data.deals.includes(kept.deal)) {
    throw new Error(
      `Level ${String(kept.level)} has no deal ${String(kept.deal)}.`,
    );
  }
  let inPlay = levelDealt(level, kept.deal, rules);
  for (const [index, [from, to]] of kept.moves.entries()) {
    const move = `Move ${String(index + 1)} of level ${String(kept.level)}, ${String(from)} to ${String(to)},`;
    const { inPlay: after, record } = movePlayed(inPlay, { from, to }, rules);
    if (record.swap.refused) throw new Error(`${move} is refused.`);
    if (after.game.outcome !== "playing") {
      throw new Error(`${move} ends it: ${after.game.outcome}.`);
    }
    inPlay = after;
  }
  return savedGameOf(inPlay);
}
