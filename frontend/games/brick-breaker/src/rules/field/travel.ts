// A ball's travel: what it meets first of the walls, the paddle and the
// bricks, all at one moment, and how it turns there.

import { type Brick, canBreak, hitAround, hitBrick } from "../bricks/bricks";
import { ballKind } from "../catalog/balls";
import { isNeeded } from "../catalog/bricks";
import { nextDraw } from "../draws";
import {
  ALL_SIDES,
  type Box,
  CORNERS,
  CORNER_AT,
  FACES,
  FACE_NORMAL,
  SIDE,
  brickBox,
  cellIndex,
  columnAt,
  exposureOf,
  rowAt,
} from "../grid";
import {
  type Ball,
  bounceOffPaddle,
  holdBall,
  overlapsBox,
  reflectBall,
  settleBall,
  turnBall,
} from "../paddle/balls";
import { type Paddle, paddleBox } from "../paddle/paddle";
import { stepsIn } from "../stepper";
import { MISSED, type Move, sweepCorner, sweepFace } from "../sweep";
import {
  BALL_RADIUS,
  CATCH_HOLD_MS,
  COLUMNS,
  FIELD_WIDTH,
  LULL_BOUNCES,
  LULL_TURN,
  MAX_CONTACTS,
  ROWS,
} from "../tuning";
import type { Field } from "./field";
import { endStreak } from "./scoring";

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

/**
 * Moves a ball a distance along its way, turning at each contact, up to
 * {@link MAX_CONTACTS} of them, past which the rest of the distance is
 * dropped, as it is once the paddle catches the ball.
 */
export function travel(field: Field, ball: Ball, distance: number): void {
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
    if (ball.held || field.state === "cleared") return;
  }
}

/**
 * Lifts a ball the paddle has moved into onto the paddle's top, and sends it
 * off there if it was falling, so a paddle swung under a ball never
 * swallows it.
 */
export function liftOffPaddle(field: Field, ball: Ball): void {
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

/** Returns a lull's turn, in degrees, either way, by the field's next draw. */
function lullTurn(field: Field): number {
  const draw = nextDraw(field);
  const { least, most } = LULL_TURN;
  const size = least + (most - least) * ((draw * 2) % 1);
  return draw < 0.5 ? -size : size;
}
