// What a wave sends across the field, each once, from an edge, without
// wrapping: the stray fuzzballs, which the ship brings home by touching,
// and the comets, warned of at their edge, which break the rocks they meet
// a size down and take a ship.

import { clamp } from "@fz/core/math";
import { RADIANS_PER_DEGREE } from "./angles";
import { drawIn, nextDraw } from "./draws";
import type { Field } from "./field";
import { type Pilot, bringHome, given, nextPilot } from "./pilots";
import { hitRock, rockHitRadius } from "./rocks";
import { scoreStray } from "./scoring";
import type { Ship } from "./ship";
import { stepsIn } from "./stepper";
import { type Place, type Torus, distanceSquared, moveAlong } from "./torus";
import {
  COMET_FIRST_SHARE,
  COMET_MARGIN,
  COMET_RADIUS,
  COMET_SPEED,
  COMET_TILT,
  COMET_WARNING_MS,
  ENTRY_ALONG,
  PICKUP_PULL_SPEED,
  SHIP_HIT_RADIUS,
  STEP_S,
  STRAY_CATCH_REACH,
  STRAY_NEXT_MS,
  STRAY_RADIUS,
  STRAY_SPEED,
  STRAY_TILT,
  STRAY_TURN,
  type Span,
} from "./tuning";

/** Says what a wave sends across its field. */
export interface HazardSetup {
  /** How many strays it sends, one at a time. */
  readonly strays: number;
  /** How far into the wave its first stray comes, in milliseconds. */
  readonly strayFirstMs: number;
  /**
   * The time from one comet's warning to the next's, in milliseconds, drawn
   * from a span, or null for a wave without comets; the first's warning
   * starts {@link COMET_FIRST_SHARE} of it into the wave.
   */
  readonly cometEvery: Span | null;
}

/** Describes something that crosses the field once, from an edge, without wrapping. */
export interface Crossing {
  /** Whether it is on its way; a record that isn't waits for the next. */
  live: boolean;
  x: number;
  y: number;
  /** The way it flies. */
  heading: number;
  /** Where it was a step ago, for the scene to draw between, as the ship's is. */
  lastX: number;
  lastY: number;
}

/** Describes a stray fuzzball adrift in its bubble, crossing the field on a gentle curve. */
export interface Stray extends Crossing {
  /** The pilot it is, in the color it took as it came in. */
  pilot: Pilot;
  /** How fast its heading turns, in radians a second, either way. */
  turn: number;
}

/** Describes a wave's strays: the one adrift, and when the next comes. */
export interface Strays {
  /** The record of the stray adrift, one at a time. */
  readonly adrift: Stray;
  /** How many the wave has sent. */
  sent: number;
  /** The step the next comes at, while none is adrift and the wave has one left to send. */
  nextAt: number;
  /** How many the ship has brought home. */
  broughtHome: number;
}

/** Describes a comet, warned of off the edge it will come in by, then crossing the field in a straight line. */
export interface Comet extends Crossing {
  /** The steps left of its warning, which it waits through off its edge; 0 once it crosses. */
  warnSteps: number;
  /**
   * The latest steps it broke rocks in, {@link COMET_PASSES} of them, −1 for
   * each it hasn't, so it passes what was laid then, those rocks' pieces,
   * rather than breaking them too.
   */
  readonly smashedAt: number[];
  /** How many steps it has broken rocks in, which says which of `smashedAt` the next takes. */
  smashes: number;
}

/** Describes a wave's comets: a record for each on its way at once, and when the next comes. */
export interface Comets {
  readonly slots: readonly Comet[];
  /** The step the next comet's warning starts at, for a wave with comets. */
  nextAt: number;
}

/** How many comets can be on their way at once, warned of or crossing; one due while every record is taken doesn't come. */
export const COMET_RECORDS = 3;

/**
 * How many of the steps it broke rocks in a comet keeps: far more than it
 * breaks rocks in while the pieces of one are still within its reach.
 */
export const COMET_PASSES = 8;

/** Returns a wave's strays, none adrift and none sent, the first due a time into it, in milliseconds. */
export function createStrays(firstMs: number): Strays {
  return {
    adrift: { ...blankCrossing(), pilot: 0, turn: 0 },
    sent: 0,
    nextAt: stepsIn(firstMs),
    broughtHome: 0,
  };
}

/** Returns the records of a wave's comets, none on its way, and the first not yet drawn. */
export function createComets(): Comets {
  return {
    slots: Array.from({ length: COMET_RECORDS }, () => ({
      ...blankCrossing(),
      warnSteps: 0,
      smashedAt: Array.from({ length: COMET_PASSES }, () => -1),
      smashes: 0,
    })),
    nextAt: 0,
  };
}

/**
 * Draws when a wave with comets warns of its first, as it starts: a share of
 * a time from its span, {@link COMET_FIRST_SHARE}, so a wave cleared quickly
 * still meets one.
 */
export function scheduleFirstComet(field: Field): void {
  scheduleComet(field, COMET_FIRST_SHARE);
}

