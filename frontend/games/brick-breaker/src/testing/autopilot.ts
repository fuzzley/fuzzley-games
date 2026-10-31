import { clamp } from "@fz/core/math";
import { createRandom } from "@fz/core/random";
import type { Ball } from "../rules/balls";
import { fireBolts } from "../rules/bolts";
import type { Falling } from "../rules/capsules";
import { isNeeded } from "../rules/catalog/bricks";
import { capsule } from "../rules/catalog/capsules";
import {
  type Field,
  ballSpeedOf,
  createField,
  launch,
  reshapeField,
  serve,
  steerField,
  stepField,
} from "../rules/field";
import {
  cellIndex,
  cellMiddleX,
  cellMiddleY,
  columnAt,
  rowAt,
} from "../rules/grid";
import type { Level } from "../rules/level";
import { type LevelEntry, parseLevel } from "../rules/levels";
import { paddleTopOf } from "../rules/paddle";
import type { Speed } from "../rules/speed";
import { stepsIn } from "../rules/stepper";
import {
  BALL_RADIUS,
  BRICKS_TOP,
  BRICK_HEIGHT,
  CAPSULE_FALL_SPEED,
  CAPSULE_HEIGHT,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  PADDLE_ANGLE,
  PADDLE_TOP,
  POINTER_SPEED,
  ROWS,
} from "../rules/tuning";
import { GLOW_BRICKS } from "../view/timing";

/**
 * The longest the autopilot plays a level, in steps: eight minutes on a
 * field {@link FIELD_HEIGHT} tall, longer on a taller one ({@link limitsOf}).
 */
export const AUTOPILOT_LIMIT = stepsIn(8 * 60_000);

/**
 * The longest a level's endgame may take the autopilot, in steps: a minute
 * on a field {@link FIELD_HEIGHT} tall, longer on a taller one
 * ({@link limitsOf}).
 */
export const ENDGAME_LIMIT = stepsIn(60_000);

/** Says the longest the autopilot may take over a level, in steps. */
export interface AutopilotLimits {
  /** Over the whole level. */
  readonly level: number;
  /** Over its last bricks, once it needs {@link ENDGAME} or fewer. */
  readonly endgame: number;
}

/** Where the middle of the bricks' grid lies, down the field. */
const GRID_MIDDLE = BRICKS_TOP + (ROWS * BRICK_HEIGHT) / 2;

/**
 * Returns the longest the autopilot may take over a level on a field of a
 * height: the limits of a field {@link FIELD_HEIGHT} tall, stretched as far
 * as the paddle lies farther from the bricks, between which a ball's trips
 * run, since it goes no faster.
 */
export function limitsOf(height: number): AutopilotLimits {
  const stretch =
    (paddleTopOf(height) - GRID_MIDDLE) / (PADDLE_TOP - GRID_MIDDLE);
  return {
    level: Math.ceil(AUTOPILOT_LIMIT * stretch),
    endgame: Math.ceil(ENDGAME_LIMIT * stretch),
  };
}

/** Says how the autopilot plays a level, where a caller cares. */
export interface AutopilotOptions {
  /** How tall the field is, {@link FIELD_HEIGHT} by default. */
  readonly height?: number;
  /** The most steps it plays, the field's {@link limitsOf} by default. */
  readonly limit?: number;
}

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
  /** How many capsules the paddle caught. */
  readonly caught: number;
  /** How many times it lost the last ball. */
  readonly livesLost: number;
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

/** How few needed bricks are left when a level's endgame starts: those that may glow. */
export const ENDGAME = GLOW_BRICKS;

/** How often the autopilot aims a ball at a brick the level needs, rather than at a place on the paddle. */
const AIM_AT_BRICK = 0.5;

/** The farthest along the paddle the autopilot lands a ball, as a share of its half. */
const MOST_REACH = 0.85;

/** How far apart the autopilot looks along its line of sight to a brick. */
const SIGHT_STEP = 0.25;

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
  options: AutopilotOptions = {},
): AutopilotReport {
  const field = createField(level, { speed, seed });
  reshapeField(field, options.height ?? FIELD_HEIGHT);
  const limit = options.limit ?? limitsOf(field.height).level;
  const random = createRandom(seed);
  const aim: Aim = { ball: -1, cell: -1, reach: 0 };
  let bounces = 0;
  let caught = 0;
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
      if (event.kind === "caught") caught++;
    });
    seen = field.events.latest;
  }
  return {
    cleared: isCleared(field),
    steps,
    endgameSteps,
    bounces,
    caught,
    livesLost: field.livesLost,
  };
}

/**
 * Plays one of the game's levels at a speed, from its number as the seed
 * unless given another, as `src/rules/autopilot.spec.ts` and
 * `yarn report:levels` both play it.
 */
export function playLevel(
  entry: LevelEntry,
  speed: Speed,
  options: { readonly seed?: number } & Pick<AutopilotOptions, "height"> = {},
): AutopilotReport {
  return autoplay(parseLevel(entry), speed, options.seed ?? entry.number, {
    height: options.height,
  });
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
  const landing = landingX(field, ball);
  if (aim.ball !== index) chooseAim(field, aim, index, landing, random);
  return landing - reachFor(field, aim, landing) * (field.paddle.width / 2);
}

