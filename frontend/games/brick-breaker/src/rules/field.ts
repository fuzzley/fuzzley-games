import {
  type Ball,
  bounceOffPaddle,
  createBall,
  followPaddle,
  holdBall,
  overlapsBox,
  reflectBall,
  serveBall,
  settleBall,
  turnBall,
} from "./balls";
import { type Bolt, clearBolts, createBolts, stepBolts } from "./bolts";
import {
  type Brick,
  canBreak,
  createBrick,
  hitAround,
  hitBrick,
  neededLeft,
  stepBricks,
} from "./bricks";
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
} from "./capsules";
import { type BallKindId, ballKind } from "./catalog/balls";
import { isNeeded } from "./catalog/bricks";
import type { PaddleMode } from "./catalog/capsules";
import { nextDraw } from "./draws";
import { EventLog } from "./events";
import {
  ALL_SIDES,
  type Box,
  CORNERS,
  CORNER_AT,
  FACES,
  FACE_NORMAL,
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
import { endStreak } from "./scoring";
import { type Speed, ballSpeed } from "./speed";
import { stepsIn } from "./stepper";
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
  readonly events: EventLog;
}

/** Something a ball can meet: a brick, a wall or the paddle. */
type Obstacle = Brick | "wall" | "paddle";

/** Gathers what a ball meets at the earliest moment of a move. */
interface Contacts {
  /** The moment, as a share of the move, or {@link MISSED}. */
  t: number;
  /** The normals of the faces met, summed, across and down. */
  faceX: number;
  faceY: number;
  /** The normals of the corners met, summed, across and down. */
  cornerX: number;
  cornerY: number;
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

/**
 * The widest gap beside a wall that the paddle's reach closes: a ball's
 * width and a little more. A ball in a gap barely wider than itself would
 * shuttle between the wall and the paddle's end, meeting each many times a
 * step as it crept down.
 */
const CLOSED_GAP = 2 * BALL_RADIUS + 0.1;

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

// Made once and reused, so a step makes nothing: the move a ball is making,
// a box being met, and what the move meets first.
const move: Move = { x: 0, y: 0, dx: 0, dy: 0, r: BALL_RADIUS };
const box: Box = { left: 0, top: 0, right: 0, bottom: 0 };
const met: Contacts = {
  t: MISSED,
  faceX: 0,
  faceY: 0,
  cornerX: 0,
  cornerY: 0,
  wall: false,
  paddle: false,
  turns: false,
  bricks: [],
  count: 0,
};

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
 *
 * Once the level is cleared, everything stands still where it is.
 */
export function stepField(field: Field): void {
  if (field.state !== "cleared") {
    field.steps++;
    movePaddle(field.paddle);
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
  return speed * ballKind(field.ballKind).speed;
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
  paddleReach(field.paddle, box);
  if (ball.y >= box.bottom || !overlapsBox(ball, box)) return;
  ball.y = box.top - BALL_RADIUS;
  if (ball.dy > 0) meetPaddle(field, ball);
}

/**
 * Sends a ball off the paddle by where it landed, or holds it there while
 * the paddle catches, and starts the streak again.
 */
function meetPaddle(field: Field, ball: Ball): void {
  endStreak(field);
  if (field.mode === "catch") {
    holdBall(ball, field.paddle, ball.x - field.paddle.x);
    ball.letGoAt = field.steps + stepsIn(CATCH_HOLD_MS);
  } else {
    bounceOffPaddle(ball, field.paddle);
  }
  field.events.add("paddle", ball.x, ball.y);
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
  const line = PADDLE_TOP + NET_DEPTH;
  if (ball.lastY + BALL_RADIUS >= line || ball.y + BALL_RADIUS < line) return;
  ball.y = line - BALL_RADIUS;
  ball.dy = -ball.dy;
  endEffect(field, "net");
  field.events.add("netted", ball.x, line);
}

/**
 * Writes the box a ball meets the paddle by: its own, reaching to a wall
 * closer to it than {@link CLOSED_GAP}, so no ball is caught between the
 * two.
 */
function paddleReach(paddle: Readonly<Paddle>, reach: Box): Box {
  paddleBox(paddle, reach);
  if (reach.left < CLOSED_GAP) reach.left = 0;
  if (reach.right > FIELD_WIDTH - CLOSED_GAP) reach.right = FIELD_WIDTH;
  return reach;
}

/**
 * Moves a ball a distance along its way, turning at each contact, up to
 * {@link MAX_CONTACTS} of them, past which the rest of the distance is
 * dropped, as it is once the paddle catches the ball.
 */
function travel(field: Field, ball: Ball, distance: number): void {
  let remaining = distance;
  for (let contact = 0; contact < MAX_CONTACTS && remaining > 0; contact++) {
    move.x = ball.x;
    move.y = ball.y;
    move.dx = ball.dx * remaining;
    move.dy = ball.dy * remaining;
    findContacts(field);
    if (met.t === MISSED) {
      ball.x += move.dx;
      ball.y += move.dy;
      return;
    }
    ball.x += move.dx * met.t;
    ball.y += move.dy * met.t;
    remaining -= remaining * met.t;
    turn(field, ball);
    if (ball.held || isCleared(field)) return;
  }
}

/**
 * Gathers into {@link met} what the ball's {@link move} meets first: the
 * walls, the paddle, and the bricks in the cells it passes.
 */
function findContacts(field: Field): void {
  met.t = MISSED;
  noteBox(LEFT_WALL, SIDE.right, "wall");
  noteBox(TOP_WALL, SIDE.bottom, "wall");
  noteBox(RIGHT_WALL, SIDE.left, "wall");
  noteBox(paddleReach(field.paddle, box), PADDLE_SIDES, "paddle");
  const passes = ballKind(field.ballKind).passes;
  const solid = passes ? field.hardSolid : field.solid;
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
      if (passes && canBreak(brick)) {
        noteBox(box, ALL_SIDES, brick, true);
      } else {
        noteBox(box, exposureOf(solid, column, row), brick);
      }
    }
  }
}

