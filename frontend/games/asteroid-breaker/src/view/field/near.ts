// What lies near a place on the field: the nearest whole rock or crossing
// comet, across the wrap, which a pilot keeps an eye on, at the controls or
// in tow.

import { reaches } from "../../rules/hazards/crossing";
import { rockHitRadius } from "../../rules/rocks/rocks";
import { type Moving, type Place, type Torus, across } from "../../rules/torus";
import { COMET_RADIUS } from "../../rules/tuning";
import type { FieldView } from "./frame";

/**
 * Returns how far beyond a circle about a place the edge of the nearest
 * whole rock or crossing comet lies, within a reach of the circle, and
 * writes the way to it, a unit long, into a record, where one is given; or
 * returns Infinity, writing nothing, with none within the reach.
 */
export function nearestThreat(
  field: Pick<FieldView, "rocks" | "comets" | "torus">,
  place: Readonly<Place>,
  radius: number,
  reach: number,
  way: Moving | null,
): number {
  const { torus } = field;
  let gap = Infinity;
  let nearX = 0;
  let nearY = 0;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const beyond = gapTo(place, radius, torus, rock, rockHitRadius(rock.size));
    if (beyond < gap) {
      gap = beyond;
      nearX = rock.x;
      nearY = rock.y;
    }
  }
  const watched = COMET_RADIUS + radius + reach;
  for (const comet of field.comets.slots) {
    if (comet.warnSteps > 0 || !comet.live) continue;
    if (!reaches(comet, place, watched, torus)) continue;
    const beyond = gapTo(place, radius, torus, comet, COMET_RADIUS);
    if (beyond < gap) {
      gap = beyond;
      nearX = comet.x;
      nearY = comet.y;
    }
  }
  if (gap > reach) return Infinity;
  if (!way) return gap;
  const dx = across(place.x, nearX, torus.width);
  const dy = across(place.y, nearY, torus.height);
  const far = Math.hypot(dx, dy);
  way.x = far > 0 ? dx / far : 0;
  way.y = far > 0 ? dy / far : 0;
  return gap;
}

/**
 * Returns how far beyond a circle of a radius about a place a thing of
 * another radius lies, its edge from the circle's, across the wrap.
 */
function gapTo(
  place: Readonly<Place>,
  radius: number,
  torus: Torus,
  thing: Readonly<Place>,
  thingRadius: number,
): number {
  const dx = across(place.x, thing.x, torus.width);
  const dy = across(place.y, thing.y, torus.height);
  return Math.hypot(dx, dy) - thingRadius - radius;
}
