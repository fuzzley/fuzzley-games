import type { Box } from "./grid";
import { STEP_MS } from "./stepper";
import {
  FIELD_WIDTH,
  KEY_RAMP_MS,
  KEY_SPEED,
  PADDLE_HEIGHT,
  PADDLE_RESIZE_SPEED,
  PADDLE_TOP,
  PADDLE_WIDTH,
  POINTER_SPEED,
  STEP_S,
} from "./tuning";

/**
 * Says how the player steers the paddle this frame: one object, written
 * again each frame.
 */
export interface Steer {
  /** Where a pointer asks the paddle's middle to be, in field units, or null. */
  to: number | null;
  /** How far a dragging finger has moved since the last frame, in field units. */
  by: number;
  /** Which way held keys push the paddle: -1, 0 or 1. */
  push: -1 | 0 | 1;
}

/** Describes the paddle: where it is, how wide, and how it is steered. */
export interface Paddle {
  /** Where its middle is, in field units. */
  x: number;
  /** Where its middle was a step ago, for the scene to draw between. */
  lastX: number;
  /** How wide it is. */
  width: number;
  /** How wide it is growing or shrinking to. */
  goalWidth: number;
  /** Where a pointer or a finger last asked its middle to be, or null. */
  target: number | null;
  /** Which way held keys push it: -1, 0 or 1. */
  push: -1 | 0 | 1;
  /** How fast held keys move it, in units a second, signed. */
  speed: number;
  /** Which way it last moved, which a serve leaves toward. */
  facing: -1 | 1;
}

/** The share of the keys' top speed one step's ramp adds. */
const RAMP = STEP_MS / KEY_RAMP_MS;

/** Returns a paddle in the field's middle, at its first width. */
export function createPaddle(): Paddle {
  const middle = FIELD_WIDTH / 2;
  return {
    x: middle,
    lastX: middle,
    width: PADDLE_WIDTH,
    goalWidth: PADDLE_WIDTH,
    target: null,
    push: 0,
    speed: 0,
    facing: 1,
  };
}

/**
 * Takes a frame's steering: held keys go first, then a pointer's place, then
 * a finger's drag, which moves the place the paddle heads for.
 *
 * Keys let go of where a pointer last asked the paddle to be, and a pointer
 * that stops asking leaves the paddle heading where it last asked.
 */
export function steerPaddle(paddle: Paddle, steer: Readonly<Steer>): void {
  if (steer.push !== paddle.push) paddle.speed = 0;
  paddle.push = steer.push;
  if (steer.push !== 0) {
    paddle.target = null;
  } else if (steer.to !== null) {
    paddle.target = within(paddle, steer.to);
  } else if (steer.by !== 0) {
    paddle.target = within(paddle, (paddle.target ?? paddle.x) + steer.by);
  }
}

/**
 * Moves the paddle on by a step: toward its width, then by its keys, at
 * their speed as it ramps up, or toward its target, never past the walls.
 */
export function movePaddle(paddle: Paddle): void {
  paddle.lastX = paddle.x;
  paddle.width = toward(
    paddle.width,
    paddle.goalWidth,
    PADDLE_RESIZE_SPEED * STEP_S,
  );
  if (paddle.push !== 0) {
    paddle.speed = toward(
      paddle.speed,
      paddle.push * KEY_SPEED,
      KEY_SPEED * RAMP,
    );
    paddle.x += paddle.speed * STEP_S;
  } else if (paddle.target !== null) {
    paddle.x = toward(paddle.x, paddle.target, POINTER_SPEED * STEP_S);
  }
  paddle.x = within(paddle, paddle.x);
  if (paddle.x !== paddle.lastX) {
    paddle.facing = paddle.x > paddle.lastX ? 1 : -1;
  }
}

/** Writes the paddle's box into `box`, and returns it. */
export function paddleBox(paddle: Readonly<Paddle>, box: Box): Box {
  box.left = paddle.x - paddle.width / 2;
  box.top = PADDLE_TOP;
  box.right = paddle.x + paddle.width / 2;
  box.bottom = PADDLE_TOP + PADDLE_HEIGHT;
  return box;
}

/** Returns a place for the paddle's middle that keeps it between the walls. */
function within(paddle: Readonly<Paddle>, x: number): number {
  const half = paddle.width / 2;
  return Math.min(FIELD_WIDTH - half, Math.max(half, x));
}

/** Returns a value moved toward a goal by at most a step. */
function toward(value: number, goal: number, step: number): number {
  return value < goal
    ? Math.min(goal, value + step)
    : Math.max(goal, value - step);
}