/**
 * Notes what the ball's {@link move} meets of a box's faces and corners,
 * which turn it, unless it `passes` through the box.
 */
function noteBox(
  target: Readonly<Box>,
  sides: number,
  what: Obstacle,
  passes = false,
): void {
  for (const face of FACES) {
    if ((sides & face) === 0) continue;
    const t = sweepFace(move, target, face);
    if (t === MISSED || !noteContact(t, what, passes)) continue;
    met.faceX += FACE_NORMAL[face].x;
    met.faceY += FACE_NORMAL[face].y;
  }
  for (const corner of CORNERS) {
    if ((sides & corner) === 0) continue;
    const t = sweepCorner(move, target, corner);
    if (t === MISSED || !noteContact(t, what, passes)) continue;
    const at = CORNER_AT[corner];
    met.cornerX += (move.x + move.dx * t - target[at.x]) / move.r;
    met.cornerY += (move.y + move.dy * t - target[at.y]) / move.r;
  }
}

/**
 * Notes a contact, if it is as early as the earliest so far, and returns
 * whether it turns the ball, which one it passes through doesn't.
 */
function noteContact(t: number, what: Obstacle, passes: boolean): boolean {
  if (t > met.t + AT_ONCE) return false;
  if (t < met.t - AT_ONCE) {
    met.t = t;
    met.faceX = 0;
    met.faceY = 0;
    met.cornerX = 0;
    met.cornerY = 0;
    met.wall = false;
    met.paddle = false;
    met.turns = false;
    met.count = 0;
  }
  if (what === "wall") met.wall = true;
  else if (what === "paddle") met.paddle = true;
  else if (!hasMet(what)) met.bricks[met.count++] = what;
  if (passes) return false;
  met.turns = true;
  return true;
}

/** Returns whether a brick is among those met at the earliest moment. */
function hasMet(brick: Brick): boolean {
  for (let i = 0; i < met.count; i++) if (met.bricks[i] === brick) return true;
  return false;
}

/**
 * Turns a ball at what it met: off the paddle by where it landed, or as a
 * mirror off the walls and bricks, unless it passes through all it met,
 * then strikes each brick met, and the bricks around each if the balls'
 * hits reach.
 *
 * Every brick met is struck before any hit reaches around, so two met at
 * once are struck alike, whichever the grid lists first.
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
  if (!ballKind(field.ballKind).reaches) return;
  for (let i = 0; i < met.count; i++) {
    const brick = met.bricks[i];
    if (brick) hitAround(field, brick, ball.x, ball.y);
  }
}

/**
 * Turns a ball as a mirror off the walls and bricks it met, by a lull's few
 * degrees at a wall after too many bounces.
 *
 * Each face met turns the ball along its own axis, so two met at once at a
 * right angle send it back the way it came. A corner, met with no face,
 * turns it about the line from the corner to the ball's middle.
 */
function mirror(field: Field, ball: Ball): void {
  const faced = met.faceX !== 0 || met.faceY !== 0;
  let nx = faced ? Math.sign(met.faceX) : met.cornerX;
  let ny = faced ? Math.sign(met.faceY) : met.cornerY;
  if (faced) {
    reflectBall(ball, nx, 0);
    reflectBall(ball, 0, ny);
  }
  // What is met head on from both sides at once cancels out, and turns
  // nothing.
  const length = Math.hypot(nx, ny) || 1;
  nx /= length;
  ny /= length;
  if (!faced) reflectBall(ball, nx, ny);
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
 * Hits a brick a ball met, as hard as the balls' kind hits. It speeds the
 * balls up if it can break, and starts the ball's count of bounces again if
 * it breaks one the level needs.
 */
function strike(field: Field, ball: Ball, brick: Brick): void {
  if (canBreak(brick)) field.climbed += field.climbRate;
  const damage = ballKind(field.ballKind).damage;
  const broke = hitBrick(field, brick, ball.x, ball.y, damage);
  if (broke && isNeeded(brick.kind)) ball.bounces = 0;
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
  field.livesLost++;
  endStreak(field);
  field.climbed = 0;
  endEffects(field);
  clearFalling(field);
  clearBolts(field);
}

/** Returns a lull's turn, in degrees, either way, by the field's next draw. */
function lullTurn(field: Field): number {
  const draw = nextDraw(field);
  const { least, most } = LULL_TURN;
  const size = least + (most - least) * ((draw * 2) % 1);
  return draw < 0.5 ? -size : size;
}
