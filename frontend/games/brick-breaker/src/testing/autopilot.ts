import { createRandom } from "@fz/core/random";
import type { Ball } from "../rules/balls";
import { fireBolts } from "../rules/bolts";
import { isNeeded } from "../rules/bricks";
import type { Falling } from "../rules/capsules";
import { ballKind } from "../rules/catalog/balls";
import { capsule } from "../rules/catalog/capsules";
import {
  type Field,
  createField,
  launch,
  serve,
  steerField,
  stepField,
} from "../rules/field";
import { columnMiddle, columnOf, rowMiddle, rowOf } from "../rules/grid";
import type { Level } from "../rules/level";
import { type Speed, ballSpeed } from "../rules/speed";
import { stepsIn } from "../rules/stepper";
import {
  BALL_RADIUS,
  CAPSULE_FALL_SPEED,
  CAPSULE_HEIGHT,
  FIELD_WIDTH,
  PADDLE_ANGLE,
  PADDLE_TOP,
  POINTER_SPEED,
} from "../rules/tuning";

/** The longest the autopilot plays a level, in steps: eight minutes. */
export const AUTOPILOT_LIMIT = stepsIn(8 * 60_000);

/** Says how the autopilot's play of a level went. */
export interface AutopilotReport {
  /** Whether it cleared the level within its time. */
  readonly cleared: boolean;
  /** The steps it played, to the clearing or to its limit. */
  readonly steps: number;
  /**
   * The steps it played once the level needed {@link ENDGAME} bricks or
   * fewer, where a level that hides its last bricks drags.
   */
  readonly endgameSteps: number;
  /** How many times the paddle met a ball. */
  readonly bounces: number;
  /** How many times it lost the last ball. */
  readonly livesLost: number;
  /** The level's points, before what clearing it adds. */
  readonly score: number;
}

/** Says where the autopilot means to send the ball it is about to meet. */
interface Aim {
  /** The ball, by its place in the field's list, or -1 for none yet. */
  ball: number;
  /** The cell of a needed brick it aims at, or -1 for a place on the paddle. */
  cell: number;
  /** Where on the paddle it lands the ball otherwise, from -1 to 1. */
  reach: number;
}

/** How few needed bricks are left when a level's endgame starts. */
export const ENDGAME = 3;

/** The farthest along the paddle the autopilot lands a ball, as a share of its half. */
const MOST_REACH = 0.85;

/** Where a ball's middle meets the paddle's top. */
const PADDLE_LINE = PADDLE_TOP - BALL_RADIUS;

/**
 * Plays a level as a good player would, from a seed, and returns how it
 * went: it keeps the paddle under the ball that will reach it first, lands
 * it a seeded distance off the middle or toward a brick the level needs,
 * catches the good capsules it has time for, fires whenever it can, and
 * serves and launches at once.
 */
export function autoplay(
  level: Level,
  speed: Speed,
  seed: number,
  limit = AUTOPILOT_LIMIT,
): AutopilotReport {
  const field = createField(level, { speed, seed });
  const random = createRandom(seed);
  const aim: Aim = { ball: -1, cell: -1, reach: 0 };
  let bounces = 0;
  let seen = field.events.latest;
  let steps = 0;
  let endgameSteps = 0;
  for (; steps < limit && !isCleared(field); steps++) {
    if (field.needed <= ENDGAME) endgameSteps++;
    if (field.state === "lost") serve(field);
    launch(field);
    fireBolts(field);
    steerField(field, { to: targetOf(field, aim, random), by: 0, push: 0 });
    stepField(field);
    field.events.forEachSince(seen, (event) => {
      if (event.kind === "paddle") {
        bounces++;
        aim.ball = -1;
      }
    });
    seen = field.events.latest;
  }
  return {
    cleared: isCleared(field),
    steps,
    endgameSteps,
    bounces,
    livesLost: field.livesLost,
    score: field.score,
  };
}

/** Returns whether the field's level is cleared, read afresh. */
function isCleared(field: Readonly<Field>): boolean {
  return field.state === "cleared";
}

/**
 * Returns where the paddle's middle should head: under the ball that will
 * reach it first, set to send it where the autopilot aims, or under a good
 * capsule it has time to catch first.
 */
function targetOf(field: Field, aim: Aim, random: () => number): number {
  const ball = firstToLand(field);
  const capsuleX = goodCapsuleX(field, ball);
  if (capsuleX !== null) return capsuleX;
  if (!ball) return lowestBallX(field);
  const index = field.balls.indexOf(ball);
  if (aim.ball !== index) chooseAim(field, aim, index, random);
  const landing = landingX(ball);
  return landing - reachFor(field, aim, landing) * (field.paddle.width / 2);
}

