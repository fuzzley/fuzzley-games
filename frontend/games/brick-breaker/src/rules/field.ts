import {
  type Ball,
  bounceOffPaddle,
  createBall,
  followPaddle,
  holdBall,
  reflectBall,
  serveBall,
  settleBall,
  turnBall,
} from "./balls";
import { type Bolt, createBolts, dropBolts, stepBolts } from "./bolts";
import {
  type Brick,
  canBreak,
  createBrick,
  hitAround,
  hitBrick,
  stepBricks,
} from "./bricks";
import {
  type Effects,
  type Falling,
  createEffects,
  createFalling,
  endEffect,
  endEffects,
  stepCapsules,
  stepEffects,
} from "./capsules";
import { type BallKindId, ballKind } from "./catalog/balls";
import { brickKind } from "./catalog/bricks";
import { nextDraw } from "./draws";
import { EventLog } from "./events";
import {
  type Box,
  SIDE,
  type Solid,
  brickBox,
  cellIndex,
  columnAt,
  exposureOf,
  inGrid,
  rowAt,
} from "./grid";
import type { Level } from "./level";
import {
  type Paddle,
  type Steer,
  createPaddle,
  movePaddle,
  paddleBox,
  steerPaddle,
} from "./paddle";
import { type Speed, ballSpeed } from "./speed";
import { MISSED, type Move, sweepCorner, sweepFace } from "./sweep";
import {
  BALL_RADIUS,
  CATCH_HOLD_MS,
  COLUMNS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  LULL_BOUNCES,
  LULL_TURN,
  MAX_BALLS,
  MAX_CONTACTS,
  NET_DEPTH,
  PADDLE_TOP,
  ROWS,
  STEP_S,
} from "./tuning";
import { stepsIn } from "./stepper";

/**
 * Names where a level stands: its ball waiting on the paddle to be served,
 * in play, its last ball lost, or every brick it needs broken.
 */
export type FieldState = "serve" | "playing" | "lost" | "cleared";

/** Says how a field is played: at which speed, and from which seed. */
export interface FieldSetup {
  readonly speed: Speed;
  /** The run's seed, from which everything random on the field is drawn. */
  readonly seed: number;
}

/** Describes a level in play, which each step changes in place. */
export interface Field {
  readonly level: Level;
  readonly setup: FieldSetup;
  state: FieldState;
  /** A brick for each cell of the grid, row by row, null where there is none. */
  readonly bricks: readonly (Brick | null)[];
  /** Says whether a cell stops a ball, as the bricks now stand. */
  readonly solid: Solid;
  /** Says whether a cell stops a ball that passes through what can break. */
  readonly hardSolid: Solid;
  /** How many bricks the level needs broken still. */
  needed: number;
  /** The balls, in play and waiting, as many as there may ever be. */
  readonly balls: readonly Ball[];
  readonly paddle: Paddle;
  /** How far the balls' speed has climbed, in brick hits. */
  climbed: number;
  /** How much a brick hit climbs the speed: 1, or less while slowed. */
  climbRate: number;
  /** The balls' speed against what it would be: 1, or another while paced. */
  paceScale: number;
  /** The kind every ball in play is. */
  ballKind: BallKindId;
  /** What the paddle does beyond turning the balls, or null. */
  mode: "catch" | "laser" | null;
  /** Whether a net under the paddle will turn back the next ball that falls. */
  net: boolean;
  /** How many lives caught capsules have brought, for the run to add. */
  livesGained: number;
  /** The capsules falling, and those waiting to fall, as many as may. */
  readonly falling: readonly Falling[];
  /** The effects in play, one for each group. */
  readonly effects: Effects;
  /** The bolts rising, and those waiting to be fired, as many as may. */
  readonly bolts: readonly Bolt[];
  /** The steps until the paddle may fire again. */
  boltGapSteps: number;
  /** How many random draws the field has made, which seeds the next. */
  draws: number;
  /** What happened, for the scene to play. */
  readonly events: EventLog;
}

/** Gathers what a ball meets at the earliest moment of a move. */
interface Contacts {
  /** The moment, as a share of the move, or {@link MISSED}. */
  t: number;
  /** The normals of the faces and corners met, summed. */
  nx: number;
  ny: number;
  wall: boolean;
  paddle: boolean;
  /** Whether anything met turns the ball, rather than letting it pass. */
  turns: boolean;
  /** The bricks met, the first `count` of them. */
  readonly bricks: Brick[];
  count: number;
}

