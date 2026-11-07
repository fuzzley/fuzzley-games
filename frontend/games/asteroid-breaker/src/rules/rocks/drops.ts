// The pickups broken rocks let go: by chance, from a crystal and after a
// drought, drawn by weight from the wave's pool into records made once.

import { TURN } from "../angles";
import { type PickupId, pickup } from "../catalog/pickups";
import { hasTrait } from "../catalog/rocks";
import { type Draws, nextDraw } from "../draws";
import type { FieldEventLog } from "../field/events";
import type { Rock } from "./rocks";
import { stepsIn } from "../stepper";
import {
  DROUGHT_MS,
  PICKUP_BLINK_MS,
  PICKUP_DRIFT,
  PICKUP_LIFE_MS,
} from "../tuning";

/** Describes a pickup a rock let go, floating on the field until it is caught or fades. */
export interface Floating {
  /** Whether it is on the field; a record that isn't waits for the next pickup let go. */
  live: boolean;
  /** Which pickup it is. */
  id: PickupId;
  x: number;
  y: number;
  /** The velocity it drifts at, which it keeps while the ship draws it in. */
  vx: number;
  vy: number;
  /** Where it was a step ago, for the scene to draw between, as the ship's is. */
  lastX: number;
  lastY: number;
  /**
   * The steps it has left to float, counted down as each is floated, so it
   * floats as many as it is given, the one it is let go in among them, and
   * fades in the step after its last.
   */
  lifeSteps: number;
}

/** Says how a wave lets pickups go. */
export interface DropSetup {
  /** The chance a broken rock lets one go, from 0 to 1. */
  readonly drops: number;
  /** The pickups that can come, drawn from by weight. */
  readonly pool: readonly PickupId[];
  /** How many may float at once before chance lets no more go; a crystal and a drought let one go however many float. */
  readonly pickupsAtOnce: number;
}

/** Describes what a pickup's drop acts on, which the rocks' rules hand on as a rock breaks. */
export interface DropField extends Draws {
  readonly setup: DropSetup;
  /** A record for each pickup the field floats at most, {@link PICKUP_RECORDS}. */
  readonly pickups: readonly Floating[];
  /** The step a pickup was last let go at, or 0 for none yet, from which a drought is counted. */
  lastDropAt: number;
  /** How many steps the field has taken, by which its beats and times run and a rock's laying is told. */
  readonly steps: number;
  /** What happened, for the scene to play. */
  readonly events: FieldEventLog;
}

/** A wave's pool that holds a pickup at least, which one can be drawn from. */
type FilledPool = readonly [PickupId, ...PickupId[]];

/** How many pickups the field keeps records for, those a crystal lets go past the most at once too. */
export const PICKUP_RECORDS = 8;

/** Returns the records of the pickups a field may float, none floating. */
export function createPickups(): Floating[] {
  // A record out of play keeps whichever pickup it last held.
  return Array.from({ length: PICKUP_RECORDS }, () => ({
    live: false,
    id: "spread",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lastX: 0,
    lastY: 0,
    lifeSteps: 0,
  }));
}

/** Returns whether a pickup is in its last seconds, which it blinks through. */
export function blinks(floating: Readonly<Floating>): boolean {
  return floating.lifeSteps <= stepsIn(PICKUP_BLINK_MS);
}

/**
 * Lets a pickup drawn from the wave's pool go from a rock as it breaks, if
 * the pool holds any and a record is free: always from a crystal, and from
 * the first large rock broken once a drought has gone by, and otherwise by
 * the wave's chance, while fewer than its most at once float.
 */
export function dropFrom(field: DropField, rock: Readonly<Rock>): void {
  const { pool } = field.setup;
  if (!holdsAny(pool) || !letsGo(field, rock)) return;
  const floating = field.pickups.find((each) => !each.live);
  if (floating === undefined) return;
  const id = drawPickup(field, pool);
  const heading = nextDraw(field) * TURN;
  floating.live = true;
  floating.id = id;
  floating.x = rock.x;
  floating.y = rock.y;
  floating.vx = Math.cos(heading) * PICKUP_DRIFT;
  floating.vy = Math.sin(heading) * PICKUP_DRIFT;
  floating.lastX = rock.x;
  floating.lastY = rock.y;
  floating.lifeSteps = stepsIn(PICKUP_LIFE_MS);
  field.lastDropAt = field.steps;
  field.events.addPickup("dropped", rock.x, rock.y, id);
}

/** Returns whether a broken rock lets a pickup go, drawing the wave's chance only when nothing else decides it. */
function letsGo(field: DropField, rock: Readonly<Rock>): boolean {
  if (hasTrait(rock.kind, "gives")) return true;
  if (
    rock.size === "large" &&
    field.steps - field.lastDropAt >= stepsIn(DROUGHT_MS)
  ) {
    return true;
  }
  const { drops, pickupsAtOnce } = field.setup;
  return (
    drops > 0 && floatingCount(field) < pickupsAtOnce && nextDraw(field) < drops
  );
}

/** Returns whether a wave's pool holds a pickup to draw. */
function holdsAny(pool: readonly PickupId[]): pool is FilledPool {
  return pool.length > 0;
}

/** Returns a pickup drawn by weight from a pool. */
function drawPickup(field: DropField, pool: FilledPool): PickupId {
  let total = 0;
  for (const id of pool) total += pickup(id).weight;
  let left = nextDraw(field) * total;
  // The last is drawn if rounding leaves a sliver after every weight.
  let drawn = pool[0];
  for (const id of pool) {
    drawn = id;
    left -= pickup(id).weight;
    if (left < 0) break;
  }
  return drawn;
}

/** Returns how many pickups float on the field. */
function floatingCount(field: DropField): number {
  let count = 0;
  for (const floating of field.pickups) if (floating.live) count += 1;
  return count;
}
