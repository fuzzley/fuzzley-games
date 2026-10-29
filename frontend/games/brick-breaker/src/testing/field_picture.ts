import type { Ball } from "../rules/balls";
import type { Brick } from "../rules/bricks";
import type { CapsuleId } from "../rules/catalog/capsules";
import type { FieldEventKind } from "../rules/events";
import { type Field, createField, stepField } from "../rules/field";
import { CELLS, cellIndex, columnOf, rowOf } from "../rules/grid";
import { LEGEND, NO_BRICK, brickOf } from "../rules/legend";
import type { LevelBrick } from "../rules/level";
import type { Steer } from "../rules/paddle";
import type { Speed } from "../rules/speed";
import { COLUMNS, ROWS } from "../rules/tuning";

/** Says how a pictured field is played, where a spec cares. */
export interface PictureOptions {
  readonly speed?: Speed;
  readonly seed?: number;
  readonly pace?: number;
  /** The chance a needed brick lets a capsule fall, none by default. */
  readonly drops?: number;
  /** The capsules that can fall, none by default. */
  readonly capsules?: readonly CapsuleId[];
  /** The capsule every gift brick gives, else one drawn. */
  readonly gift?: CapsuleId;
}

/** Rows that lay one brick far down the field, which keeps a level from clearing. */
export const KEEPER: readonly string[] = [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "o",
];

/** Steering that asks nothing of the paddle. */
export const NO_STEER: Readonly<Steer> = { to: null, by: 0, push: 0 };

/**
 * Returns a field from a picture of its bricks, a row of up to 13 characters
 * for each row from the top, in the characters of `legend.ts`'s shared
 * legend, `.` or nothing for no brick. It throws for a row too long, too
 * many rows, or a character it doesn't know, so a spec plays the field it
 * draws.
 */
export function fieldFrom(
  rows: readonly string[],
  options: PictureOptions = {},
): Field {
  if (rows.length > ROWS) {
    throw new Error(`Too many rows: ${String(rows.length)}.`);
  }
  for (const row of rows) {
    if (row.length > COLUMNS) throw new Error(`A row too long: "${row}".`);
  }
  const cells = Array.from({ length: CELLS }, (_, cell) =>
    brickFrom(
      rows[rowOf(cell)]?.[columnOf(cell)] ?? NO_BRICK,
      options.gift ?? null,
    ),
  );
  return createField(
    {
      cells,
      pace: options.pace ?? 1,
      drops: options.drops ?? 0,
      capsules: options.capsules ?? [],
    },
    { speed: options.speed ?? "normal", seed: options.seed ?? 1 },
  );
}

/**
 * Puts one of the field's balls in play at a place, heading at an angle
 * from straight up, in degrees, positive to the right, and returns it; the
 * field is then in play.
 */
export function throwBall(
  field: Field,
  x: number,
  y: number,
  degrees: number,
  index = 0,
): Ball {
  const ball = ballOf(field, index);
  field.state = "playing";
  Object.assign(ball, {
    live: true,
    held: false,
    x,
    y,
    lastX: x,
    lastY: y,
    dx: Math.sin((degrees * Math.PI) / 180),
    dy: -Math.cos((degrees * Math.PI) / 180),
  });
  return ball;
}

/**
 * Puts a field in play with no ball in it, which no level is, so a spec of
 * what falls or rises steps it with nothing else moving, and returns it.
 */
export function playWithoutBall(field: Field): Field {
  field.state = "playing";
  for (const ball of field.balls) ball.live = false;
  return field;
}

/** Returns the brick in a cell of the field, broken or not. */
export function brickAt(field: Field, column: number, row: number): Brick {
  const brick = field.bricks[cellIndex(column, row)];
  if (!brick) throw new Error(`No brick at ${String(column)}, ${String(row)}.`);
  return brick;
}

/** Returns one of the field's balls, in play or not. */
export function ballOf(field: Field, index = 0): Ball {
  const ball = field.balls[index];
  if (!ball) throw new Error(`The field has no ball ${String(index)}.`);
  return ball;
}

/** Steps a field a number of times. */
export function stepTimes(field: Field, steps: number): void {
  for (let i = 0; i < steps; i++) stepField(field);
}

/** Returns the kinds of every event the field's log still holds, oldest first. */
export function eventsOf(field: Field): FieldEventKind[] {
  const kinds: FieldEventKind[] = [];
  field.events.forEachSince(0, (event) => kinds.push(event.kind));
  return kinds;
}

/** Returns which way a ball heads, in degrees from straight up, positive to the right. */
export function headingOf(ball: Readonly<Ball>): number {
  return (Math.atan2(ball.dx, -ball.dy) * 180) / Math.PI;
}

/** Returns the brick a picture's character stands for, or null. */
function brickFrom(
  character: string,
  gift: CapsuleId | null,
): LevelBrick | null {
  if (character === NO_BRICK) return null;
  const spec = LEGEND[character];
  if (!spec) throw new Error(`No brick is drawn "${character}".`);
  const brick = brickOf(spec, 0);
  return gift && brick.kind === "gift" ? { ...brick, capsule: gift } : brick;
}
