import { RADIANS_PER_DEGREE, TURN } from "../rules/angles";
import type { FieldEvent } from "../rules/field/events";
import type { Crossing } from "../rules/hazards/crossing";
import { type Torus, across } from "../rules/torus";
import { ENTRY_ALONG } from "../rules/tuning";

/** A sliver under the smallest a reach is measured to. */
const SLIVER = 1e-6;

/**
 * Describes where a crossing waits to come in: off which edge, by how far,
 * how far along it, and how its heading tilts off straight across.
 */
export interface Entry {
  readonly edge: "left" | "right" | "top" | "bottom";
  readonly by: number;
  /** Its share of the way along its edge. */
  readonly along: number;
  /** In degrees. */
  readonly tilt: number;
  /** Whether it tilts toward its edge's middle, or not at all. */
  readonly towardMiddle: boolean;
}

/** Returns where a crossing waits to come in, off an edge of a field. */
export function entryOf(crossing: Readonly<Crossing>, torus: Torus): Entry {
  const { x, y, heading } = crossing;
  const down = y / torus.height;
  const right = x / torus.width;
  if (x < 0) return entry("left", -x, down, heading, 0);
  if (x > torus.width) {
    return entry("right", x - torus.width, down, heading, Math.PI);
  }
  if (y < 0) return entry("top", -y, right, heading, Math.PI / 2);
  return entry("bottom", y - torus.height, right, heading, 1.5 * Math.PI);
}

/** Returns what the entries of crossings come to: how many edges they use, and those that come in wrongly. */
export function entriesOf(
  entries: readonly Entry[],
  margin: number,
  tilt: number,
): { edges: number; wrong: Entry[] } {
  return {
    edges: new Set(entries.map((each) => each.edge)).size,
    wrong: entries.filter(
      (each) =>
        Math.abs(each.by - margin) > SLIVER ||
        each.along < ENTRY_ALONG.least - SLIVER ||
        each.along > ENTRY_ALONG.most + SLIVER ||
        each.tilt > tilt ||
        !each.towardMiddle,
    ),
  };
}

/**
 * Returns how far an event lies from a crossing waiting to come in, and
 * whether it lies on the field's border, as one logged where the crossing
 * will come in does.
 */
export function edgePlaceOf(
  event: Readonly<FieldEvent> | undefined,
  crossing: Readonly<Crossing>,
  torus: Torus,
): [number, boolean] {
  if (!event) throw new Error("Nothing was logged.");
  const { x, y } = event;
  const onBorder =
    x === 0 || x === torus.width || y === 0 || y === torus.height;
  return [Math.hypot(x - crossing.x, y - crossing.y), onBorder];
}

/** Returns an entry off an edge, its tilt measured from straight across. */
function entry(
  edge: Entry["edge"],
  by: number,
  along: number,
  heading: number,
  straight: number,
): Entry {
  const turned = across(straight, heading, TURN);
  // Down a left or right edge, or right along the top or bottom.
  const alongEdge =
    edge === "left" || edge === "right" ? Math.sin(heading) : Math.cos(heading);
  return {
    edge,
    by,
    along,
    tilt: Math.abs(turned) / RADIANS_PER_DEGREE,
    towardMiddle: alongEdge * (0.5 - along) >= -SLIVER,
  };
}
