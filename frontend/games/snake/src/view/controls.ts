import type { Direction } from "../rules/geometry";

/**
 * Names what a key or a swipe asks of the game: a direction to turn, to
 * pause, or to pause or go on as it isn't.
 */
export type BoardCommand = Direction | "pause" | "toggle";

/**
 * What each key asks, by `event.code`, the key's place on the keyboard
 * rather than its letter, so Z, Q, S and D steer on an AZERTY keyboard as
 * W, A, S and D do on a QWERTY one.
 */
const KEYS: Readonly<Record<string, BoardCommand>> = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
  KeyW: "up",
  KeyD: "right",
  KeyS: "down",
  KeyA: "left",
  Escape: "pause",
  KeyP: "toggle",
  Space: "toggle",
};

/** The keys the board answers, by `event.code`. */
export const BOARD_KEYS: readonly string[] = Object.keys(KEYS);

/** Returns what a key asks of the game, or null for a key it ignores. */
export function commandOfKey(code: string): BoardCommand | null {
  return KEYS[code] ?? null;
}

/** How far a finger moves before a swipe turns the snake, in CSS pixels. */
export const SWIPE_CSS_PX = 24;

/**
 * Reads swipes as turns: once a finger has moved far enough, mostly along
 * one axis, it turns that way, and measures again from there, so one
 * gesture can make two turns.
 */
export class SwipeReader {
  private fromX = 0;
  private fromY = 0;
  private down = false;

  /** Starts a gesture at a point. */
  start(x: number, y: number): void {
    this.fromX = x;
    this.fromY = y;
    this.down = true;
  }

  /**
   * Returns the way a gesture has turned since it last turned, once it has
   * moved `distance` along either axis: the axis it moved along most.
   */
  move(x: number, y: number, distance: number): Direction | null {
    if (!this.down) return null;
    const dx = x - this.fromX;
    const dy = y - this.fromY;
    const along = Math.max(Math.abs(dx), Math.abs(dy));
    if (along < distance) return null;
    this.fromX = x;
    this.fromY = y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  /** Ends the gesture, after which moving turns nothing until the next. */
  end(): void {
    this.down = false;
  }
}
