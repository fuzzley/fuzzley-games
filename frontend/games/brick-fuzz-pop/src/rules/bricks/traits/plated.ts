import {
  CEILINGWARD,
  CEILINGWARD_LEFT,
  CEILINGWARD_RIGHT,
  FLOORWARD,
  FLOORWARD_LEFT,
  FLOORWARD_RIGHT,
  LEFT,
  RIGHT,
} from "@fz/brick-wall/rules/grid";
import type { TraitOf } from "../../catalog/bricks";
import type { TraitRule } from "../../flight/hooks";

/**
 * Returns the faces a strike at a side of a brick meets: a face its own, a
 * corner the two it joins, and none for a disc, a zap or a blast, whose
 * side is 0.
 */
function facesOf(side: number): number {
  switch (side) {
    case FLOORWARD_LEFT:
      return FLOORWARD | LEFT;
    case FLOORWARD_RIGHT:
      return FLOORWARD | RIGHT;
    case CEILINGWARD_LEFT:
      return CEILINGWARD | LEFT;
    case CEILINGWARD_RIGHT:
      return CEILINGWARD | RIGHT;
    default:
      return side;
  }
}

/**
 * A plated brick shields itself from a fuzzball that strikes a plated face,
 * or a corner both of whose faces are plated, and earths its charge, so the
 * fuzzball turns plain; `strike()` keeps a hot shot's. The shielded strike
 * counts as a touch against the fuzzball's boredom, though not as a hit. A
 * strike elsewhere hurts it as a tough brick's would, and a zap or a blast,
 * which meets no face, always does.
 */
export const PLATED_RULE: TraitRule<TraitOf["plated"]> = {
  struck: (struck) => {
    const faces = facesOf(struck.side);
    if (faces !== 0 && (struck.plates & faces) === faces) {
      struck.hurts = false;
      struck.earths = true;
    }
  },
};
