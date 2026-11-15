// The near misses: a rock or a comet that passes near the pod's hit circle
// without touching it adds to static, once a pass, counted as it draws off.

import type { Comet } from "../hazards/comets";
import { reaches } from "../hazards/crossing";
import { type Rock, rockHitRadius } from "../rocks/rocks";
import { type Place, type Torus, across, distanceSquared } from "../torus";
import {
  COMET_RADIUS,
  GRAZE_MARGIN,
  GRAZE_STATIC,
  SHIP_HIT_RADIUS,
} from "../tuning";
import { type ChargeField, raiseStatic } from "./charge";

/** Names how a rock's or a comet's pass by the pod stands, which a near miss is counted from. */
export type NearPass =
  /** Last seen beyond a near miss, so its next pass may be one. */
  | "clear"
  /** Near the pod's hit circle, untouched, since it came in from clear. */
  | "near"
  /**
   * Its pass counts for nothing: it touched the pod's hit circle, or it was
   * laid near it, or the field was stretched while it was.
   */
  | "spent";

/** Names where something lies against the pod's hit circle in a step. */
type NearWhere = "touching" | "near" | "clear";

/** Describes something that may pass near the pod: its place, and how its pass stands. */
interface Passing extends Place {
  pass: NearPass;
}

/** Describes what of the field a near miss is counted on: the rocks, the comets and static, at the ship. */
export interface GrazeField extends ChargeField {
  readonly torus: Torus;
  readonly rocks: readonly Rock[];
  readonly comets: { readonly slots: readonly Comet[] };
}

/**
 * Counts the near misses of a step, once the ship has met what touched it:
 * each whole rock, or comet with its middle on the field, as a comet only
 * hits there, that came near the pod's hit circle untouched, from clear,
 * and has drawn off again is logged at the ship and adds to static; none
 * once the run is over.
 */
export function countGrazes(field: GrazeField): void {
  const { ship } = field;
  if (ship === null) return;
  for (const rock of field.rocks) {
    if (rock.live) passBy(field, ship, rock, rockWhere(field, ship, rock));
  }
  for (const comet of field.comets.slots) {
    if (comet.live) passBy(field, ship, comet, cometWhere(field, ship, comet));
  }
}

/** Spends every pass under way, as a stretch moves the rocks and the comets nearer the pod or farther. */
export function spendPasses(field: Pick<GrazeField, "rocks" | "comets">): void {
  for (const rock of field.rocks) rock.pass = "spent";
  for (const comet of field.comets.slots) comet.pass = "spent";
}

/** Returns where a rock lies against the pod's hit circle, across the wrap. */
function rockWhere(
  field: GrazeField,
  ship: Readonly<Place>,
  rock: Readonly<Rock>,
): NearWhere {
  const touch = SHIP_HIT_RADIUS + rockHitRadius(rock.size);
  const apart = distanceSquared(field.torus, ship.x, ship.y, rock.x, rock.y);
  if (apart <= touch ** 2) return "touching";
  return apart <= (touch + GRAZE_MARGIN) ** 2 ? "near" : "clear";
}

/** Returns where a comet lies against the pod's hit circle: clear while its middle is off the field. */
function cometWhere(
  field: GrazeField,
  ship: Readonly<Place>,
  comet: Readonly<Comet>,
): NearWhere {
  const touch = SHIP_HIT_RADIUS + COMET_RADIUS;
  if (reaches(comet, ship, touch, field.torus)) return "touching";
  return reaches(comet, ship, touch + GRAZE_MARGIN, field.torus)
    ? "near"
    : "clear";
}

/**
 * Moves a pass on by where it lies this step, counting a near miss as one
 * near untouched draws off.
 */
function passBy(
  field: GrazeField,
  ship: Readonly<Place>,
  passing: Passing,
  where: NearWhere,
): void {
  switch (where) {
    case "touching":
      passing.pass = "spent";
      break;
    case "near":
      if (passing.pass === "clear") passing.pass = "near";
      break;
    case "clear":
      if (passing.pass === "near") graze(field, ship, passing);
      passing.pass = "clear";
      break;
  }
}

/** Logs a near miss at the ship, the way to what passed, and adds its static. */
function graze(
  field: GrazeField,
  ship: Readonly<Place>,
  passing: Readonly<Place>,
): void {
  const { torus } = field;
  field.events.addGraze(
    ship.x,
    ship.y,
    across(ship.x, passing.x, torus.width),
    across(ship.y, passing.y, torus.height),
  );
  raiseStatic(field, GRAZE_STATIC);
}