/** Returns the free ball falling toward the paddle that will reach it first, or null. */
function firstToLand(field: Field): Ball | null {
  let first: Ball | null = null;
  for (const ball of field.balls) {
    if (!ball.live || ball.held || ball.dy <= 0 || ball.y > PADDLE_LINE) {
      continue;
    }
    if (!first || timeToLand(ball) < timeToLand(first)) first = ball;
  }
  return first;
}

/** Returns how far a ball travels before it reaches the paddle's line. */
function timeToLand(ball: Readonly<Ball>): number {
  return (PADDLE_LINE - ball.y) / ball.dy;
}

/**
 * Returns where a falling ball's middle meets the paddle's line, as it
 * travels now, turned by the side walls but by nothing else.
 */
function landingX(ball: Readonly<Ball>): number {
  const span = FIELD_WIDTH - 2 * BALL_RADIUS;
  const across = ball.x - BALL_RADIUS + ball.dx * timeToLand(ball);
  const folded = ((across % (2 * span)) + 2 * span) % (2 * span);
  return BALL_RADIUS + (folded > span ? 2 * span - folded : folded);
}

/** Picks where to send a ball: half the time at a brick the level needs, else a place on the paddle. */
function chooseAim(
  field: Field,
  aim: Aim,
  index: number,
  random: () => number,
): void {
  aim.ball = index;
  aim.reach = (random() * 2 - 1) * MOST_REACH;
  aim.cell = -1;
  const needed = field.bricks.filter(
    (brick) => brick && !brick.broken && isNeeded(brick),
  );
  if (needed.length > 0 && random() < 0.5) {
    aim.cell = needed[Math.floor(random() * needed.length)]?.cell ?? -1;
  }
}

/** Returns where on the paddle to land the ball, from -1 to 1, to send it as the aim says. */
function reachFor(field: Field, aim: Aim, landing: number): number {
  const brick = aim.cell < 0 ? null : field.bricks[aim.cell];
  if (!brick || brick.broken) return aim.reach;
  const toward =
    (Math.atan2(
      columnMiddle(columnOf(brick.cell)) - landing,
      PADDLE_LINE - rowMiddle(rowOf(brick.cell)),
    ) *
      180) /
    Math.PI;
  return Math.max(-MOST_REACH, Math.min(MOST_REACH, toward / PADDLE_ANGLE));
}

/**
 * Returns where the lowest good capsule falling is across, if the paddle
 * has time to catch it before it must meet the ball, else null.
 */
function goodCapsuleX(
  field: Field,
  ball: Readonly<Ball> | null,
): number | null {
  const falling = lowestGoodCapsule(field);
  if (!falling) return null;
  const capsuleTime =
    (PADDLE_TOP - CAPSULE_HEIGHT / 2 - falling.y) / CAPSULE_FALL_SPEED;
  const reachTime = Math.abs(falling.x - field.paddle.x) / POINTER_SPEED;
  if (capsuleTime < reachTime) return null;
  if (!ball) return falling.x;
  const ballTime = timeToLand(ball) / ballSpeedOf(field);
  const backTime = Math.abs(landingX(ball) - falling.x) / POINTER_SPEED;
  return capsuleTime + backTime < ballTime ? falling.x : null;
}

/** Returns the lowest good capsule falling above the paddle, or null. */
function lowestGoodCapsule(field: Field): Falling | null {
  let lowest: Falling | null = null;
  for (const falling of field.falling) {
    if (!falling.live || capsule(falling.id).tone !== "good") continue;
    if (falling.y > PADDLE_TOP) continue;
    if (!lowest || falling.y > lowest.y) lowest = falling;
  }
  return lowest;
}

/** Returns how fast the field's balls go, in units a second. */
function ballSpeedOf(field: Field): number {
  return (
    ballSpeed(
      field.setup.speed,
      field.level.pace,
      field.climbed,
      field.paceScale,
    ) * ballKind(field.ballKind).speed
  );
}

/** Returns where the lowest ball in play is across, or the paddle's middle if none is. */
function lowestBallX(field: Field): number {
  let lowest: Ball | null = null;
  for (const ball of field.balls) {
    if (ball.live && (!lowest || ball.y > lowest.y)) lowest = ball;
  }
  return lowest ? lowest.x : field.paddle.x;
}
