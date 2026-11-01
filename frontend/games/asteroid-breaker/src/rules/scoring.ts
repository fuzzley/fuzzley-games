// The points a wave scores: each rock broken by its kind and size, times
// the chain's multiplier, a stray brought home, and the wave's clearing;
// and the ships the run's points bring as they pass each mark. Once no one
// is flying the run is over, and nothing scores, so its score doesn't hang
// on how its last steps fall into frames.

import { rockPoints } from "./catalog/rocks";
import type { FieldEventLog } from "./events";
import type { Field } from "./field";
import { type Crew, gainShipOn } from "./pilots";
import type { Rock } from "./rocks";
import { stepsIn } from "./stepper";
import {
  CHAIN,
  CHAIN_MS,
  CLEAN_POINTS,
  CLEAR_POINTS,
  SHIP_POINTS,
  STRAY_POINTS,
} from "./tuning";

/** Describes what of the field its points change, which the rocks' rules hand on as a rock breaks. */
export interface ScoreField {
  /** The wave's points, its clearing's among them once it is cleared. */
  score: number;
  /** How many breaks the chain had counted as of the last, 0 once a lost ship ends it. */
  chain: number;
  /** The step the last break counted in the chain came at. */
  lastBreakAt: number;
  /** What the chain's multiplier added to the wave's points, beyond their own. */
  chainPoints: number;
  /** How many steps the field has taken, by which the chain's time runs. */
  readonly steps: number;
  /** Who flies the run's ships: with no one flying, the run is over. */
  readonly crew: Crew;
  /** How many ships it has lost, which a clean wave has none of. */
  readonly shipsLost: number;
  /** What happened, for the scene to play. */
  readonly events: FieldEventLog;
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

/** Returns the multiplier the field's chain stands at, its last break's, which a stray brought home scores at, or 1 once its time is up. */
export function chainMultiplier(field: Readonly<ScoreField>): number {
  return multiplier(chainNow(field));
}

/**
 * Scores a broken rock its kind's points for its size, times the chain's
 * multiplier, counting it on in the chain, or starting the chain again if
 * the last break was too long ago, and logs them at the rock's place.
 */
export function scoreBreak(field: ScoreField, rock: Readonly<Rock>): void {
  field.chain = chainNow(field) + 1;
  field.lastBreakAt = field.steps;
  score(field, rockPoints(rock.kind, rock.size), rock.x, rock.y);
}

/** Scores a stray brought home at a place, times the chain's multiplier, without counting it on in the chain. */
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
export function gainShipsByPoints(field: Field): void {
  while (
    !isOver(field) &&
    field.setup.banked + field.score >= field.nextShipAt
  ) {
    gainShipOn(field);
    field.nextShipAt += SHIP_POINTS;
  }
}

/** Returns how a cleared wave's points add up, as its field stands. */
export function tallyOf(
  field: Pick<Field, "score" | "chainPoints" | "shipsLost" | "strays">,
): WaveTally {
  const strays = field.strays.broughtHome * STRAY_POINTS;
  const clean = field.shipsLost === 0 ? CLEAN_POINTS : 0;
  return {
    rocks: field.score - field.chainPoints - strays - CLEAR_POINTS - clean,
    chains: field.chainPoints,
    strays,
    cleared: CLEAR_POINTS,
    clean,
  };
}

/** Returns the points a tally adds up to. */
export function pointsOf(tally: WaveTally): number {
  return (
    tally.rocks + tally.chains + tally.strays + tally.cleared + tally.clean
  );
}

/** Returns how many breaks the chain counts, or 0 once its time is up. */
function chainNow(field: Readonly<ScoreField>): number {
  const within = field.steps - field.lastBreakAt <= stepsIn(CHAIN_MS);
  return within ? field.chain : 0;
}

/** Adds points to the wave's, times the chain's multiplier, and logs them at a place, unless the run is over. */
function score(field: ScoreField, points: number, x: number, y: number): void {
  if (isOver(field)) return;
  const times = chainMultiplier(field);
  field.score += points * times;
  field.chainPoints += points * (times - 1);
  field.events.addScore(x, y, points, times);
}

/** Returns whether the run is over, no one left flying. */
function isOver(field: Pick<ScoreField, "crew">): boolean {
  return field.crew.flying.length === 0;
}
