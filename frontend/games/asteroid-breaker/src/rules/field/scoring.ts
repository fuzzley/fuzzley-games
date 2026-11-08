// The points a wave scores: each rock broken by its kind and size, times
// the chain's multiplier, a stray brought home, and the wave's clearing;
// and the ships the run's points bring as they pass each mark. Once no one
// is flying the run is over, and nothing scores, so its score doesn't hang
// on how its last steps fall into frames.

import { pointsFor } from "../catalog/rocks";
import type { FieldEventLog } from "./events";
import { type Crew, type CrewField, gainShipOn } from "../ship/pilots";
import type { Rock } from "../rocks/rocks";
import { stepsIn } from "../stepper";
import {
  CHAIN,
  CHAIN_MS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  SHIP_POINTS,
  STRAY_POINTS,
} from "../tuning";

/**
 * Describes what of the field its points change, which the rocks' rules hand on
 * as a rock breaks.
 */
export interface ScoreField {
  /** The wave's points, its clearing's among them once it is cleared. */
  score: number;
  /** How many breaks the chain had counted as of the last, 0 once a lost ship ends it. */
  chain: number;
  /** The step the last break counted in the chain came at. */
  lastBreakAt: number;
  /** What the chain's multiplier added to the wave's points, beyond their own. */
  chainPoints: number;
  /** The rocks' own points among the wave's, before the chain's multiplier. */
  rockPoints: number;
  /** How many steps the field has taken, by which the chain's time runs. */
  readonly steps: number;
  /** Who flies the run's ships: with no one flying, the run is over. */
  readonly crew: Crew;
  /** How many ships it has lost, which a clean wave has none of. */
  readonly shipsLost: number;
  /** What happened, for the scene to play. */
  readonly events: FieldEventLog;
}

/**
 * Describes what of the field the ships its points bring act on: the crew
 * they join, the run's points banked as the wave started and the wave's
 * own, and the next ship's mark, which each moves on.
 */
export interface MarkField extends CrewField {
  readonly setup: { readonly banked: number };
  readonly score: number;
  nextShipAt: number;
}

/** Describes what of a cleared wave's field says how its points add up. */
export interface TallyField extends Pick<
  ScoreField,
  "rockPoints" | "chainPoints" | "shipsLost"
> {
  readonly strays: { readonly broughtHome: number };
}

/** Describes how a cleared wave's points add up, for its card. */
export interface WaveTally {
  /** The rocks' own points. */
  readonly rocks: number;
  /** What the chains added beyond the rocks' and the strays' own. */
  readonly chains: number;
  /** The strays' own points. */
  readonly strays: number;
  /** What clearing the wave added. */
  readonly cleared: number;
  /** What clearing it without losing a ship added besides. */
  readonly clean: number;
}

/** Returns how many times a break scores its points, by the count it is in its chain. */
export function multiplier(count: number): number {
  for (const { from, times } of CHAIN) {
    if (count >= from) return times;
  }
  return 1;
}

/**
 * Returns the multiplier the field's chain stands at, its last break's, which a
 * stray brought home scores at, or 1 once its time is up.
 */
export function chainMultiplier(field: Readonly<ScoreField>): number {
  return multiplier(chainNow(field));
}

/**
 * Scores a broken rock its kind's points for its size, times the chain's
 * multiplier, counting it on in the chain, or starting the chain again if
 * the last break was too long ago, and logs them at the rock's place; its
 * own points count among the rocks', for the tally.
 */
export function scoreBreak(field: ScoreField, rock: Readonly<Rock>): void {
  field.chain = chainCountOf(field);
  field.lastBreakAt = field.steps;
  const points = pointsFor(rock.kind, rock.size);
  if (score(field, points, rock.x, rock.y)) field.rockPoints += points;
}

/**
 * Returns the count in its chain a break now would be: the next of the chain's,
 * or the first of a new one once its time is up.
 */
export function chainCountOf(field: Readonly<ScoreField>): number {
  return chainNow(field) + 1;
}

/**
 * Scores a stray brought home at a place, times the chain's multiplier, without
 * counting it on in the chain.
 */
export function scoreStray(field: ScoreField, x: number, y: number): void {
  score(field, STRAY_POINTS, x, y);
}

/** Ends the chain, as the ship is lost. */
export function endChain(field: ScoreField): void {
  field.chain = 0;
}

/** Returns what clearing a wave adds, more for one cleared without losing a ship. */
export function clearingPoints(shipsLost: number): number {
  return CLEAR_POINTS + (shipsLost === 0 ? CLEAN_POINTS : 0);
}

/** Scores a cleared wave what its clearing adds. */
export function scoreClearing(field: ScoreField): void {
  if (!isOver(field)) field.score += clearingPoints(field.shipsLost);
}

/**
 * Gains the crew a ship for each mark the run's points have passed, each
 * flown by the first stray at home if one waits, the next mark coming the
 * points between ships after. A run over gains none.
 */
export function gainShipsByPoints(field: MarkField): void {
  while (
    !isOver(field) &&
    field.setup.banked + field.score >= field.nextShipAt
  ) {
    gainShipOn(field);
    field.nextShipAt += SHIP_POINTS;
  }
}

/**
 * Returns how a cleared wave's points add up, as its field stands: each part
 * as it was scored, so a part's points never land in another's.
 */
export function tallyOf(field: Readonly<TallyField>): WaveTally {
  return {
    rocks: field.rockPoints,
    chains: field.chainPoints,
    strays: field.strays.broughtHome * STRAY_POINTS,
    cleared: CLEAR_POINTS,
    clean: field.shipsLost === 0 ? CLEAN_POINTS : 0,
  };
}

/** Returns how many breaks the chain counts, or 0 once its time is up. */
function chainNow(field: Readonly<ScoreField>): number {
  const within = field.steps - field.lastBreakAt <= stepsIn(CHAIN_MS);
  return within ? field.chain : 0;
}

/**
 * Adds points to the wave's, times the chain's multiplier, and logs them at a
 * place, unless the run is over, and returns whether it did.
 */
function score(
  field: ScoreField,
  points: number,
  x: number,
  y: number,
): boolean {
  if (isOver(field)) return false;
  const times = chainMultiplier(field);
  field.score += points * times;
  field.chainPoints += points * (times - 1);
  field.events.addScore(x, y, points, times);
  return true;
}

/** Returns whether the run is over, no one left flying. */
function isOver(field: Pick<ScoreField, "crew">): boolean {
  return field.crew.flying.length === 0;
}
