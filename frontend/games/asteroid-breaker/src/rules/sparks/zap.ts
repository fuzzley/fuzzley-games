// The zap: a dash begun at full static arcs from the pod to the rocks
// nearest the path it flies, each taking a hit, and spends static.

import { clamp } from "@fz/core/math";
import {
  type Rock,
  type RockField,
  hitRock,
  rockHitRadius,
} from "../rocks/rocks";
import { type Place, across } from "../torus";
import { DASH_MS, DASH_SPEED, ZAP_COST } from "../tuning";
import {
  type Charge,
  type ChargeField,
  isStaticFull,
  spendStatic,
} from "./charge";

/** Describes what of the field a zap acts on: the rocks it arcs to, and static, which it spends. */
export interface ZapField extends RockField, ChargeField {
  readonly charge: Charge;
  readonly ship: Readonly<Place> | null;
}

/**
 * How far the path a zap arcs along runs from the pod, `DASH_SPEED` for
 * `DASH_MS`: as far as a dash flies, give or take its last step.
 */
export const DASH_PATH = (DASH_SPEED * DASH_MS) / 1000;

/** Describes a rock a zap may arc to: how near the path its edge lies, and how far along it its middle. */
interface InReach {
  readonly rock: Rock;
  readonly apart: number;
  readonly along: number;
}

/**
 * Zaps from a dash begun at full static at the pod's place, heading a way,
 * in radians, and returns whether it did: arcs leap to the whole rocks
 * nearest the path the dash flies, as many as the field's sparking says,
 * whose edges lie within its reach, as a blast's reach is measured, each
 * logged and taking a hit, scored at full static's multiplier, and then
 * static falls by {@link ZAP_COST}, held there a while. With static short
 * of full, or no rock in reach, the dash is no zap, and static is kept.
 */
export function zap(
  field: ZapField,
  pod: Readonly<Place>,
  heading: number,
): boolean {
  if (!isStaticFull(field)) return false;
  const arcs = arcsFrom(field, pod, heading);
  if (arcs.length === 0) return false;
  field.events.addZap(pod.x, pod.y, heading);
  const { width, height } = field.torus;
  const laidAt = arcs.map((rock) => rock.laidAt);
  for (const [arc, rock] of arcs.entries()) {
    // A storm boulder's vent, as the zap hits it, may break a rock arced to
    // after it, and lay a piece in its slot.
    if (!rock.live || rock.laidAt !== laidAt[arc]) continue;
    const alongX = across(pod.x, rock.x, width);
    const alongY = across(pod.y, rock.y, height);
    field.events.addArc(rock, alongX, alongY);
    hitRock(field, rock, alongX, alongY);
  }
  spendStatic(field, ZAP_COST);
  return true;
}

/**
 * Returns the whole rocks a zap from a place, heading a way, arcs to: those
 * whose edges lie within the sparking's reach of the dash's path, the
 * nearest it first, the sooner along it of two as near, as many as its
 * arcs at most.
 */
function arcsFrom(
  field: ZapField,
  pod: Readonly<Place>,
  heading: number,
): Rock[] {
  const { torus, sparking } = field;
  const wayX = Math.cos(heading);
  const wayY = Math.sin(heading);
  const inReach: InReach[] = [];
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const offX = across(pod.x, rock.x, torus.width);
    const offY = across(pod.y, rock.y, torus.height);
    const along = clamp(offX * wayX + offY * wayY, 0, DASH_PATH);
    const apart =
      Math.hypot(offX - wayX * along, offY - wayY * along) -
      rockHitRadius(rock.size);
    if (apart <= sparking.zapReach) inReach.push({ rock, apart, along });
  }
  inReach.sort(
    (one, other) => one.apart - other.apart || one.along - other.along,
  );
  return inReach.slice(0, sparking.arcs).map(({ rock }) => rock);
}
