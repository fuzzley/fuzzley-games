// The hooks an element's rule plays through, one for each moment of a move
// the element can take a part in, each left out where it takes none. The
// rules ask each element's hook of each square a moment reaches, of the
// game as a move ends, or of the board, in the board's own frame: an
// element answers for a square it bears on, and for any other as a hook
// left out does. Each hook reads what it is handed and changes nothing, so
// a move plays the same every time.

import type { Board, Game } from "../board/board";
import type { DustLayers } from "../catalog/elements";
import type { ElementGoalId } from "../catalog/goals";
import type { Piece } from "../catalog/pieces";
import type { Hit } from "../move/record";

/** Describes a square as an element's rule reads it: what it holds and the dust on it. */
export interface SquareState {
  readonly piece: Piece | null;
  readonly dust: DustLayers;
}

/** Describes what a moment of a move does to a square, as an element's rule says. */
export interface Change {
  /** What the square holds, and the dust on it, after. */
  readonly square: SquareState;
  /**
   * What the record writes of it, or null for a change that has no hit of
   * its own, as a cage opened in a bunch has, its fuzzball's gathering
   * hit enough.
   */
  readonly hit: Exclude<Hit["what"], "gathered" | "born"> | null;
  /**
   * Whether it counts as one of the element's taken in the move: one off
   * its goal, where it has one, and one its `moveEnded()` is told of.
   */
  readonly counts: boolean;
}

/** Describes how a move stands at its end, as an element's rule reads it. */
export interface MoveEnd {
  /** The game as the move's waves leave it, its moves played counting the move, before the wind turns. */
  readonly game: Game;
  /** How many of the element's changes in the move counted. */
  readonly counted: number;
}

/** Describes a burr spreading, in the board's own frame, as the burr's rule says. */
export interface Spread {
  /** The burred fuzzball's square. */
  readonly from: number;
  /** The square of the neighbor it spreads to. */
  readonly to: number;
}

/** Describes what a square an element bears on is worth to a wisp choosing where to fly. */
export interface WispAim {
  /**
   * Its place in the order a wisp weighs a square by, from 0: of the
   * elements that give a square a worth, the first in it says what the
   * square is worth.
   */
  readonly rank: number;
  /**
   * Returns what a square of the board is worth, more where the element's
   * goal is still open, or null where the element gives it no worth, as
   * the sleepyhead gives none but to the square that holds it up.
   */
  readonly worth: (
    board: Board,
    square: number,
    goalOpen: boolean,
  ) => number | null;
}

/** Describes the goal an element counts for. */
export interface ElementGoal {
  readonly id: ElementGoalId;
  /** Returns how many of the element a dealt board holds, which the goal asks for: of dust, a layer each. */
  readonly countOn: (board: Board) => number;
}

/**
 * Describes an element's part in a move: what it holds still, what each
 * moment does to it, what a wisp makes of it, and the goal it counts for.
 */
export interface ElementRule {
  /** Returns whether it keeps a square's piece from being swapped, and so its fuzzball out of a shuffle and out of the encore's choosing. */
  readonly holdsSwap?: (square: SquareState) => boolean;
  /** Returns whether it keeps a square's piece where it is as the board falls, for fuzzballs to roll in under. */
  readonly holdsFall?: (square: SquareState) => boolean;
  /**
   * Returns what a bunch that takes in its square's fuzzball does to it,
   * before the fuzzball is gathered or made special, or null for nothing,
   * as a cage opened.
   */
  readonly inBunch?: (square: SquareState) => Change | null;
  /** Returns what a bunch beside its square does to it, or null for nothing, as a brick knocked. */
  readonly besideBunch?: (square: SquareState) => Change | null;
  /**
   * Returns its square ready for the fuzzball there to take the fur a
   * frizzball swapped with a special gives, before the rules put it on, or
   * null where it keeps the fuzzball from taking it, as a cage does; a
   * burr falls off, with no hit and nothing counted.
   */
  readonly givenFur?: (square: SquareState) => SquareState | null;
  /**
   * Returns what a blast that strikes its square's piece does to it, or
   * null where the strike passes on to gather the fuzzball there; a change
   * stops the strike, as a cage opened leaves its fuzzball.
   */
  readonly blasted?: (square: SquareState) => Change | null;
  /**
   * Returns what reaching its square under the piece does to it, or null
   * for nothing, as dust swept: a bunch taking the square's fuzzball in, a
   * blast gathering it, or a blast striking the square bare.
   */
  readonly struckUnder?: (square: SquareState) => Change | null;
  /** Returns what the board coming to rest does to its square, or null for nothing, as a sleepyhead on a bed is put to bed. */
  readonly settled?: (square: SquareState, bed: boolean) => Change | null;
  /** Returns what the end of a move does on the board, or null for nothing, as a burr spreads after a move that brushed none off. */
  readonly moveEnded?: (end: MoveEnd) => Spread | null;
  /** What it makes a square worth to a wisp. */
  readonly wisp?: WispAim;
  /** The goal it counts for. */
  readonly goal?: ElementGoal;
}
