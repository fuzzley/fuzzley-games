// The fuzzball in the player's hand: picked up, swapped with a neighbor,
// put down, or set off where it stands if it is a special, and the one swap
// kept while a move plays, each turned into the commands the scene and the
// shell play.

import type { Square } from "../../rules/board/cells";
import {
  type BoardShape,
  type Way,
  areNeighbors,
  isOnBoard,
  neighborOf,
  sameSquare,
} from "../board/spaces";
import type { BoardCommand, MoveCommand } from "./commands";

/**
 * Says what the picking asks of the game in play, each square in the
 * screen's frame, which the shell answers from the rules and the move it
 * plays.
 *
 * It asks of the board as it rests once the move playing has landed, the
 * game the rules made of it, so a fuzzball picked up while a move plays is
 * the one that rests there, and stays held as the board comes to rest.
 */
export interface GameInPlay {
  /** Returns whether the piece on a square can be picked up and swapped, as the rules' `canSwap()` says. */
  readonly canSwap: (square: Square) => boolean;
  /** Returns whether the piece on a square goes off where it stands, as a special and the frizzball do. */
  readonly goesOff: (square: Square) => boolean;
  /** Returns the fuzzballs that could bunch with the one on a square, were it swapped with a neighbor, as the rules' `bunchMatesOf()` says. */
  readonly bunchMatesOf: (square: Square) => readonly Square[];
  /** Returns whether a move plays, while which a move made is kept for when the board rests. */
  readonly movePlays: () => boolean;
}

/**
 * Holds the fuzzball the player has picked up, if any, and the move kept
 * while another plays, and turns each press, swipe and tap on the board
 * into commands.
 *
 * A move made while another plays is kept, and a later one takes its place:
 * the shell plays it once the board rests, as {@link boardRests} hands it
 * over.
 */
export class Picking {
  /** The square of the fuzzball held, or null while none is. */
  private holding: Square | null = null;
  /**
   * Whether the press under way began on the fuzzball held, so a tap at its
   * end sets it off or puts it down; {@link putDown} clears it as every
   * other press lets go of the fuzzball held.
   */
  private pressedHeld = false;
  /** The move kept while another plays, or null. */
  private kept: MoveCommand | null = null;

  /** Starts with nothing held, on a board as the screen shows it, in a game it asks of. */
  constructor(
    private readonly board: BoardShape,
    private readonly game: GameInPlay,
  ) {}

  /** The square of the fuzzball held, or null while none is. */
  get held(): Square | null {
    return this.holding;
  }

  /**
   * Takes a press starting on a square, or off the board, and returns what
   * it does at once: a press on a neighbor of the fuzzball held swaps them,
   * one on another fuzzball picks that up in its place, and one anywhere
   * else puts it down. A press on the fuzzball held waits to be read as a
   * swipe or a tap.
   */
  press(square: Square | null): readonly BoardCommand[] {
    const held = this.holding;
    if (square === null || !isOnBoard(this.board, square)) {
      return this.putDown();
    }
    if (held !== null && sameSquare(held, square)) {
      this.pressedHeld = true;
      return [];
    }
    if (held !== null && areNeighbors(held, square)) {
      return this.play({ what: "swap", from: held, to: square });
    }
    return this.game.canSwap(square) ? this.pickUp(square) : this.putDown();
  }

  /**
   * Swaps the fuzzball held with its neighbor a way, as a swipe or an arrow
   * key does, or puts it down where that way leaves the board.
   */
  swapHeld(way: Way): readonly BoardCommand[] {
    const held = this.holding;
    if (held === null) return [];
    const to = neighborOf(held, way);
    return isOnBoard(this.board, to)
      ? this.play({ what: "swap", from: held, to })
      : this.putDown();
  }

  /**
   * Takes the press under way ending as a tap: on the fuzzball held, it sets
   * it off where it stands if it goes off, and else puts it down.
   */
  tap(): readonly BoardCommand[] {
    const held = this.holding;
    if (!this.pressedHeld || held === null) return [];
    return this.game.goesOff(held)
      ? this.play({ what: "set-off", square: held })
      : this.putDown();
  }

  /** Puts down the fuzzball held, if any. */
  putDown(): readonly BoardCommand[] {
    const held = this.holding;
    this.holding = null;
    this.pressedHeld = false;
    return held === null ? [] : [{ what: "put-down", square: held }];
  }

  /**
   * Takes the board coming to rest, and hands over the move kept while the
   * last played, for the shell to play now, putting down first a fuzzball
   * picked up since.
   */
  boardRests(): readonly BoardCommand[] {
    const kept = this.kept;
    if (kept === null) return [];
    this.kept = null;
    return [...this.putDown(), kept];
  }

  /**
   * Lets go as the player looks away: puts down the fuzzball held, and
   * forgets the move kept, so coming back finds the board at rest. It is
   * safe to repeat.
   */
  letGo(): readonly BoardCommand[] {
    this.kept = null;
    return this.putDown();
  }

  /** Picks up the fuzzball on a square, putting down the one held. */
  private pickUp(square: Square): readonly BoardCommand[] {
    const putDown = this.putDown();
    this.holding = square;
    const mates = this.game.bunchMatesOf(square);
    return [...putDown, { what: "pick-up", square, mates }];
  }

  /**
   * Makes a move, putting down the fuzzball held: played at once, or kept
   * while another plays, in the place of any kept before.
   */
  private play(move: MoveCommand): readonly BoardCommand[] {
    const putDown = this.putDown();
    if (this.game.movePlays()) {
      this.kept = move;
      return putDown;
    }
    this.kept = null;
    return [...putDown, move];
  }
}
