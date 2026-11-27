// A level in play, as the game keeps it: the level, the seed of its deal
// and the moves made on it, which, the rules being the same every time,
// are the whole game; the game they leave is worked out from them.

import type { Game } from "../board/board";
import { deal } from "../board/deal";
import type { ElementId } from "../catalog/elements";
import type { ElementRule, WindRule } from "../elements/element_rule";
import type { LevelEntry } from "../levels/levels";
import { play } from "../move/play";
import type { MoveRecord, Swap } from "../move/record";

/** Describes a move as the player makes it: the square picked up and its neighbor, or the same square for a special set off where it stands, each in the screen's frame. */
export type Move = Pick<Swap, "from" | "to">;

/** Describes the rules a level is played by: each element's, and the wind's. */
export interface PlayRules {
  readonly elements: Readonly<Record<ElementId, ElementRule>>;
  readonly wind: WindRule;
}

/** Describes a level in play: the level, the seed of its deal, each move made on it, in order, and the game they leave. */
export interface LevelInPlay {
  readonly level: LevelEntry;
  readonly deal: number;
  readonly moves: readonly Move[];
  readonly game: Game;
}

/** Describes a move played on a level: the level in play it leaves, and what the move did. */
export interface MovePlayed {
  readonly inPlay: LevelInPlay;
  readonly record: MoveRecord;
}

/** Returns a level in play on the deal a seed names, no move made. */
export function levelDealt(
  level: LevelEntry,
  seed: number,
  rules: PlayRules,
): LevelInPlay {
  return {
    level,
    deal: seed,
    moves: [],
    game: deal(level.data, seed, rules.elements),
  };
}

/**
 * Returns a move played on a level in play, and its record: a move the
 * rules refuse costs nothing, and leaves the level in play as it was.
 */
export function movePlayed(
  inPlay: LevelInPlay,
  move: Move,
  rules: PlayRules,
): MovePlayed {
  const played = play(
    inPlay.game,
    move.from,
    move.to,
    rules.elements,
    rules.wind,
  );
  if (played.record.swap.refused) {
    return { inPlay, record: played.record };
  }
  return {
    inPlay: {
      ...inPlay,
      moves: [...inPlay.moves, { from: move.from, to: move.to }],
      game: played.game,
    },
    record: played.record,
  };
}
