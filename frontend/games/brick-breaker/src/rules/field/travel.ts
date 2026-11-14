// A ball's travel: what it meets first of the walls, the paddle and the
// bricks, all at one moment, and how it turns there.

import { lerp } from "@fz/core/math";
import {
  ALL_SIDES,
  type Box,
  CORNERS,
  CORNER_AT,
  FACES,
  FACE_NORMAL,
  MISSED,
  type Move,
  SIDE,
  type Solid,
  exposureOf,
  sweepCorner,
  sweepFace,
  sweepPoint,
} from "@fz/core/sweep";
import {
  type Brick,
  canBreak,
  hitAround,
  hitBrick,
  isBumper,
  isPlated,
  isPortal,
  isRound,
  twinOf,
} from "../bricks/bricks";
import { ballKind } from "../catalog/balls";
import { isNeeded } from "../catalog/bricks";
import { nextDraw } from "../draws";
import {
  brickBox,
  cellIndex,
  cellMiddleX,
  cellMiddleY,
  columnAt,
  columnMiddle,
  inGrid,
  rowAt,
  rowMiddle,
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
import {
  BALL_RADIUS,
  BUMPER_RADIUS,
  CATCH_HOLD_MS,
  COLUMNS,
  FIELD_WIDTH,
  LULL_BOUNCES,
  LULL_TURN,
  MAX_CONTACTS,
  PORTAL_RADIUS,
  ROWS,
} from "../tuning";
import type { FieldEventKind } from "./events";
import type { Field } from "./field";
import { endStreak } from "./scoring";
import { endSeeking, lendAtPaddle } from "./seeker";

/** Something a ball can meet: a brick, a wall or the paddle. */
type Obstacle = Brick | "wall" | "paddle";

/**
 * Says how a contact meets what it touches: it turns the ball, striking a
 * brick, lets the ball pass through a brick it strikes, turns the ball off
 * what takes no hit there, a plate's underside or a bumper, or takes the
 * ball to a portal's twin.
 */
type Touch = "turns" | "passes" | "unhurt" | "jumps";

/** Gathers what a ball meets at the earliest moment of a move. */
interface Contacts {
  /** The moment, as a share of the move, or {@link MISSED}. */
  t: number;
  /** The normals of the faces met, summed, across and down. */
  faceX: number;
  faceY: number;
  /** The normals of the corners and discs met, summed, across and down. */
  cornerX: number;
  cornerY: number;
  wall: boolean;
  paddle: boolean;
  /** Whether anything met turns the ball, rather than letting it pass. */
  turns: boolean;
  /** Whether a brick that can't break was among what turned the ball. */
  hard: boolean;
  /** The bricks met, the first `count` of them. */
  readonly bricks: Brick[];
  count: number;
  /**
   * The bricks met that take no hit, the first `unhurtCount` of them: the
   * plated bricks whose undersides were met, even where another of their
   * sides was met too, so none of them is among the bricks met, and the
   * bumpers.
   */
  readonly unhurt: Brick[];
  unhurtCount: number;
  /** The portal met, the last in the grid of those met at once, else null. */
  portal: Brick | null;
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

/** A plate's underside, which a rising ball meets: its bottom face and corners. */
const UNDERSIDE = SIDE.bottom | SIDE.bottomLeft | SIDE.bottomRight;

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
  hard: false,
  bricks: [],
  count: 0,
  unhurt: [],
  unhurtCount: 0,
  portal: null,
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
    findContacts(field, ball);
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
 * the paddle catches, and starts the streak again; then lends it the seeker
 * if it is due. It meets portals again.
 */
function meetPaddle(field: Field, ball: Ball): void {
  ball.portalled = false;
  endStreak(field);
  if (field.mode === "catch") {
    holdBall(ball, field.paddle, ball.x - field.paddle.x);
    ball.letGoAt = field.steps + stepsIn(CATCH_HOLD_MS);
  } else {
    bounceOffPaddle(ball, field.paddle);
  }
  field.events.add("paddle", ball.x, ball.y);
  lendAtPaddle(field, ball);
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
 * walls, the paddle, and the bricks in the cells it passes, a bumper by its
 * disc, and a portal by its disc unless the ball passes over portals.
 */
function findContacts(field: Field, ball: Readonly<Ball>): void {
  met.t = MISSED;
  noteBox(LEFT_WALL, SIDE.right, "wall");
  noteBox(TOP_WALL, SIDE.bottom, "wall");
  noteBox(RIGHT_WALL, SIDE.left, "wall");
  noteBox(paddleReach(field.paddle, box), PADDLE_SIDES, "paddle");
  const passes = ballKind(field.ballKind).passes;
  sought = field;
  const solid = passes ? hardBoxed : boxed;
  const { x, y, dx, dy, r } = move;
  const firstColumn = Math.max(0, columnAt(Math.min(x, x + dx) - r));
  const lastColumn = Math.min(COLUMNS - 1, columnAt(Math.max(x, x + dx) + r));
  const firstRow = Math.max(0, rowAt(Math.min(y, y + dy) - r));
  const lastRow = Math.min(ROWS - 1, rowAt(Math.max(y, y + dy) + r));
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const brick = field.bricks[cellIndex(column, row)];
      if (!brick || brick.broken) continue;
      if (isBumper(brick)) {
        noteDisc(column, row, BUMPER_RADIUS, brick, "unhurt");
        continue;
      }
      if (isPortal(brick)) {
        if (!ball.portalled) {
          noteDisc(column, row, PORTAL_RADIUS, brick, "jumps");
        }
        continue;
      }
      brickBox(column, row, box);
      const passing = passes && canBreak(brick);
      const sides = passing ? ALL_SIDES : exposureOf(solid, column, row);
      // The underside is noted first, so a ball that meets it and another
      // side at once, where a side's end meets a bottom corner, strikes no
      // brick there.
      const underside = dy < 0 && isPlated(brick) ? sides & UNDERSIDE : 0;
      if (underside !== 0) noteBox(box, underside, brick, "unhurt");
      noteBox(box, sides & ~underside, brick, passing ? "passes" : "turns");
    }
  }
}

/**
 * The field {@link findContacts} looks in last, whose cells {@link boxed}
 * and {@link hardBoxed} read.
 */
let sought: Readonly<Field>;

/**
 * Says whether a cell stops a ball by its faces and corners, as the field's
 * `solid` does, but for a round brick's cell, which `solid` holds whole and
 * a ball meets by its disc alone, so that a brick beside it shows its faces
 * and corners there.
 */
const boxed: Solid = (column, row) =>
  sought.solid(column, row) && !roundAt(sought, column, row);

/**
 * Says as {@link boxed} does for a ball that passes through what breaks,
 * as the field's `hardSolid` does.
 */
const hardBoxed: Solid = (column, row) =>
  sought.hardSolid(column, row) && !roundAt(sought, column, row);

/**
 * Says whether a cell holds a round brick, asked where `solid` has found
 * one unbroken or a wall.
 */
function roundAt(field: Readonly<Field>, column: number, row: number): boolean {
  if (!inGrid(column, row)) return false;
  const brick = field.bricks[cellIndex(column, row)];
  return !!brick && isRound(brick);
}

/**
 * Notes what the ball's {@link move} meets of a box's faces and corners,
 * as they touch it: each turns it, unless it passes through the box.
 */
function noteBox(
  target: Readonly<Box>,
  sides: number,
  what: Obstacle,
  touch: Touch = "turns",
): void {
  for (const face of FACES) {
    if ((sides & face) === 0) continue;
    const t = sweepFace(move, target, face);
    if (t === MISSED || !noteContact(t, what, touch)) continue;
    met.faceX += FACE_NORMAL[face].x;
    met.faceY += FACE_NORMAL[face].y;
  }
  for (const corner of CORNERS) {
    if ((sides & corner) === 0) continue;
    const t = sweepCorner(move, target, corner);
    if (t === MISSED || !noteContact(t, what, touch)) continue;
    const at = CORNER_AT[corner];
    met.cornerX += (move.x + move.dx * t - target[at.x]) / move.r;
    met.cornerY += (move.y + move.dy * t - target[at.y]) / move.r;
  }
}

/**
 * Notes what the ball's {@link move} meets of a disc of a radius at a
 * cell's middle, a brick that takes no hit: a bumper, which turns the ball
 * as off a circle, about the line from the disc's middle to the ball's, or
 * a portal, which takes it to its twin.
 */
function noteDisc(
  column: number,
  row: number,
  radius: number,
  brick: Brick,
  touch: Touch,
): void {
  const x = columnMiddle(column);
  const y = rowMiddle(row);
  const reach = move.r + radius;
  const t = sweepPoint(move, x, y, reach);
  if (t === MISSED || !noteContact(t, brick, touch)) return;
  met.cornerX += (move.x + move.dx * t - x) / reach;
  met.cornerY += (move.y + move.dy * t - y) / reach;
}

/**
 * Notes a contact, if it is as early as the earliest so far, and returns
 * whether it turns the ball, which one it passes through doesn't.
 */
function noteContact(t: number, what: Obstacle, touch: Touch): boolean {
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
    met.hard = false;
    met.count = 0;
    met.unhurtCount = 0;
    met.portal = null;
  }
  if (what === "wall") met.wall = true;
  else if (what === "paddle") met.paddle = true;
  else if (touch === "jumps") {
    met.portal = what;
    return false;
  } else if (touch === "unhurt") {
    if (!isAmong(met.unhurt, met.unhurtCount, what)) {
      met.unhurt[met.unhurtCount++] = what;
    }
  } else if (
    !isAmong(met.bricks, met.count, what) &&
    !isAmong(met.unhurt, met.unhurtCount, what)
  ) {
    met.bricks[met.count++] = what;
  }
  if (touch === "passes") return false;
  met.turns = true;
  if (typeof what !== "string" && !canBreak(what)) met.hard = true;
  return true;
}