/** Returns the free ball falling toward the paddle that will reach it first, or null. */
function firstToLand(field: Field): Ball | null {
  const line = paddleLine(field);
  let first: Ball | null = null;
  for (const ball of field.balls) {
    if (!ball.live || ball.held || ball.dy <= 0 || ball.y > line) continue;
    if (!first || distanceToLand(field, ball) < distanceToLand(field, first)) {
      first = ball;
    }
  }
  return first;
}

/** Returns where a ball's middle meets the paddle's top, down the field. */
function paddleLine(field: Readonly<Field>): number {
  return field.paddle.top - BALL_RADIUS;
}

/** Returns how far a ball travels before it reaches the paddle's line. */
function distanceToLand(field: Readonly<Field>, ball: Readonly<Ball>): number {
  return (paddleLine(field) - ball.y) / ball.dy;
}

/**
 * Returns where a falling ball's middle meets the paddle's line, as it
 * travels now, turned by the side walls but by nothing else.
 */
function landingX(field: Readonly<Field>, ball: Readonly<Ball>): number {
  const span = FIELD_WIDTH - 2 * BALL_RADIUS;
  const across = ball.x - BALL_RADIUS + ball.dx * distanceToLand(field, ball);
  const folded = ((across % (2 * span)) + 2 * span) % (2 * span);
  return BALL_RADIUS + (folded > span ? 2 * span - folded : folded);
}

/**
 * Picks where to send a ball about to land: half the time at a brick the
 * level needs that it can see from where the ball will land, else at a
 * place on the paddle.
 */
function chooseAim(
  field: Field,
  aim: Aim,
  index: number,
  landing: number,
  random: () => number,
): void {
  aim.ball = index;
  aim.reach = (random() * 2 - 1) * MOST_REACH;
  aim.cell = -1;
  if (random() >= AIM_AT_BRICK) return;
  const seen = field.bricks.filter(
    (brick) =>
      brick &&
      !brick.broken &&
      isNeeded(brick.kind) &&
      inSight(field, landing, brick.cell),
  );
  if (seen.length > 0) {
    aim.cell = seen[Math.floor(random() * seen.length)]?.cell ?? -1;
  }
}

/** Returns where on the paddle to land the ball, from -1 to 1, to send it as the aim says. */
function reachFor(field: Field, aim: Aim, landing: number): number {
  const brick = aim.cell < 0 ? null : field.bricks[aim.cell];
  if (!brick || brick.broken) return aim.reach;
  const toward =
    (Math.atan2(
      cellMiddleX(brick.cell) - landing,
      paddleLine(field) - cellMiddleY(brick.cell),
    ) *
      180) /
    Math.PI;
  return clamp(toward / PADDLE_ANGLE, -MOST_REACH, MOST_REACH);
}

/**
 * Returns whether a straight line from a place on the paddle's line to a
 * brick's middle meets no other brick, as a ball sent at it would travel.
 *
 * It follows only the ball's middle, and leaves aside how steep a ball the
 * paddle can send: a guess at what a player sees, which played the levels
 * better in the report than one that followed the ball's edges too.
 */
function inSight(field: Field, from: number, cell: number): boolean {
  const x = cellMiddleX(cell);
  const y = cellMiddleY(cell);
  const line = paddleLine(field);
  const length = Math.hypot(x - from, line - y);
  for (let along = 0; along < length; along += SIGHT_STEP) {
    const t = along / length;
    const column = columnAt(from + (x - from) * t);
    const row = rowAt(line + (y - line) * t);
    if (cellIndex(column, row) !== cell && field.solid(column, row)) {
      return false;
    }
  }
  return true;
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
    (field.paddle.top - CAPSULE_HEIGHT / 2 - falling.y) / CAPSULE_FALL_SPEED;
  const reachTime = Math.abs(falling.x - field.paddle.x) / POINTER_SPEED;
  if (capsuleTime < reachTime) return null;
  if (!ball) return falling.x;
  const ballTime = distanceToLand(field, ball) / ballSpeedOf(field);
  const backTime = Math.abs(landingX(field, ball) - falling.x) / POINTER_SPEED;
  return capsuleTime + backTime < ballTime ? falling.x : null;
}

/** Returns the lowest good capsule falling above the paddle, or null. */
function lowestGoodCapsule(field: Field): Falling | null {
  let lowest: Falling | null = null;
  for (const falling of field.falling) {
    if (!falling.live || capsule(falling.id).tone !== "good") continue;
    if (falling.y > field.paddle.top) continue;
    if (!lowest || falling.y > lowest.y) lowest = falling;
  }
  return lowest;
}

/** Returns where the lowest ball in play is across, or the paddle's middle if none is. */
function lowestBallX(field: Field): number {
  let lowest: Ball | null = null;
  for (const ball of field.balls) {
    if (ball.live && (!lowest || ball.y > lowest.y)) lowest = ball;
  }
  return lowest ? lowest.x : field.paddle.x;
}
