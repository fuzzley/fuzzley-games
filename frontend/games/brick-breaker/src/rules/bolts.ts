import { type Brick, hitBrick } from "./bricks";
import type { Field } from "./field";
import { cellIndex, columnAt, rowAt } from "./grid";
import { stepsIn } from "./stepper";
import {
  BOLT_GAP_MS,
  BOLT_INSET,
  BOLT_SPEED,
  PADDLE_TOP,
  ROWS,
  STEP_S,
} from "./tuning";

/** Describes a laser bolt rising up the field. */
export interface Bolt {
  /** Whether it is rising; one that isn't waits in the field's pool. */
  live: boolean;
  /** Where it rises, across, in field units. */
  x: number;
  /** Where its tip is, down the field. */
  y: number;
  /** Where its tip was a step ago, for the scene to draw between. */
  lastY: number;
}

/** How many bolts the field keeps records for, far more than rise at once. */
export const BOLT_POOL = 8;

/** Returns the records of the bolts a field may have rising, none rising. */
export function createBolts(): Bolt[] {
  return Array.from({ length: BOLT_POOL }, () => ({
    live: false,
    x: 0,
    y: 0,
    lastY: 0,
  }));
}

/**
 * Fires a bolt from each end of the paddle, if a laser is in effect, the
 * level is in play, and the last pair went long enough ago.
 */
export function fire(field: Field): void {
  if (field.mode !== "laser" || field.state !== "playing") return;
  if (field.steps < field.boltsReadyAt) return;
  field.boltsReadyAt = field.steps + stepsIn(BOLT_GAP_MS);
  const { x, width } = field.paddle;
  shoot(field, x - width / 2 + BOLT_INSET);
  shoot(field, x + width / 2 - BOLT_INSET);
  field.events.add("fired", x, PADDLE_TOP);
}

/**
 * Moves each bolt up a step: one that reaches a brick hits it once and
 * stops, steel too, and one that reaches the top wall stops there.
 */
export function stepBolts(field: Field): void {
  for (const bolt of field.bolts) {
    if (!bolt.live) continue;
    bolt.lastY = bolt.y;
    const top = bolt.y - BOLT_SPEED * STEP_S;
    const brick = firstBrickAbove(field, bolt.x, bolt.y, top);
    if (brick) {
      bolt.live = false;
      hitBrick(field, brick, bolt.x, bolt.y);
      if (field.state === "cleared") return;
    } else {
      bolt.y = top;
      if (top <= 0) bolt.live = false;
    }
  }
}

/** Lets go of every bolt, as a life is lost. */
export function dropBolts(field: Field): void {
  for (const bolt of field.bolts) bolt.live = false;
}

/** Puts a bolt in play at the paddle's top, if the field has a record free. */
function shoot(field: Field, x: number): void {
  const bolt = field.bolts.find((each) => !each.live);
  if (bolt) {
    bolt.live = true;
    bolt.x = x;
    bolt.y = PADDLE_TOP;
    bolt.lastY = PADDLE_TOP;
  }
}

/**
 * Returns the first brick a bolt's tip reaches rising from one place to
 * another in its column, or null.
 */
function firstBrickAbove(
  field: Field,
  x: number,
  from: number,
  to: number,
): Brick | null {
  const column = columnAt(x);
  const lowest = Math.min(ROWS - 1, rowAt(from));
  const highest = Math.max(0, rowAt(to));
  for (let row = lowest; row >= highest; row--) {
    const brick = field.bricks[cellIndex(column, row)];
    if (brick && !brick.broken) return brick;
  }
  return null;
}
