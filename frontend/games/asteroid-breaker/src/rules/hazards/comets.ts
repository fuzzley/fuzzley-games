// The comets a wave sends across the field, warned of at their edge, which
// break the rocks they meet a size down and take a ship.

import { drawIn } from "../draws";
import type { Field } from "../field/field";
import { hitRock, rockHitRadius } from "../rocks/rocks";
import type { Ship } from "../ship/ship";
import { stepsIn } from "../stepper";
import {
  COMET_FIRST_SHARE,
  COMET_MARGIN,
  COMET_RADIUS,
  COMET_SPEED,
  COMET_TILT,
  COMET_WARNING_MS,
  SHIP_HIT_RADIUS,
  type Span,
} from "../tuning";
import {
  type Crossing,
  blankCrossing,
  comeIn,
  edgeOf,
  fly,
  hasLeft,
  reaches,
} from "./crossing";

/** Says the comets a wave sends across its field. */
export interface CometSetup {
  /**
   * The time from one comet's warning to the next's, in milliseconds, drawn
   * from a span, or null for a wave without comets; the first's warning
   * starts {@link COMET_FIRST_SHARE} of it into the wave.
   */
  readonly cometEvery: Span | null;
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

/** Lets the comets go, as the wave is cleared. */
export function clearComets(field: Field): void {
  for (const comet of field.comets.slots) comet.live = false;
}

/** Draws when a wave with comets warns of its next: a time from its span, or a share of one, after the step under way. */
function scheduleComet(field: Field, share = 1): void {
  const every = field.setup.cometEvery;
  if (every === null) return;
  const span = { least: every.least * share, most: every.most * share };
  field.comets.nextAt = field.steps + stepsIn(drawIn(field, span));
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