/** How close two contacts' moments are for the ball to meet both at once. */
const AT_ONCE = 1e-9;

/** How far the walls reach beyond the field, which no ball goes near. */
const FAR = 1000;

const LEFT_WALL: Readonly<Box> = {
  left: -FAR,
  top: -FAR,
  right: 0,
  bottom: FAR,
};
const TOP_WALL: Readonly<Box> = {
  left: -FAR,
  top: -FAR,
  right: FAR,
  bottom: 0,
};
const RIGHT_WALL: Readonly<Box> = {
  left: FIELD_WIDTH,
  top: -FAR,
  right: FAR,
  bottom: FAR,
};

/** The paddle's faces and corners a ball can meet: all but its underside. */
const PADDLE_SIDES =
  SIDE.top | SIDE.right | SIDE.left | SIDE.topLeft | SIDE.topRight;

const FACES = [SIDE.top, SIDE.right, SIDE.bottom, SIDE.left] as const;
const CORNERS = [
  SIDE.topLeft,
  SIDE.topRight,
  SIDE.bottomRight,
  SIDE.bottomLeft,
] as const;

// Made once and reused, so a step makes nothing.
const move: Move = { x: 0, y: 0, dx: 0, dy: 0, r: BALL_RADIUS };
const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };
const met: Contacts = {
  t: MISSED,
  nx: 0,
  ny: 0,
  wall: false,
  paddle: false,
  turns: false,
  bricks: [],
  count: 0,
};

/** Every side of a box, for a ball that passes through it. */
const ALL_SIDES = 0xff;

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
    needed: bricks.filter((brick) => brick && brickKind(brick.kind).needed)
      .length,
    balls: [first, ...Array.from({ length: MAX_BALLS - 1 }, createBall)],
    paddle,
    climbed: 0,
    climbRate: 1,
    paceScale: 1,
    ballKind: "normal",
    mode: null,
    net: false,
    livesGained: 0,
    falling: createFalling(),
    effects: createEffects(),
    bolts: createBolts(),
    boltGapSteps: 0,
    draws: 0,
    events: new EventLog(),
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
 */
export function stepField(field: Field): void {
  if (field.state === "cleared") return;
  movePaddle(field.paddle);
  stepBricks(field);
  stepCapsules(field);
  stepEffects(field);
  stepBolts(field);
  stepBalls(field);
}

