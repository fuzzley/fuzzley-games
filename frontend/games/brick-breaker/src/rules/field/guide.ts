// The serve's guide: where the waiting ball would go, to its first turn and
// a little past it, and the bricks it would meet on the way, found by the
// ball's own travel, so it never shows what the serve won't do.

import { MISSED } from "@fz/core/sweep";
import { isBumper } from "../bricks/bricks";
import { CELLS } from "../grid";
import { type Ball, createBall, faceServe } from "../paddle/balls";
import { GUIDE_DOT_GAP, GUIDE_PAST_TURN, MOST_GUIDE_DOTS } from "../tuning";
import { type Field, serveAim } from "./field";
import { type Cells, type Contacts, firstContact, mirrorTurn } from "./travel";

/** Describes a place on the field, in field units. */
export interface GuidePlace {
  x: number;
  y: number;
}

/** Lists the guide's dots: the first `count` of `places`. */
export interface GuideDots {
  /** The places of {@link MOST_GUIDE_DOTS} dots, made once. */
  readonly places: readonly GuidePlace[];
  count: number;
}

/** Describes the serve's guide, one record written again each frame. */
export interface ServeGuide {
  /**
   * Where each dot's middle lies, {@link GUIDE_DOT_GAP} apart along the
   * serve, the first that far from the ball's middle, to its first turn and
   * {@link GUIDE_PAST_TURN} past it, or to what it would meet next, or to a
   * portal it would go into.
   */
  readonly dots: GuideDots;
  /**
   * The cells of the bricks to outline: those the ball would turn off
   * first, and before them each a fire ball would pass through. No bumper
   * is among them.
   */
  readonly marked: Cells;
}

/** The ball the guide sends along the serve, made once. */
const traveller: Ball = createBall();

/** As far as the guide's dots reach, which a ball meets something within. */
const REACH = MOST_GUIDE_DOTS * GUIDE_DOT_GAP;

/** Returns a guide that shows nothing, to write each frame's into. */
export function createServeGuide(): ServeGuide {
  return {
    dots: {
      places: Array.from({ length: MOST_GUIDE_DOTS }, () => ({ x: 0, y: 0 })),
      count: 0,
    },
    marked: { cells: Array.from({ length: CELLS }, () => 0), count: 0 },
  };
}

/**
 * Writes into a guide where the ball waiting to be served would go and
 * what it would meet, as the field now stands, with no hit, event or draw,
 * and nothing made; a field that isn't serving shows none.
 *
 * The ball goes as a launch would send it, from where it waits, up and away
 * from the paddle, which it can meet only past its turn, where the guide
 * ends. The dots stop where the pool runs out, which the tallest field's
 * diagonal never reaches.
 */
export function serveGuide(field: Readonly<Field>, guide: ServeGuide): void {
  guide.dots.count = 0;
  guide.marked.count = 0;
  const waiting = field.state === "serve" ? field.balls.find(isWaiting) : null;
  if (!waiting) return;
  traveller.x = waiting.x;
  traveller.y = waiting.y;
  faceServe(traveller, serveAim(field));
  let gone = 0;
  let reach = REACH;
  let turned = false;
  // Each pass the ball goes by without turning is marked, and then gone
  // by, so the ball comes to a turn, a portal or its reach.
  for (;;) {
    const met = firstContact(field, traveller, reach, guide.marked);
    const leg = met.t === MISSED ? reach : reach * met.t;
    layDots(guide.dots, traveller, gone, leg);
    if (met.t === MISSED || turned || met.portal) return;
    traveller.x += traveller.dx * leg;
    traveller.y += traveller.dy * leg;
    gone += leg;
    mark(guide.marked, met);
    if (met.turns) {
      mirrorTurn(traveller, met);
      turned = true;
      reach = GUIDE_PAST_TURN;
    } else {
      reach -= leg;
    }
  }
}

/** Says whether a ball waits on the paddle to be served. */
function isWaiting(ball: Readonly<Ball>): boolean {
  return ball.live && ball.held;
}

/**
 * Lays the dots that lie along a ball's way, from where it is, `gone`
 * along the guide, for a leg's length, while the pool lasts.
 */
function layDots(
  dots: GuideDots,
  ball: Readonly<Ball>,
  gone: number,
  leg: number,
): void {
  for (
    let place = dots.places[dots.count];
    place;
    place = dots.places[dots.count]
  ) {
    const along = (dots.count + 1) * GUIDE_DOT_GAP - gone;
    if (along > leg) return;
    place.x = ball.x + ball.dx * along;
    place.y = ball.y + ball.dy * along;
    dots.count++;
  }
}

/** Marks the cells of the bricks met, but for the bumpers. */
function mark(marked: Cells, met: Readonly<Contacts>): void {
  for (let i = 0; i < met.count; i++) {
    const brick = met.bricks[i];
    if (brick) marked.cells[marked.count++] = brick.cell;
  }
  for (let i = 0; i < met.unhurtCount; i++) {
    const brick = met.unhurt[i];
    if (brick && !isBumper(brick)) marked.cells[marked.count++] = brick.cell;
  }
}
