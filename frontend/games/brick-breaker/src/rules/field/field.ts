import { clamp } from "@fz/core/math";
import type { Solid } from "@fz/core/sweep";
import {
  type Brick,
  canBreak,
  createBrick,
  neededLeft,
  stepBricks,
} from "../bricks/bricks";
import {
  type Effects,
  type Falling,
  clearFalling,
  createEffects,
  createFalling,
  endEffect,
  endEffects,
  stepCapsules,
  stepEffects,
} from "../bricks/capsules";
import { type BallKindId, ballKind } from "../catalog/balls";
import type { PaddleMode } from "../catalog/capsules";
import { cellIndex, inGrid } from "../grid";
import type { Level } from "../levels/level";
import {
  type Ball,
  bounceOffPaddle,
  createBall,
  followPaddle,
  holdBall,
  serveBall,
} from "../paddle/balls";
import { type Bolt, clearBolts, createBolts, stepBolts } from "../paddle/bolts";
import {
  type Paddle,
  type Steer,
  createPaddle,
  movePaddle,
  paddleTopOf,
  steerPaddle,
} from "../paddle/paddle";
import {
  PRESET_SPEEDS,
  SPEED_INFO,
  type Speed,
  ballSpeed,
  customFactor,
} from "../speed";
import {
  BALL_RADIUS,
  COLUMNS,
  FIELD_HEIGHT,
  KEY_SPEED,
  MAX_BALLS,
  NET_DEPTH,
  STEP_S,
  TALLEST_FIELD,
} from "../tuning";
import { FieldEventLog } from "./events";
import { endStreak } from "./scoring";
import { liftOffPaddle, travel } from "./travel";

/**
 * Names where a level stands: its ball waiting on the paddle to be served,
 * in play, its last ball lost, or every brick it needs broken.
 *
 * A blast lit before the last ball is lost still goes off, so a level may
 * be cleared from `lost` or `serve` as well as from `playing`.
 */
export type FieldState = "serve" | "playing" | "lost" | "cleared";

/** Says how a field is played: at which speed, and from which seed. */
export interface FieldSetup {
  readonly speed: Speed;
  /** The level's seed (`levelSeed()`), from which everything random on the field is drawn. */
  readonly seed: number;
}

/** Describes a level in play, which each step changes in place. */
export interface Field {
  readonly level: Level;
  readonly setup: FieldSetup;
  state: FieldState;
  /**
   * How tall it is, from the top wall to the floor: {@link FIELD_HEIGHT}, or
   * more as a tall screen reshapes it ({@link reshapeField}).
   */
  height: number;
  /** A brick for each cell of the grid, row by row, null where there is none. */
  readonly bricks: readonly (Brick | null)[];
  /**
   * Says whether a cell stops a ball, as the bricks now stand.
   *
   * Columns beside the grid, where the walls stand, do, and rows above and
   * below it don't, so it checks a cell with {@link inGrid} before it looks
   * in the bricks, where column -1 would be the last of the row above.
   */
  readonly solid: Solid;
  /**
   * Says whether a cell stops a ball that passes through what can break,
   * off the grid as {@link solid} does.
   */
  readonly hardSolid: Solid;
  /** How many bricks the level needs broken still. */
  needed: number;
  /** The balls, in play and waiting, as many as there may ever be. */
  readonly balls: readonly Ball[];
  readonly paddle: Paddle;
  /** The level's points so far, before what clearing it adds. */
  score: number;
  /** What the streaks added to the level's points, beyond the bricks' own. */
  streakPoints: number;
  /**
   * The bricks broken since the paddle last met a ball, or the last ball
   * was lost, which multiply the score.
   */
  streak: number;
  /**
   * How many times the level's last ball has been lost, counting up, for
   * the run to take a life for each one it hasn't yet.
   */
  livesLost: number;
  /** How far the balls' speed has climbed, in brick hits. */
  climbed: number;
  /** How much a brick hit climbs the speed: 1, or less while slowed. */
  climbRate: number;
  /** The balls' speed against what it would be: 1, or another while paced. */
  paceScale: number;
  /** A factor on the balls' speed on top of every other: 1 unless set to another. */
  ballSpeedScale: number;
  /**
   * A Custom run's ball speed, as a percent of Normal's: 100 unless the
   * player sets another; a run at any other speed ignores it.
   */
  customPercent: number;
  /** The kind every ball in play is. */
  ballKind: BallKindId;
  /** What the paddle does beyond turning the balls, or null. */
  mode: PaddleMode | null;
  /** Whether a net under the paddle will turn back the next ball that falls. */
  net: boolean;
  /**
   * How many lives caught capsules have brought, counting up, for the run
   * to add those it hasn't yet.
   */
  livesGained: number;
  /** The capsules falling, and those waiting to fall, as many as may. */
  readonly falling: readonly Falling[];
  /** The effects in play, one for each group. */
  readonly effects: Effects;
  /** The bolts rising, and those waiting to be fired, as many as may. */
  readonly bolts: readonly Bolt[];
  /** The step the paddle may fire again at. */
  boltsReadyAt: number;
  /** How many steps the field has taken, by which its timers run. */
  steps: number;
  /** How many random draws the field has made, which seeds the next. */
  draws: number;
  /** What happened, for the scene to play. */
  readonly events: FieldEventLog;
}

