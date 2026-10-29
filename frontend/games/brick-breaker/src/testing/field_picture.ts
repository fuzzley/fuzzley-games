import type { Ball } from "../rules/balls";
import { type BrickKindId, brickKind } from "../rules/catalog/bricks";
import type { FieldEventKind } from "../rules/events";
import { type Field, createField, stepField } from "../rules/field";
import { CELLS, columnOf, rowOf } from "../rules/grid";
import type { LevelBrick } from "../rules/level";
import type { Steer } from "../rules/paddle";
import type { Speed } from "../rules/speed";

/** The kinds a picture draws, by character. */
const KINDS: Readonly<Record<string, BrickKindId>> = {
  o: "plain",
  "#": "steel",
  "+": "regrow",
  "2": "tough",
  "3": "tough",
  "4": "tough",
};

/** Says how a pictured field is played, where a spec cares. */
export interface PictureOptions {
  readonly speed?: Speed;
  readonly seed?: number;
  readonly pace?: number;
}

/** Steering that asks nothing of the paddle. */
export const NO_STEER: Readonly<Steer> = { to: null, by: 0, push: 0 };

/**
 * Returns a field from a picture of its bricks, a row of up to 13 characters
 * for each row from the top: `.` or nothing for no brick, `o` a plain one,
 * `#` steel, `+` one that regrows, and `2` to `4` a tough one of that many
 * hits.
 */
export function fieldFrom(
  rows: readonly string[],
  options: PictureOptions = {},
): Field {
  const cells = Array.from({ length: CELLS }, (_, cell) =>
    brickFrom(rows[rowOf(cell)]?.[columnOf(cell)] ?? "."),
  );
  return createField(
    { cells, pace: options.pace ?? 1 },
    { speed: options.speed ?? "normal", seed: options.seed ?? 1 },
  );
}

/**
 * Puts one of the field's balls in play at a place, heading at an angle
 * from straight up, in degrees, positive to the right, and returns it.
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
function brickFrom(character: string): LevelBrick | null {
  const kind = KINDS[character];
  if (!kind) return null;
  const { hits } = brickKind(kind);
  if (hits === "never") return { kind, hits: 0, tint: 0 };
  return { kind, hits: kind === "tough" ? Number(character) : hits, tint: 0 };
}