/** Moves each ball on by a step, until the level is cleared. */
function stepBalls(field: Field): void {
  if (isCleared(field)) return;
  const speed = ballSpeed(
    field.setup.speed,
    field.level.pace,
    field.climbed,
    field.paceScale,
  );
  const distance = speed * ballKind(field.ballKind).speed * STEP_S;
  for (const ball of field.balls) {
    ball.lastX = ball.x;
    ball.lastY = ball.y;
    if (!ball.live) continue;
    if (ball.held) {
      followPaddle(ball, field.paddle);
      if (field.state === "playing") holdCaught(field, ball);
      continue;
    }
    liftOffPaddle(field, ball);
    travel(field, ball, distance);
    if (isCleared(field)) return;
    if (field.net) turnAtNet(field, ball);
    if (ball.y - BALL_RADIUS > FIELD_HEIGHT) loseBall(field, ball);
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

/** Puts a ball back on the paddle, to be served, once the last one is lost. */
export function serve(field: Field): void {
  const ball = field.balls.find((each) => !each.live);
  if (field.state !== "lost" || !ball) return;
  holdBall(ball, field.paddle, 0);
  field.state = "serve";
}

/**
 * Lifts a ball the paddle has moved into onto the paddle's top, and sends it
 * off there if it was falling, so a paddle swung under a ball never
 * swallows it.
 */
function liftOffPaddle(field: Field, ball: Ball): void {
  paddleBox(field.paddle, box);
  if (ball.y >= box.bottom) return;
  const nearX = Math.min(box.right, Math.max(box.left, ball.x));
  const nearY = Math.min(box.bottom, Math.max(box.top, ball.y));
  const apart = Math.hypot(ball.x - nearX, ball.y - nearY);
  if (apart >= BALL_RADIUS) return;
  ball.y = box.top - BALL_RADIUS;
  if (ball.dy > 0) meetPaddle(field, ball);
}

/** Sends a ball off the paddle by where it landed, or holds it there while the paddle catches. */
function meetPaddle(field: Field, ball: Ball): void {
  if (field.mode === "catch") {
    const half = field.paddle.width / 2;
    holdBall(
      ball,
      field.paddle,
      Math.max(-half, Math.min(half, ball.x - field.paddle.x)),
    );
  } else {
    bounceOffPaddle(ball, field.paddle);
  }
  field.events.add("paddle", ball.x, ball.y);
}

/** Counts a caught ball's time on the paddle, and lets it go once it has waited its longest. */
function holdCaught(field: Field, ball: Ball): void {
  ball.heldSteps++;
  if (ball.heldSteps < stepsIn(CATCH_HOLD_MS)) return;
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
  const line = PADDLE_TOP + NET_DEPTH;
  if (ball.lastY + BALL_RADIUS >= line || ball.y + BALL_RADIUS < line) return;
  ball.y = line - BALL_RADIUS;
  ball.dy = -ball.dy;
  endEffect(field, "net");
  field.events.add("netted", ball.x, line);
}

/**
 * Moves a ball a distance along its way, turning at each contact, up to
 * {@link MAX_CONTACTS} of them, past which the rest of the distance is
 * dropped.
 */
function travel(field: Field, ball: Ball, distance: number): void {
  let left = distance;
  for (let contact = 0; contact < MAX_CONTACTS && left > 0; contact++) {
    move.x = ball.x;
    move.y = ball.y;
    move.dx = ball.dx * left;
    move.dy = ball.dy * left;
    meetFirst(field);
    if (met.t === MISSED) {
      ball.x += move.dx;
      ball.y += move.dy;
      return;
    }
    ball.x += move.dx * met.t;
    ball.y += move.dy * met.t;
    left -= left * met.t;
    turn(field, ball);
    if (isCleared(field)) return;
  }
}

/**
 * Gathers into {@link met} what the ball's {@link move} meets first: the
 * walls, the paddle, and the bricks in the cells it passes.
 */
function meetFirst(field: Field): void {
  met.t = MISSED;
  meetBox(LEFT_WALL, SIDE.right, "wall");
  meetBox(TOP_WALL, SIDE.bottom, "wall");
  meetBox(RIGHT_WALL, SIDE.left, "wall");
  meetBox(paddleBox(field.paddle, box), PADDLE_SIDES, "paddle");
  const passes = ballKind(field.ballKind).passes;
  const { x, y, dx, dy, r } = move;
  const firstColumn = Math.max(0, columnAt(Math.min(x, x + dx) - r));
  const lastColumn = Math.min(COLUMNS - 1, columnAt(Math.max(x, x + dx) + r));
  const firstRow = Math.max(0, rowAt(Math.min(y, y + dy) - r));
  const lastRow = Math.min(ROWS - 1, rowAt(Math.max(y, y + dy) + r));
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const brick = field.bricks[cellIndex(column, row)];
      if (!brick || brick.broken) continue;
      brickBox(column, row, box);
      if (passes && canBreak(brick)) meetBox(box, ALL_SIDES, brick, true);
      else
        meetBox(box, exposureOf(solidFor(field, passes), column, row), brick);
    }
  }
}

/** Returns what stops a ball, by whether it passes through what can break. */
function solidFor(field: Field, passes: boolean): Solid {
  return passes ? field.hardSolid : field.solid;
}

/**
 * Gathers what the ball's {@link move} meets of a box's faces and corners,
 * which turn it, unless it `passes` through the box.
 */
function meetBox(
  target: Readonly<Box>,
  sides: number,
  what: Brick | "wall" | "paddle",
  passes = false,
): void {
  for (const face of FACES) {
    if ((sides & face) === 0) continue;
    const t = sweepFace(move, target, face);
    if (t !== MISSED) {
      meet(t, faceNormalX(face), faceNormalY(face), what, passes);
    }
  }
  for (const corner of CORNERS) {
    if ((sides & corner) === 0) continue;
    const t = sweepCorner(move, target, corner);
    if (t === MISSED) continue;
    const left = corner === SIDE.topLeft || corner === SIDE.bottomLeft;
    const top = corner === SIDE.topLeft || corner === SIDE.topRight;
    const nx = move.x + move.dx * t - (left ? target.left : target.right);
    const ny = move.y + move.dy * t - (top ? target.top : target.bottom);
    meet(t, nx / move.r, ny / move.r, what, passes);
  }
}