/** Draws when a wave with comets warns of its next: a time from its span, or a share of one, after the step under way. */
function scheduleComet(field: Field, share = 1): void {
  const every = field.setup.cometEvery;
  if (every === null) return;
  const span = { least: every.least * share, most: every.most * share };
  field.comets.nextAt = field.steps + stepsIn(drawIn(field, span));
}

/**
 * Moves each comet on a step, and warns of the next once it is due: one
 * warned of counts its warning down, and one crossing flies on at the
 * field's pace, breaking each rock it meets a size down, until it has left
 * the field.
 */
export function stepComets(field: Field): void {
  const { comets, torus } = field;
  if (field.setup.cometEvery !== null && field.steps >= comets.nextAt) {
    sendComet(field);
  }
  const speed = COMET_SPEED * field.pace;
  for (const comet of comets.slots) {
    if (!comet.live) continue;
    if (comet.warnSteps > 0) {
      comet.warnSteps -= 1;
      continue;
    }
    comet.lastX = comet.x;
    comet.lastY = comet.y;
    fly(comet, speed);
    if (hasLeft(comet, COMET_MARGIN, torus)) comet.live = false;
    else smashRocks(field, comet);
  }
}

/** Returns whether a crossing comet touches a ship. */
export function touchesComet(field: Field, ship: Readonly<Ship>): boolean {
  for (const comet of field.comets.slots) {
    if (!comet.live || comet.warnSteps > 0) continue;
    if (reaches(comet, ship, COMET_RADIUS + SHIP_HIT_RADIUS, field.torus)) {
      return true;
    }
  }
  return false;
}

/**
 * Moves the stray adrift on a step, or sends the next once it is due: one
 * within a Magnet's reach of the ship is drawn in toward it, any other
 * crosses on its curve until it has left the field, and the ship brings
 * home one that touches it, guarded or not.
 */
export function stepStrays(field: Field): void {
  const { strays, ship, torus } = field;
  const stray = strays.adrift;
  if (!stray.live) {
    if (strays.sent < field.setup.strays && field.steps >= strays.nextAt) {
      sendStray(field);
    }
    return;
  }
  stray.lastX = stray.x;
  stray.lastY = stray.y;
  if (ship === null || !pullIn(field, stray, ship)) {
    stray.heading += stray.turn * STEP_S;
    fly(stray, STRAY_SPEED);
    if (hasLeft(stray, STRAY_RADIUS, torus)) {
      strayGone(field);
      return;
    }
  }
  if (ship !== null && reaches(stray, ship, STRAY_CATCH_REACH, torus)) {
    bringStrayHome(field);
  }
}

/** Lets the stray adrift and the comets go, as the wave is cleared. */
export function clearHazards(field: Field): void {
  field.strays.adrift.live = false;
  for (const comet of field.comets.slots) comet.live = false;
}

/**
 * Warns of a comet off an edge, in a free record, and draws when the next
 * comes; one due while every record is taken doesn't come.
 */
function sendComet(field: Field): void {
  scheduleComet(field);
  const comet = field.comets.slots.find((each) => !each.live);
  if (comet === undefined) return;
  comeIn(field, comet, COMET_MARGIN, COMET_TILT);
  comet.warnSteps = stepsIn(COMET_WARNING_MS);
  comet.smashedAt.fill(-1);
  comet.smashes = 0;
  const at = edgeOf(comet, field.torus);
  field.events.add("warned", at.x, at.y);
}

/** Breaks each rock a comet touches a size down, for nothing, passing what was laid in the steps it broke rocks in, those rocks' pieces. */
function smashRocks(field: Field, comet: Comet): void {
  const alongX = Math.cos(comet.heading);
  const alongY = Math.sin(comet.heading);
  for (const rock of field.rocks) {
    if (!rock.live || comet.smashedAt.includes(rock.laidAt)) continue;
    const reach = COMET_RADIUS + rockHitRadius(rock.size);
    if (!reaches(comet, rock, reach, field.torus)) continue;
    keepSmash(comet, field.steps);
    hitRock(field, rock, alongX, alongY, "smashes");
  }
}

/** Keeps a step a comet breaks rocks in among its latest, once. */
function keepSmash(comet: Comet, step: number): void {
  if (comet.smashedAt.includes(step)) return;
  comet.smashedAt[comet.smashes % COMET_PASSES] = step;
  comet.smashes += 1;
}

/** Sends a stray in off an edge, in the next color in turn, on a curve drawn to one side. */
function sendStray(field: Field): void {
  const { strays } = field;
  const stray = strays.adrift;
  comeIn(field, stray, STRAY_RADIUS, STRAY_TILT);
  const anticlockwise = nextDraw(field) < 0.5;
  stray.turn =
    (anticlockwise ? -1 : 1) * drawIn(field, STRAY_TURN) * RADIANS_PER_DEGREE;
  stray.pilot = nextPilot(field.crew, null);
  field.crew = given(field.crew, stray.pilot);
  strays.sent += 1;
  const at = edgeOf(stray, field.torus);
  field.events.addPilot("strayed", at.x, at.y, stray.pilot, field.crew);
}