/** Returns whether a brick is among the first `count` of a list of those met. */
function isAmong(
  bricks: readonly Brick[],
  count: number,
  brick: Brick,
): boolean {
  for (let i = 0; i < count; i++) if (bricks[i] === brick) return true;
  return false;
}

/**
 * Turns a ball at what it met: off the paddle by where it landed, or as a
 * mirror off the walls and bricks, unless it passes through all it met,
 * then says which plates and bumpers it met, and strikes each other brick
 * met, and the bricks around each if the balls' hits reach, a plate's among
 * them; last, takes it to a portal's twin if it met one, turned as anything
 * met with it turned it. A brick met lets it meet portals again.
 *
 * Every brick met is struck before any hit reaches around, so two met at
 * once are struck alike, whichever the grid lists first.
 */
function turn(field: Field, ball: Ball): void {
  if (met.count > 0 || met.unhurtCount > 0) ball.portalled = false;
  if (met.paddle) {
    meetPaddle(field, ball);
    return;
  }
  if (met.turns) mirror(field, ball);
  for (let i = 0; i < met.unhurtCount; i++) {
    const brick = met.unhurt[i];
    if (brick) field.events.add(unhurtBy(brick), ball.x, ball.y, brick.cell);
  }
  for (let i = 0; i < met.count; i++) {
    const brick = met.bricks[i];
    if (brick) strike(field, ball, brick);
  }
  if (ballKind(field.ballKind).reaches) {
    for (let i = 0; i < met.count; i++) {
      const brick = met.bricks[i];
      if (brick) hitAround(field, brick, ball.x, ball.y);
    }
  }
  if (met.portal) jump(field, ball, met.portal);
}