/**
 * Gathers a contact, if it is as early as the earliest so far; one the ball
 * passes through adds no normal.
 */
function meet(
  t: number,
  nx: number,
  ny: number,
  what: Brick | "wall" | "paddle",
  passes: boolean,
): void {
  if (t > met.t + AT_ONCE) return;
  if (t < met.t - AT_ONCE) {
    met.t = t;
    met.nx = 0;
    met.ny = 0;
    met.wall = false;
    met.paddle = false;
    met.turns = false;
    met.count = 0;
  }
  if (!passes) {
    met.nx += nx;
    met.ny += ny;
    met.turns = true;
  }
  if (what === "wall") met.wall = true;
  else if (what === "paddle") met.paddle = true;
  else if (!hasMet(what)) met.bricks[met.count++] = what;
}

/** Returns whether a brick is among those met at the earliest moment. */
function hasMet(brick: Brick): boolean {
  for (let i = 0; i < met.count; i++) if (met.bricks[i] === brick) return true;
  return false;
}

/**
 * Turns a ball at what it met: off the paddle by where it landed, or as a
 * mirror off the walls and bricks, unless it passes through all it met,
 * then hits each brick met once.
 */
function turn(field: Field, ball: Ball): void {
  if (met.paddle) {
    meetPaddle(field, ball);
    return;
  }
  if (met.turns) mirror(field, ball);
  for (let i = 0; i < met.count; i++) {
    const brick = met.bricks[i];
    if (brick) strike(field, ball, brick);
  }
}

/**
 * Turns a ball as a mirror off the walls and bricks it met, by a lull's few
 * degrees at a wall after too many bounces.
 */
function mirror(field: Field, ball: Ball): void {
  // Faces met head on from both sides at once cancel out, and turn nothing.
  const length = Math.hypot(met.nx, met.ny) || 1;
  const nx = met.nx / length;
  const ny = met.ny / length;
  reflectBall(ball, nx, ny);
  ball.bounces++;
  if (met.wall) {
    if (ball.bounces > LULL_BOUNCES) {
      turnBall(ball, lullTurn(field));
      // A turn back into the wall is turned out of it again.
      reflectBall(ball, nx, ny);
      ball.bounces = 0;
    }
    field.events.add("wall", ball.x, ball.y);
  }
  settleBall(ball, nx, ny);
}

/**
 * Hits a brick a ball met, as hard as the balls' kind hits, and the bricks
 * around it too if their hits reach. It speeds the balls up if it can break,
 * and starts the ball's count of bounces again if it breaks one the level
 * needs.
 */
function strike(field: Field, ball: Ball, brick: Brick): void {
  const kind = ballKind(field.ballKind);
  if (canBreak(brick)) field.climbed += field.climbRate;
  const broke = hitBrick(field, brick, ball.x, ball.y, kind.damage);
  if (broke && brickKind(brick.kind).needed) ball.bounces = 0;
  if (kind.reaches) hitAround(field, brick, ball.x, ball.y);
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
  field.events.add("lost", ball.x, FIELD_HEIGHT);
  if (field.balls.some((each) => each.live)) return;
  field.state = "lost";
  field.climbed = 0;
  endEffects(field);
  dropBolts(field);
}

/** Returns a lull's turn, in degrees, either way, by the field's next draw. */
function lullTurn(field: Field): number {
  const draw = nextDraw(field);
  const { least, most } = LULL_TURN;
  const size = least + (most - least) * ((draw * 2) % 1);
  return draw < 0.5 ? -size : size;
}

/** Returns a face's normal across. */
function faceNormalX(face: number): number {
  if (face === SIDE.left) return -1;
  return face === SIDE.right ? 1 : 0;
}

/** Returns a face's normal down. */
function faceNormalY(face: number): number {
  if (face === SIDE.top) return -1;
  return face === SIDE.bottom ? 1 : 0;
}
