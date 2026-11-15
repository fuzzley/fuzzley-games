import type { Field } from "../../rules/field/field";
import { rockHitRadius } from "../../rules/rocks/rocks";
import type { Moving } from "../../rules/torus";
import { COMET_RADIUS } from "../../rules/tuning";
import { fieldFrom, placeComet, placeRock } from "../../testing/field_picture";
import { nearestThreat } from "./near";

/** Where the specs watch from, away from the edges of `fieldFrom()`'s field, 72 by 40. */
const AT = { x: 30, y: 20 } as const;

/** The radius of the circle the specs watch from. */
const RADIUS = 0.5;

/** Returns a field with nothing on it. */
function emptyField(): Field {
  return fieldFrom([]);
}

/** Returns a record a way is written into, marked so a spec sees it untouched. */
function blank(): Moving {
  return { x: 9, y: 9 };
}

describe("nearestThreat", () => {
  it("finds nothing on an empty field, and writes no way", () => {
    const field = emptyField();
    const way = blank();

    const gap = nearestThreat(field, AT, RADIUS, 6, way);

    expect({ gap, way }).toEqual({ gap: Infinity, way: { x: 9, y: 9 } });
  });

  it("gives how far beyond the circle the nearest rock's edge lies, and the way to it", () => {
    const field = emptyField();
    placeRock(field, "small", AT.x + 4, AT.y);
    placeRock(field, "small", AT.x, AT.y - 5);
    const way = blank();

    const gap = nearestThreat(field, AT, RADIUS, 6, way);

    expect({ gap, way }).toEqual({
      gap: 4 - rockHitRadius("small") - RADIUS,
      way: { x: 1, y: 0 },
    });
  });

  it("finds nothing beyond its reach", () => {
    const field = emptyField();
    placeRock(field, "small", AT.x + 4, AT.y);

    const gap = nearestThreat(field, AT, RADIUS, 1, blank());

    expect(gap).toBe(Infinity);
  });

  it("finds a rock just within its reach", () => {
    const field = emptyField();
    const reach = 4 - rockHitRadius("small") - RADIUS;
    placeRock(field, "small", AT.x + 4, AT.y);

    const gap = nearestThreat(field, AT, RADIUS, reach, blank());

    expect(gap).toBeCloseTo(reach, 9);
  });

  it("finds a rock the short way across the field's edge", () => {
    const field = emptyField();
    placeRock(field, "small", 71, 20);
    const way = blank();

    const gap = nearestThreat(field, { x: 1, y: 20 }, RADIUS, 6, way);

    expect({ gap, way }).toEqual({
      gap: 2 - rockHitRadius("small") - RADIUS,
      way: { x: -1, y: 0 },
    });
  });

  it("passes over a rock that broke", () => {
    const field = emptyField();
    placeRock(field, "small", AT.x + 2, AT.y).live = false;

    expect(nearestThreat(field, AT, RADIUS, 6, blank())).toBe(Infinity);
  });

  it("finds a comet crossing near", () => {
    const field = emptyField();
    placeComet(field, AT.x, AT.y + 3);
    const way = blank();

    const gap = nearestThreat(field, AT, RADIUS, 6, way);

    expect({ gap, way }).toEqual({
      gap: 3 - COMET_RADIUS - RADIUS,
      way: { x: 0, y: 1 },
    });
  });

  it("pays no heed to a comet still being warned of", () => {
    const field = emptyField();
    placeComet(field, AT.x, AT.y + 3).warnSteps = 10;

    expect(nearestThreat(field, AT, RADIUS, 6, blank())).toBe(Infinity);
  });

  it("pays no heed to a comet off the field, yet to come on or gone", () => {
    const field = emptyField();
    placeComet(field, -1, 20);

    expect(nearestThreat(field, { x: 1, y: 20 }, RADIUS, 6, blank())).toBe(
      Infinity,
    );
  });

  it("takes a comet nearer than a rock", () => {
    const field = emptyField();
    placeRock(field, "small", AT.x + 5, AT.y);
    placeComet(field, AT.x - 3, AT.y);
    const way = blank();

    nearestThreat(field, AT, RADIUS, 6, way);

    expect(way).toEqual({ x: -1, y: 0 });
  });

  it("gives no way from a rock right on the place", () => {
    const field = emptyField();
    placeRock(field, "small", AT.x, AT.y);
    const way = blank();

    nearestThreat(field, AT, RADIUS, 6, way);

    expect(way).toEqual({ x: 0, y: 0 });
  });

  it("gives the gap with no record to write the way into", () => {
    const field = emptyField();
    placeRock(field, "small", AT.x + 4, AT.y);

    expect(nearestThreat(field, AT, RADIUS, 6, null)).toBe(
      4 - rockHitRadius("small") - RADIUS,
    );
  });
});
