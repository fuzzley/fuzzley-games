// The points a wave scores: each rock broken by its kind and size, each
// spark gathered and each stray caught, times static's multiplier, and the
// wave's clearing.
// Once no one is at the controls the run is over, and nothing scores, so
// its score doesn't hang on how its last steps fall into frames.

import { pointsFor } from "../catalog/rocks";
import type { FieldEventLog } from "./events";
import type { Crew, Pilot } from "../ship/pilots";
import type { Rock } from "../rocks/rocks";
import { type Charge, multiplierOf } from "../sparks/charge";
import { CLEAN_POINTS, CLEAR_POINTS, SPARK_POINTS } from "../tuning";

/**
 * Describes what of the field its points change, which the rocks' rules hand on
 * as a rock breaks.
 */
export interface ScoreField {
  /** The wave's points, its clearing's among them once it is cleared. */
  score: number;
  /** What static's multiplier added to the wave's points, beyond their own. */
  staticPoints: number;
  /** The rocks' own points among the wave's, before static's multiplier. */
  rockPoints: number;
  /** The sparks' own points among the wave's, before static's multiplier. */
  sparkPoints: number;
  /** The strays' own points among the wave's, before static's multiplier. */
  strayPoints: number;
  /** The pilot's static, whose step multiplies what is scored. */
  readonly charge: Readonly<Charge>;
  /** Who is aboard: with no one at the controls, the run is over. */
  readonly crew: Crew;
  /**
   * How many hits the ship has taken, which a clean wave has none of; a hit
   * the Shield takes counts none.
   */
  readonly hits: number;
  /** What happened, for the scene to play. */
  readonly events: FieldEventLog;
}

/** Describes what of a cleared wave's field says how its points add up. */
export type TallyField = Pick<
  ScoreField,
  "rockPoints" | "sparkPoints" | "staticPoints" | "strayPoints" | "hits"
>;

/** Describes how a cleared wave's points add up, for its card. */
export interface WaveTally {
  /** The rocks' own points. */
  readonly rocks: number;
  /** The sparks' own points. */
  readonly sparks: number;
  /** What static's multiplier added beyond the rocks', the sparks' and the strays' own. */
  readonly static: number;
  /** The strays' own points. */
  readonly strays: number;
  /** What clearing the wave added. */
  readonly cleared: number;
  /** What clearing it without a hit taken added besides. */
  readonly clean: number;
}

/**
 * Scores a broken rock its kind's points for its size, times static's
 * multiplier, and logs them at the rock's place; its own points count
 * among the rocks', for the tally.
 */
export function scoreBreak(field: ScoreField, rock: Readonly<Rock>): void {
  const points = pointsFor(rock.kind, rock.size);
  if (score(field, points, rock.x, rock.y)) field.rockPoints += points;
}

/**
 * Scores a spark gathered at a place its points, times static's
 * multiplier, logged with the pilot who gathered it, unless the run is
 * over, and returns whether it did; its own points count among the
 * sparks', for the tally.
 */
export function scoreSpark(
  field: ScoreField,
  x: number,
  y: number,
  by: Pilot,
): boolean {
  if (isOver(field)) return false;
  const times = multiply(field, SPARK_POINTS);
  field.sparkPoints += SPARK_POINTS;
  field.events.addSpark(x, y, by, SPARK_POINTS, times);
  return true;
}

/**
 * Scores a stray caught at a place its points, times static's multiplier;
 * its own points count among the strays', for the tally.
 */
export function scoreStray(
  field: ScoreField,
  x: number,
  y: number,
  points: number,
): void {
  if (score(field, points, x, y)) field.strayPoints += points;
}

/** Returns what clearing a wave adds, more for one cleared without a hit taken. */
export function clearingPoints(hits: number): number {
  return CLEAR_POINTS + (hits === 0 ? CLEAN_POINTS : 0);
}

/** Scores a cleared wave what its clearing adds. */
export function scoreClearing(field: ScoreField): void {
  if (!isOver(field)) field.score += clearingPoints(field.hits);
}

/**
 * Returns how a cleared wave's points add up, as its field stands: each part
 * as it was scored, so a part's points never land in another's.
 */
export function tallyOf(field: Readonly<TallyField>): WaveTally {
  return {
    rocks: field.rockPoints,
    sparks: field.sparkPoints,
    static: field.staticPoints,
    strays: field.strayPoints,
    cleared: CLEAR_POINTS,
    clean: field.hits === 0 ? CLEAN_POINTS : 0,
  };
}

/**
 * Adds points to the wave's, times static's multiplier, and logs them at a
 * place, unless the run is over, and returns whether it did.
 */
function score(
  field: ScoreField,
  points: number,
  x: number,
  y: number,
): boolean {
  if (isOver(field)) return false;
  const times = multiply(field, points);
  field.events.addScore(x, y, points, times);
  return true;
}

/**
 * Adds points to the wave's, times static's multiplier, what it added
 * apart, and returns the multiplier.
 */
function multiply(field: ScoreField, points: number): number {
  const times = multiplierOf(field.charge.level);
  field.score += points * times;
  field.staticPoints += points * (times - 1);
  return times;
}

/** Returns whether the run is over, no one left at the controls. */
function isOver(field: Pick<ScoreField, "crew">): boolean {
  return field.crew.pilot === null;
}
