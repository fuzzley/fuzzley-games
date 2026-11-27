// The encore, a cleared level's last flourish: each move it has to spare,
// up to the most the encore sets off, makes a plain fuzzball special and
// sets it off, its waves played to rest.

import { hashOf } from "@fz/core/random";
import { itemAt } from "@fz/core/records";
import type { Game } from "../board/board";
import type { ElementId } from "../catalog/elements";
import type { SpecialId } from "../catalog/specials";
import { SALTS } from "../draws";
import type { ElementRule } from "../elements/element_rule";
import { MOST_ENCORE_MOVES } from "../tuning";
import { waveOnScreen } from "./on_screen";
import type { EncoreRecord, SpareMove } from "./record";
import { plainFuzzballs } from "./swap";
import { playToRest } from "./wave";

/** Describes the encore played: the game it leaves, and what it did. */
export interface Encored {
  readonly game: Game;
  readonly record: EncoreRecord;
}

/**
 * Returns the encore played on the game the move that cleared its level
 * left, and its record, in the screen's frame.
 *
 * Each spare move, while a plain fuzzball stands, makes one special and
 * sets it off, the fuzzball counting toward no goal: the one drawn from the
 * deal's seed, the moves played and the spare moves left after it, which
 * make it a puffer for 2, 5, 8 or 11, and otherwise a dasher, across the
 * board's own frame for an odd number and down it for an even. Each takes
 * a move off the moves left, and none counts as a move played.
 */
export function encore(
  game: Game,
  rules: Readonly<Record<ElementId, ElementRule>>,
): Encored {
  const spares: SpareMove[] = [];
  let played = game;
  for (
    let spare = Math.min(game.movesLeft, MOST_ENCORE_MOVES) - 1;
    spare >= 0;
    spare--
  ) {
    const plain = plainFuzzballs(played.board, rules);
    if (plain.length === 0) {
      break;
    }
    const { square, piece } = itemAt(
      plain,
      hashOf(played.seed, played.movesPlayed, spare, SALTS.encore) %
        plain.length,
    );
    const pieces = [...played.board.pieces];
    pieces[square] = null;
    const rested = playToRest(
      {
        ...played,
        board: { ...played.board, pieces },
        movesLeft: played.movesLeft - 1,
      },
      [],
      [{ what: specialOf(spare), square, piece: piece.id, kind: piece.kind }],
      rules,
    );
    spares.push({
      waves: rested.waves.map((wave) => waveOnScreen(wave, rested.game)),
    });
    played = rested.game;
  }
  return { game: played, record: { spares } };
}

/** Returns the special a spare move makes, by the spare moves left after it. */
function specialOf(spare: number): SpecialId {
  if (spare % 3 === 2) {
    return "puffer";
  }
  return spare % 2 === 1 ? "dasher-across" : "dasher-down";
}
