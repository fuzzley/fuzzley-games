// What the shell shows of a level in play, made from its game: the bar's
// level, moves, goals and wind, the line under it, the card at its end and
// the board in the screen's frame, with what the play on the board has
// come to so far beside them.

import { itemAt } from "@fz/core/records";
import { type Game, WINDS } from "../../rules/board/board";
import { turnFrame } from "../../rules/board/orientation";
import type { Goal } from "../../rules/catalog/goals";
import type { LevelEntry } from "../../rules/levels/levels";
import type { LevelInPlay } from "../../rules/run/saved_game";
import type {
  GoalShown,
  GridShown,
  RunState,
  WindShown,
} from "../../view/run_state";
import type { Beats } from "./beats";

/** Returns the board of a game as the screen shows it, as the grid over it names each square. */
export function gridOf(game: Game): GridShown {
  const { board } = turnFrame(game, -game.turns);
  return {
    width: board.width,
    height: board.height,
    squares: board.pieces.map((piece, square) =>
      itemAt(board.open, square)
        ? { piece, dust: itemAt(board.dust, square) }
        : null,
    ),
  };
}

/** Returns the goals as the bar shows them, from what each still asks for, one met at 0 and none counted below it. */
export function goalsOf(
  goals: readonly Goal[],
  left: readonly number[],
): readonly GoalShown[] {
  return goals.map((goal, place) => {
    const asked = Math.max(0, itemAt(left, place));
    return { goal, left: asked, met: asked === 0 };
  });
}

/** Returns the wind as the bar's arrow shows it on a level's game, or null for a level with none. */
export function windOf(level: LevelEntry, game: Game): WindShown | null {
  if (level.data.wind === null) return null;
  return { blows: itemAt(WINDS, game.turns), turnsIn: game.wind?.wait ?? null };
}

/** Returns everything the shell shows of a level in play, its board as given and the rest as its play has come to. */
export function runStateOf(
  { level, game }: LevelInPlay,
  grid: GridShown,
  beats: Beats,
): RunState {
  return {
    level: { number: level.number, name: level.data.name },
    movesLeft: game.movesLeft,
    movesLow: beats.movesLow,
    goals: goalsOf(game.goals, beats.goalsLeft),
    wind: windOf(level, game),
    newThing: level.data.brings,
    card: beats.card,
    starsLit: beats.starsLit,
    grid,
  };
}
