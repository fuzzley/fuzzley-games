import type { Paddle } from "./paddle";
import {
  BALL_RADIUS,
  FLATTEST,
  PADDLE_ANGLE,
  PADDLE_TOP,
  SERVE_ANGLE,
} from "./tuning";

/** Describes a ball: where it is, which way it goes, and what it has done. */
export interface Ball {
  /** Whether it is in play; one that isn't waits in the field's pool. */
  live: boolean;
  /** Where its center is, in field units. */
  x: number;
  y: number;
  /** Where its center was a step ago, for the scene to draw between. */
  lastX: number;
  lastY: number;
  /** Which way it goes, a direction of length 1; its speed is the field's. */
  dx: number;
  dy: number;
  /** Whether it rests on the paddle, waiting to be launched. */
  held: boolean;
  /** Where it rests on the paddle, from the paddle's middle. */
  offset: number;
  /** How many steps it has rested there, caught. */
  heldSteps: number;
  /** How many times it has bounced since it last met the paddle or broke a brick the level needs. */
  bounces: number;
}

/** The sine of the flattest a ball travels. */
const FLATTEST_SIN = Math.sin(toRadians(FLATTEST));

/** The cosine of the flattest a ball travels. */
const FLATTEST_COS = Math.cos(toRadians(FLATTEST));

/** Returns a ball out of play. */
export function createBall(): Ball {
  return {
    live: false,
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    dx: 0,
    dy: -1,
    held: false,
    offset: 0,
    heldSteps: 0,
    bounces: 0,
  };
}

/** Puts a ball in play, resting on the paddle at an offset from its middle. */
export function holdBall(
  ball: Ball,
  paddle: Readonly<Paddle>,
  offset: number,
): void {
  ball.live = true;
  ball.held = true;
  ball.offset = offset;
  ball.heldSteps = 0;
  ball.bounces = 0;
  followPaddle(ball, paddle);
  ball.lastX = ball.x;
  ball.lastY = ball.y;
}

/** Keeps a resting ball where it rests on the paddle. */
export function followPaddle(ball: Ball, paddle: Readonly<Paddle>): void {
  ball.x = paddle.x + ball.offset;
  ball.y = PADDLE_TOP - BALL_RADIUS;
}

/**
 * Puts a ball in play where another is, heading as it does turned by an
 * angle, in degrees, clockwise on the field.
 */
export function splitOff(
  ball: Readonly<Ball>,
  copy: Ball,
  degrees: number,
): void {
  copy.live = true;
  copy.held = false;
  copy.x = ball.x;
  copy.y = ball.y;
  copy.lastX = ball.lastX;
  copy.lastY = ball.lastY;
  copy.dx = ball.dx;
  copy.dy = ball.dy;
  copy.offset = 0;
  copy.heldSteps = 0;
  copy.bounces = 0;
  turnBall(copy, degrees);
  settleBall(copy, 0, 0);
}

/** Sends a resting ball off the paddle, {@link SERVE_ANGLE} from straight up toward the way it faces. */
export function serveBall(ball: Ball, facing: -1 | 1): void {
  ball.held = false;
  aim(ball, facing * SERVE_ANGLE);
}

/**
 * Sends a ball off the paddle by where it met it: straight up from the
 * middle, and up to {@link PADDLE_ANGLE} from straight up at either end.
 */
export function bounceOffPaddle(ball: Ball, paddle: Readonly<Paddle>): void {
  const reach = (ball.x - paddle.x) / (paddle.width / 2);
  aim(ball, Math.max(-1, Math.min(1, reach)) * PADDLE_ANGLE);
  ball.bounces = 0;
}

/**
 * Turns a ball as a mirror would, about a normal of length 1, if it moves
 * against it.
 */
export function reflectBall(ball: Ball, nx: number, ny: number): void {
  const along = ball.dx * nx + ball.dy * ny;
  if (along >= 0) return;
  ball.dx -= 2 * along * nx;
  ball.dy -= 2 * along * ny;
}

/** Turns a ball by an angle, in degrees, clockwise on the field. */
export function turnBall(ball: Ball, degrees: number): void {
  const sin = Math.sin(toRadians(degrees));
  const cos = Math.cos(toRadians(degrees));
  const { dx, dy } = ball;
  ball.dx = dx * cos - dy * sin;
  ball.dy = dx * sin + dy * cos;
}

/**
 * Settles a ball's direction after it turns off what it met, whose normal
 * is given: back to a length of 1, so turns never drift its speed, and no
 * flatter than {@link FLATTEST} from the horizontal.
 *
 * Held to the flattest, it keeps which way it goes across, and goes up or
 * down as it went, unless that would take it back into what it met, as a
 * ball glancing off a corner would be: then the other way. One going
 * straight across is sent up.
 */
export function settleBall(ball: Ball, nx: number, ny: number): void {
  const length = Math.hypot(ball.dx, ball.dy);
  ball.dx /= length;
  ball.dy /= length;
  if (Math.abs(ball.dy) >= FLATTEST_SIN) return;
  ball.dx = ball.dx < 0 ? -FLATTEST_COS : FLATTEST_COS;
  ball.dy = ball.dy > 0 ? FLATTEST_SIN : -FLATTEST_SIN;
  if (ball.dx * nx + ball.dy * ny < 0) ball.dy = -ball.dy;
}

/** Points a ball at an angle from straight up, in degrees, positive to the right. */
function aim(ball: Ball, degrees: number): void {
  ball.dx = Math.sin(toRadians(degrees));
  ball.dy = -Math.cos(toRadians(degrees));
}

/** Returns an angle in radians. */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
