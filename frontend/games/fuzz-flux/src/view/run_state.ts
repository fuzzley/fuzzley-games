// What the shell shows of a game in play: one record, made from the game
// and replaced whole as a move lands, so the bar, the cards and the grid
// over the board read one state and never a game's parts.

import type { Wind } from "../rules/board/board";
import type { DustLayers } from "../rules/catalog/elements";
import type { Goal } from "../rules/catalog/goals";
import type { Piece } from "../rules/catalog/pieces";
import type { NewThing } from "../rules/levels/level";

/** Describes a level as the shell names it, as "Level 16: Checkerboard". */
export interface LevelShown {
  /** Its number in the whole game, from 1. */
  readonly number: number;
  readonly name: string;
}

/** Describes a goal as the bar shows it. */
export interface GoalShown {
  readonly goal: Goal;
  /** What it still asks for, 0 once met. */
  readonly left: number;
  readonly met: boolean;
}

/** Describes the wind as the bar's arrow shows it. */
export interface WindShown {
  readonly blows: Wind;
  /** How many moves until it turns, or null for a wind that never does. */
  readonly turnsIn: number | null;
}

/** Describes the card over the board at a level's end. */
export type Card =
  | {
      readonly what: "cleared";
      /** How many stars the level earned, from 1 to 3. */
      readonly stars: number;
      /** How many moves it was cleared with to spare. */
      readonly spare: number;
    }
  /** Out of moves, with what each open goal still needs, as `goals` has it. */
  | { readonly what: "over" };

/** Describes a square of the board as the grid over it names it. */
export interface SquareShown {
  /** What it holds, as the screen shows it, a dasher's way the screen's; or null for nothing. */
  readonly piece: Piece | null;
  readonly dust: DustLayers;
}

/** Describes the board in the screen's frame, as the grid over it names each square. */
export interface GridShown {
  readonly width: number;
  readonly height: number;
  /** Each square, by `y * width + x` on the screen, or null for a gap, which is no square of the grid. */
  readonly squares: readonly (SquareShown | null)[];
}

/** Describes everything the shell shows of a game in play. */
export interface RunState {
  readonly level: LevelShown;
  readonly movesLeft: number;
  /** Whether so few moves are left that the count shows in the warning color. */
  readonly movesLow: boolean;
  readonly goals: readonly GoalShown[];
  /** The wind, or null for a level with none. */
  readonly wind: WindShown | null;
  /** What the level brings in new, whose line shows under the bar, or null. */
  readonly newThing: NewThing | null;
  /** The card at the level's end, or null while it plays. */
  readonly card: Card | null;
  /** How many of the Cleared card's stars show lit, each from its beat: 0 while the level plays, and for Out of moves. */
  readonly starsLit: number;
  readonly grid: GridShown;
}