/** Returns a level's field, its first ball on the paddle waiting to be served. */
export function createField(level: Level, setup: FieldSetup): Field {
  const bricks = level.cells.map((placed, cell) =>
    placed ? createBrick(placed, cell) : null,
  );
  const paddle = createPaddle();
  const first = createBall();
  holdBall(first, paddle, 0);
  return {
    level,
    setup,
    state: "serve",
    height: FIELD_HEIGHT,
    bricks,
    solid: (column, row) =>
      inGrid(column, row)
        ? bricks[cellIndex(column, row)]?.broken === false
        : column < 0 || column >= COLUMNS,
    hardSolid: (column, row) => {
      if (!inGrid(column, row)) return column < 0 || column >= COLUMNS;
      const brick = bricks[cellIndex(column, row)];
      return !!brick && !brick.broken && !canBreak(brick);
    },
    needed: neededLeft(bricks),
    balls: [first, ...Array.from({ length: MAX_BALLS - 1 }, createBall)],
    paddle,
    score: 0,
    streakPoints: 0,
    streak: 0,
    livesLost: 0,
    climbed: 0,
    climbRate: 1,
    paceScale: 1,
    ballSpeedScale: 1,
    customPercent: 100,
    ballKind: "normal",
    mode: null,
    net: false,
    livesGained: 0,
    falling: createFalling(),
    effects: createEffects(),
    bolts: createBolts(),
    boltsReadyAt: 0,
    steps: 0,
    draws: 0,
    events: new FieldEventLog(),
  };
}

/** Takes a frame's steering, which the steps until the next frame follow. */
export function steerField(field: Field, steer: Readonly<Steer>): void {
  steerPaddle(field.paddle, steer);
}

/**
 * Moves the field on by a step: the paddle, the bricks' traits, the falling
 * capsules, the effects' time, the bolts, then each ball in play by the
 * distance it travels in a step, meeting what is in its way.
 *
 * Once the level is cleared, everything stands still where it is.
 */
export function stepField(field: Field): void {
  if (field.state !== "cleared") {
    field.steps++;
    movePaddle(field.paddle, keySpeedOf(field));
    stepBricks(field);
    stepCapsules(field);
    stepEffects(field);
    stepBolts(field);
    stepBalls(field);
  }
  if (isCleared(field)) holdStill(field);
}

/**
 * Sets where everything moving was a step ago to where it is, so a cleared
 * field is drawn standing still.
 */
function holdStill(field: Field): void {
  field.paddle.lastX = field.paddle.x;
  for (const ball of field.balls) {
    ball.lastX = ball.x;
    ball.lastY = ball.y;
  }
  for (const falling of field.falling) falling.lastY = falling.y;
  for (const bolt of field.bolts) bolt.lastY = bolt.y;
}

/** Returns how fast the field's balls go, in units a second. */
export function ballSpeedOf(field: Readonly<Field>): number {
  const speed = ballSpeed(
    field.setup.speed,
    field.level.pace,
    field.climbed,
    field.paceScale,
  );
  return (
    speed *
    ballKind(field.ballKind).speed *
    customFactor(field.setup.speed, field.customPercent) *
    field.ballSpeedScale
  );
}

/** The fastest a preset speed's ball climbs to, which held keys are tuned to outrun. */
const PRESET_TOP = Math.max(
  ...PRESET_SPEEDS.map((speed) => SPEED_INFO[speed].top),
);