/**
 * Draws the stray a step in toward the ship the straight way, never across
 * an edge, as it doesn't wrap, while a Magnet is in effect and the ship is
 * within its reach that way, and returns whether it did.
 */
function pullIn(field: Field, stray: Stray, ship: Readonly<Ship>): boolean {
  if (field.effects.pull.pickup === null) return false;
  const wayX = ship.x - stray.x;
  const wayY = ship.y - stray.y;
  if (Math.hypot(wayX, wayY) > field.pullReach) return false;
  moveAlong(stray, wayX, wayY, PICKUP_PULL_SPEED * STEP_S);
  return true;
}

/** Brings the stray adrift home, where it waits behind those home before it, for its points. */
function bringStrayHome(field: Field): void {
  const { strays } = field;
  const stray = strays.adrift;
  strays.broughtHome += 1;
  field.crew = bringHome(field.crew, stray.pilot);
  field.events.addPilot("home", stray.x, stray.y, stray.pilot, field.crew);
  scoreStray(field, stray.x, stray.y);
  strayGone(field);
}

/** Ends the stray adrift's crossing, the next due a while after. */
function strayGone(field: Field): void {
  field.strays.adrift.live = false;
  field.strays.nextAt = nextStrayAfter(field.steps);
}

/** Returns the step the next stray comes at once one has gone at a step, brought home or off the field. */
export function nextStrayAfter(step: number): number {
  return step + stepsIn(STRAY_NEXT_MS);
}

/**
 * Puts a crossing off one of the field's edges by a margin, away from its
 * corners, heading across the field and toward the edge's middle by up to a
 * tilt, in degrees, the edge, the place and the tilt each drawn.
 */
function comeIn(
  field: Field,
  crossing: Crossing,
  margin: number,
  tilt: number,
): void {
  const { width, height } = field.torus;
  const edge = Math.floor(nextDraw(field) * 4);
  const along = drawIn(field, ENTRY_ALONG);
  // Turns the heading down a left or right edge, or right along the top or
  // bottom, from the edge's first half, and back from its second.
  const off =
    (along < 0.5 ? 1 : -1) * nextDraw(field) * tilt * RADIANS_PER_DEGREE;
  switch (edge) {
    case 0:
      // The left edge, heading right.
      place(crossing, -margin, along * height, off);
      break;
    case 1:
      // The right edge, heading left.
      place(crossing, width + margin, along * height, Math.PI - off);
      break;
    case 2:
      // The top edge, heading down.
      place(crossing, along * width, -margin, Math.PI / 2 - off);
      break;
    default:
      // The bottom edge, heading up.
      place(crossing, along * width, height + margin, 1.5 * Math.PI + off);
  }
}

/** Returns a crossing's record, not on its way. */
function blankCrossing(): Crossing {
  return { live: false, x: 0, y: 0, heading: 0, lastX: 0, lastY: 0 };
}

/** Returns the place on the field's edge nearest a crossing, which waits off it as it comes in. */
function edgeOf(crossing: Readonly<Crossing>, torus: Torus): Place {
  return {
    x: clamp(crossing.x, 0, torus.width),
    y: clamp(crossing.y, 0, torus.height),
  };
}

/** Puts a crossing on its way at a place, heading a way, still a step ago. */
function place(
  crossing: Crossing,
  x: number,
  y: number,
  heading: number,
): void {
  crossing.live = true;
  crossing.x = x;
  crossing.y = y;
  crossing.heading = heading;
  crossing.lastX = x;
  crossing.lastY = y;
}

/** Flies a crossing a step along its heading at a speed, without wrapping. */
function fly(crossing: Crossing, speed: number): void {
  crossing.x += Math.cos(crossing.heading) * speed * STEP_S;
  crossing.y += Math.sin(crossing.heading) * speed * STEP_S;
}

/** Returns whether a crossing's middle is farther than a margin off the field, so it is out of sight. */
function hasLeft(
  crossing: Readonly<Crossing>,
  margin: number,
  torus: Torus,
): boolean {
  return (
    crossing.x < -margin ||
    crossing.x > torus.width + margin ||
    crossing.y < -margin ||
    crossing.y > torus.height + margin
  );
}

/** Returns whether a crossing's middle is on the field, between its edges. */
function isOnField(crossing: Readonly<Crossing>, torus: Torus): boolean {
  return (
    crossing.x >= 0 &&
    crossing.x < torus.width &&
    crossing.y >= 0 &&
    crossing.y < torus.height
  );
}

/**
 * Returns whether a crossing is within a reach of a place, the shortest way
 * across the wrap.
 *
 * Only a crossing with its middle on the field reaches anything: what it
 * meets is drawn across the wrap and it isn't, so off the field it would
 * reach what lies at the far edge, out of its sight.
 */
function reaches(
  crossing: Readonly<Crossing>,
  to: Place,
  reach: number,
  torus: Torus,
): boolean {
  return (
    isOnField(crossing, torus) &&
    distanceSquared(torus, crossing.x, crossing.y, to.x, to.y) <= reach * reach
  );
}
