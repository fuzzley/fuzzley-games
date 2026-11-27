// The keys the board is played by: a ring the arrows move over its squares,
// and the keys that play the square under it. Each is read by its place on
// the keyboard, but H, read by the letter it types, as the layout labels it.

import { type ShortcutModifiers, isShortcut } from "@fz/core/keys";
import { type Square, squareOf } from "../../rules/board/cells";
import {
  type BoardShape,
  type Way,
  isOnBoard,
  isWithinEdges,
  neighborOf,
  sameSquare,
} from "../board/spaces";
import type { BoardCommand } from "./commands";
import type { Picking } from "./picking";

/** Holds what a key's meaning depends on, as a `KeyboardEvent` has it. */
export interface KeyPress extends ShortcutModifiers {
  /** The key's place on the keyboard. */
  readonly code: string;
  /** What it types. */
  readonly key: string;
  /** Whether it repeats as it is held. */
  readonly repeat: boolean;
}

/** Says what a key asks of the board. */
type BoardKey =
  /** Moves the ring, or swaps the fuzzball held, a way. */
  | { readonly what: "step"; readonly way: Way }
  /** Taps the square under the ring. */
  | { readonly what: "tap" }
  | { readonly what: "put-down" }
  | { readonly what: "hint" };

/** What each key the board answers asks of it, by its place on the keyboard, but H. */
const KEYS: ReadonlyMap<string, BoardKey> = new Map<string, BoardKey>([
  ["ArrowUp", { what: "step", way: "up" }],
  ["ArrowRight", { what: "step", way: "right" }],
  ["ArrowDown", { what: "step", way: "down" }],
  ["ArrowLeft", { what: "step", way: "left" }],
  ["Space", { what: "tap" }],
  ["Enter", { what: "tap" }],
  ["NumpadEnter", { what: "tap" }],
  ["Escape", { what: "put-down" }],
]);

/**
 * Holds the ring the arrow keys move over the board, and plays each key the
 * board answers on the picking: Space or Enter taps the square under the
 * ring, as a finger would; an arrow swaps the fuzzball held that way, or
 * moves the ring while none is held; Esc puts the fuzzball held down; and H
 * asks for a hint.
 */
export class Ring {
  /** The square under the ring. */
  private at: Square;

  /** Starts the ring on the board's first open square, in reading order. */
  constructor(
    private readonly board: BoardShape,
    private readonly picking: Picking,
  ) {
    this.at = squareOf(board.open.indexOf(true), board.width);
  }

  /** The square under the ring, which the grid over the board keeps the focus on. */
  get square(): Square {
    return this.at;
  }

  /**
   * Takes a key pressed, and returns the commands it gives; or null for a
   * key the board leaves to the page, as it does any held with Ctrl, Alt or
   * Meta, and Esc with nothing held. A held key's repeats give none.
   */
  press(pressed: KeyPress): readonly BoardCommand[] | null {
    const key = boardKeyOf(pressed);
    if (key === null) return null;
    if (pressed.repeat) return [];
    switch (key.what) {
      case "step":
        return this.picking.held === null
          ? this.moveRing(key.way)
          : this.picking.swapHeld(key.way);
      case "tap":
        return [...this.picking.press(this.at), ...this.picking.tap()];
      case "put-down":
        return this.picking.held === null ? null : this.picking.putDown();
      case "hint":
        return [{ what: "hint" }];
    }
  }

  /**
   * Moves the ring to a square of the board, as the focus moving there does,
   * and returns the commands that show it there; or none where the ring is
   * there already, or the square is a gap or off the board.
   *
   * It puts the fuzzball held down, which an arrow would otherwise swap
   * where the ring no longer is.
   */
  moveTo(square: Square): readonly BoardCommand[] {
    if (sameSquare(square, this.at) || !isOnBoard(this.board, square)) {
      return [];
    }
    this.at = square;
    return [...this.picking.putDown(), { what: "move-ring", square }];
  }

  /**
   * Moves the ring to the next square on the board a way, past any gap, and
   * returns the command that shows it there; or none at the board's edge.
   */
  private moveRing(way: Way): readonly BoardCommand[] {
    for (
      let to = neighborOf(this.at, way);
      isWithinEdges(this.board, to);
      to = neighborOf(to, way)
    ) {
      if (isOnBoard(this.board, to)) {
        this.at = to;
        return [{ what: "move-ring", square: to }];
      }
    }
    return [];
  }
}

/** Returns what a key asks of the board, or null for a key it leaves to the page. */
function boardKeyOf(pressed: KeyPress): BoardKey | null {
  if (isShortcut(pressed)) return null;
  if (pressed.key.toLowerCase() === "h") return { what: "hint" };
  return KEYS.get(pressed.code) ?? null;
}