/**
 * Returns how fast held keys move the field's paddle, in units a second:
 * {@link KEY_SPEED}, and faster with a Custom ball that climbs past every
 * preset speed's top, so the keys keep up with it.
 */
export function keySpeedOf(field: Readonly<Field>): number {
  const { speed } = field.setup;
  const top = SPEED_INFO[speed].top * customFactor(speed, field.customPercent);
  return KEY_SPEED * Math.max(1, top / PRESET_TOP);
}

/** Moves each ball on by a step, until the level is cleared. */
function stepBalls(field: Field): void {
  if (isCleared(field)) return;
  const distance = ballSpeedOf(field) * STEP_S;
  for (const ball of field.balls) {
    ball.lastX = ball.x;
    ball.lastY = ball.y;
    if (!ball.live) continue;
    if (!ball.held) liftOffPaddle(field, ball);
    if (ball.held) {
      followPaddle(ball, field.paddle);
      if (field.state === "playing") holdCaught(field, ball);
      continue;
    }
    travel(field, ball, distance);
    if (isCleared(field)) return;
    if (field.net) turnAtNet(field, ball);
    if (ball.y - BALL_RADIUS > field.height) loseBall(field, ball);
  }
}

/**
 * Serves the ball waiting on the paddle, toward the way the paddle last
 * moved, or lets go of the balls it has caught, each by where it landed.
 */
export function launch(field: Field): void {
  const serving = field.state === "serve";
  if (!serving && field.state !== "playing") return;
  field.state = "playing";
  for (const ball of field.balls) {
    if (!ball.live || !ball.held) continue;
    if (serving) serveBall(ball, field.paddle.facing);
    else letGo(field, ball);
    field.events.add("launched", ball.x, ball.y);
  }
}

/**
 * Makes the field a height tall, from {@link FIELD_HEIGHT} to
 * {@link TALLEST_FIELD}, its paddle and the ball waiting on it as far above
 * the new floor, while the level waits to serve; at any other time, or for
 * a height that is no number, it leaves the field as it is.
 */
export function reshapeField(field: Field, height: number): void {
  if (field.state !== "serve" || Number.isNaN(height)) return;
  field.height = clamp(height, FIELD_HEIGHT, TALLEST_FIELD);
  field.paddle.top = paddleTopOf(field.height);
  for (const ball of field.balls) {
    if (!ball.live || !ball.held) continue;
    followPaddle(ball, field.paddle);
    ball.lastY = ball.y;
  }
}

/** Puts a ball back on the paddle, to be served, once the last one is lost. */
export function serve(field: Field): void {
  const ball = field.balls.find((each) => !each.live);
  if (field.state !== "lost" || !ball) return;
  holdBall(ball, field.paddle, 0);
  field.state = "serve";
}

/** Lets a caught ball go once it has waited on the paddle its longest. */
function holdCaught(field: Field, ball: Ball): void {
  if (field.steps < ball.letGoAt) return;
  letGo(field, ball);
  field.events.add("launched", ball.x, ball.y);
}

/** Lets a caught ball go off the paddle, by where it landed. */
function letGo(field: Field, ball: Ball): void {
  ball.held = false;
  bounceOffPaddle(ball, field.paddle);
}

/** Turns back a ball that fell into the net under the paddle this step, and the net goes. */
function turnAtNet(field: Field, ball: Ball): void {
  const line = field.paddle.top + NET_DEPTH;
  if (ball.lastY + BALL_RADIUS >= line || ball.y + BALL_RADIUS < line) return;
  ball.y = line - BALL_RADIUS;
  ball.dy = -ball.dy;
  endEffect(field, "net");
  field.events.add("netted", ball.x, line);
}

/**
 * Returns whether the level is cleared, read afresh: the compiler takes a
 * check made before a hit to hold after it, though the hit may clear it.
 */
function isCleared(field: Readonly<Field>): boolean {
  return field.state === "cleared";
}

/**
 * Takes a ball out of play, and loses the level's ball if it was the last,
 * which ends every effect and lets go of what was falling and rising.
 */
function loseBall(field: Field, ball: Ball): void {
  ball.live = false;
  field.events.add("lost", ball.x, field.height);
  if (field.balls.some((each) => each.live)) return;
  field.state = "lost";
  field.livesLost++;
  endStreak(field);
  field.climbed = 0;
  endEffects(field);
  clearFalling(field);
  clearBolts(field);
}
