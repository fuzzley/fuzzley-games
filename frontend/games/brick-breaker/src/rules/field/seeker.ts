// The seeker: a ball that turns toward the nearest brick the level needs
// that it can see above it while it rises. The Seeker capsule makes every
// ball in flight seek; the paddle lends it to a ball it meets once the
// level's last few bricks have outlasted a few of its balls.

import { clamp } from "@fz/core/math";
import { type Brick, isPlated } from "../bricks/bricks";
import { isNeeded } from "../catalog/bricks";
import { cellMiddleX, cellMiddleY, inSight } from "../grid";
import { type Ball, settleBall, turnBall } from "../paddle/balls";
import { SEEKER_LEND, SEEKER_TURN, STEP_S } from "../tuning";
import type { Field } from "./field";

/** The most a seeking ball turns in a step, in degrees. */
const STEP_TURN = SEEKER_TURN * STEP_S;

/** How many degrees make a radian. */
const DEGREES = 180 / Math.PI;

/**
 * Turns a ball in flight that seeks and rises a step's worth toward the
 * middle of the nearest brick the level needs that it can see above it,
 * then settles it, as every turn is, no flatter than the flattest a ball
 * travels, so it still rises.
 *
 * A falling ball is left alone, so it meets the paddle where its line
 * says, and so is one that sees no such brick: it would only meet what
 * stands in the way, a plate's underside, or, for a brick below it,
 * nothing, skimming flat.
 */
export function seek(field: Readonly<Field>, ball: Ball): void {
  if ((!ball.seeks && !field.seeking) || ball.dy >= 0) return;
  const brick = nearestInSight(field, ball);
  if (!brick) return;
  const toward = Math.atan2(
    cellMiddleX(brick.cell) - ball.x,
    ball.y - cellMiddleY(brick.cell),
  );
  const heading = Math.atan2(ball.dx, -ball.dy);
  // The difference, the short way round, from -180° to 180°.
  const off =
    Math.atan2(Math.sin(toward - heading), Math.cos(toward - heading)) *
    DEGREES;
  turnBall(ball, clamp(off, -STEP_TURN, STEP_TURN));
  settleBall(ball, 0, 0);
}

/**
 * Lends a ball the paddle has met the seeker, if the level needs few enough
 * bricks and enough balls have left the paddle since one it needs broke,
 * then counts the ball as leaving the paddle, unless the paddle holds it,
 * which counts it as it lets it go.
 */
export function lendAtPaddle(field: Field, ball: Ball): void {
  if (
    !ball.seeks &&
    field.needed <= SEEKER_LEND.needed &&
    field.dryBounces >= SEEKER_LEND.bounces
  ) {
    ball.seeks = true;
    field.events.add("seeking", ball.x, ball.y);
  }
  if (!ball.held) leftPaddle(field);
}

/** Counts a ball that left the paddle, served, bounced or let go, toward lending the seeker. */
export function leftPaddle(field: Field): void {
  field.dryBounces++;
}

/** Ends a ball's seeking as it breaks a brick the level needs. */
export function endSeeking(ball: Ball, broken: Readonly<Brick>): void {
  if (isNeeded(broken.kind)) ball.seeks = false;
}

/**
 * Returns the unbroken brick the level needs nearest a ball's middle that
 * the ball can see above it and break from below, or null if there is none:
 * one whose middle is above the ball's, and which a straight line from the
 * ball's reaches past no other brick that stops a ball, and no plate, as
 * the autopilot aims.
 */
function nearestInSight(
  field: Readonly<Field>,
  ball: Readonly<Ball>,
): Brick | null {
  let nearest: Brick | null = null;
  let least = Infinity;
  // From the last row up, nearest first for a ball below the bricks, so few
  // lines of sight are followed.
  for (let cell = field.bricks.length - 1; cell >= 0; cell--) {
    const brick = field.bricks[cell];
    if (!brick || brick.broken || !isNeeded(brick.kind) || isPlated(brick)) {
      continue;
    }
    const rise = ball.y - cellMiddleY(brick.cell);
    if (rise <= 0) continue;
    const distance = Math.hypot(cellMiddleX(brick.cell) - ball.x, rise);
    if (distance < least && inSight(field.solid, ball.x, ball.y, brick.cell)) {
      least = distance;
      nearest = brick;
    }
  }
  return nearest;
}
