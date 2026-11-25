import { AIMS } from "@fz/brick-wall/rules/aims";
import { RADIUS } from "@fz/brick-wall/rules/field";
import { cellOf } from "@fz/brick-wall/rules/grid";
import type { Flown } from "../../flight/flight";
import {
  SHOT_DEPTH,
  aimAt,
  eventsOf,
  flyAt,
  near,
} from "../../../testing/shots";
import { STAND_OFF } from "../../tuning";

/** The ceiling's flat, a radius under it. */
const CEILING = SHOT_DEPTH - RADIUS;

/** The gem's wall cell, a gem alone in column 4 of field row 5. */
const GEM = cellOf(4, 0);

/** A point in the field, or a heading: across, then up. */
type Point = readonly [number, number];

/** How far across and up from the gem's middle the fuzzball's middle meets one of its four long faces at the middle of the side the face stands off. */
const TO_FACE = 0.25 + STAND_OFF / 2;

/** Returns the heading of the aim at an angle. */
function headingAt(degrees: number): Point {
  const heading = AIMS[aimAt(degrees)];
  if (heading === undefined) {
    throw new RangeError(`There is no aim at ${String(degrees)}°.`);
  }
  return heading;
}

/**
 * Returns where the fuzzball waits to reach a point at an angle: flying
 * straight to it, or, coming down, off the ceiling first, as far again past
 * the ceiling as the point lies under it.
 */
function xToReach(degrees: number, [x, y]: Point, down: boolean): number {
  const [dx, dy] = headingAt(degrees);
  const up = down ? 2 * CEILING - y : y;
  return x - (dx * (up - RADIUS)) / dy;
}

/** Returns the flight of a shot at an angle at a gem alone in column 4 of field row 5, on a field 11 deep, by the game's own rules. */
function flyAtGem(x: number, degrees: number): Flown {
  return flyAt({ picture: ["....G...."], x, degrees });
}

describe("a gem, flown by the game's own rules", () => {
  // Each face is met at the middle of its side, from under the gem for
  // its floorward faces and off the ceiling for its ceilingward ones; each
  // swaps the fuzzball's two speeds with the signs that send it away.
  it.each([
    ["floorward left", -1, -1, 60, ([dx, dy]: Point): Point => [-dy, -dx]],
    ["floorward right", 1, -1, 120, ([dx, dy]: Point): Point => [dy, dx]],
    ["ceilingward left", -1, 1, 80, ([dx, dy]: Point): Point => [dy, dx]],
    ["ceilingward right", 1, 1, 100, ([dx, dy]: Point): Point => [-dy, -dx]],
  ] as const)(
    "takes its strike on its %s face, which swaps the fuzzball's speeds as a cut corner does, and breaks",
    (_, across, up, degrees, swapped) => {
      const face: Point = [4.5 + across * TO_FACE, 5.5 + up * TO_FACE];
      const [dx, dy] = headingAt(degrees);
      const coming: Point = up > 0 ? [dx, -dy] : [dx, dy];

      const flown = flyAtGem(xToReach(degrees, face, up > 0), degrees);

      expect([
        eventsOf(flown.flight, "turn")
          .filter(({ off }) => off === "brick")
          .map((turn) => [turn.x, turn.y, turn.dx, turn.dy, turn.cells]),
        eventsOf(flown.flight, "strike"),
      ]).toEqual([
        [[near(face[0]), near(face[1]), ...swapped(coming), [GEM]]],
        [
          expect.objectContaining({
            cell: GEM,
            took: 1,
            broke: true,
            rally: 1,
          }),
        ],
      ]);
    },
  );

  // Straight up from under its floorward point, which a flat across cuts
  // square a radius under its cell.
  it("takes its strike on the flat that cuts a point square, which mirrors the fuzzball", () => {
    const [dx, dy] = headingAt(90);

    const flown = flyAtGem(4.5, 90);

    expect([
      eventsOf(flown.flight, "turn")
        .filter(({ off }) => off === "brick")
        .map((turn) => [turn.x, turn.y, turn.dx, turn.dy]),
      eventsOf(flown.flight, "strike").map(({ cell, broke }) => [cell, broke]),
    ]).toEqual([[[near(4.5), near(5 - RADIUS), near(dx), -dy]], [[GEM, true]]]);
  });
});