/**
 * Takes a ball that touched a portal to its twin's middle, going as it
 * went, to be drawn there from the step's start, and to pass over every
 * portal until it touches a brick or the paddle. A portal with no twin,
 * which no level holds, lets it out of its own middle.
 */
function jump(field: Field, ball: Ball, portal: Brick): void {
  const twin = twinOf(field.bricks, portal) ?? portal;
  ball.x = cellMiddleX(twin.cell);
  ball.y = cellMiddleY(twin.cell);
  ball.lastX = ball.x;
  ball.lastY = ball.y;
  ball.portalled = true;
  ball.jumpedAt = field.steps;
  field.events.add("portalled", ball.x, ball.y, twin.cell);
}

/** Returns what a brick met that takes no hit records: a bumper's turn, or a plate's. */
function unhurtBy(brick: Readonly<Brick>): FieldEventKind {
  return isBumper(brick) ? "bumped" : "plated";
}

/**
 * Turns a ball as a mirror off the walls and bricks it met, by a lull's few
 * degrees after too many bounces, where the level nudges it: at a wall, or,
 * from Machines on, off anything that can't break.
 *
 * Each face met turns the ball along its own axis, so two met at once at a
 * right angle send it back the way it came. A corner, met with no face,
 * turns it about the line from the corner to the ball's middle, and a disc
 * about the line from its middle to the ball's.
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
  if (ball.bounces > LULL_BOUNCES && nudgesHere(field)) {
    turnBall(ball, lullTurn(field));
    // A turn back into what it met is turned out of it again.
    reflectBall(ball, nx, ny);
    ball.bounces = 0;
  }
  if (met.wall) field.events.add("wall", ball.x, ball.y);
  settleBall(ball, nx, ny);
}

/**
 * Returns whether a lull's nudge may turn a ball off what it met: a wall,
 * or, where the level nudges off anything that can't break, a brick of
 * that kind.
 */
function nudgesHere(field: Readonly<Field>): boolean {
  return met.wall || (met.hard && field.level.nudge === "unbreakable");
}

/**
 * Hits a brick a ball met, as hard as the balls' kind hits. It speeds the
 * balls up if it can break, and starts the ball's count of bounces again,
 * and ends its seeking, if it breaks one the level needs.
 */
function strike(field: Field, ball: Ball, brick: Brick): void {
  if (canBreak(brick)) field.climbed += field.climbRate;
  const damage = ballKind(field.ballKind).damage;
  const broke = hitBrick(field, brick, ball.x, ball.y, damage);
  if (broke && isNeeded(brick.kind)) ball.bounces = 0;
  if (broke) endSeeking(ball, brick);
}

/** Returns a lull's turn, in degrees, either way, by the field's next draw. */
function lullTurn(field: Field): number {
  const draw = nextDraw(field);
  const { least, most } = LULL_TURN;
  const size = lerp(least, most, (draw * 2) % 1);
  return draw < 0.5 ? -size : size;
}
