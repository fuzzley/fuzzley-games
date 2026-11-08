import type { FieldEventLog } from "../../rules/field/events";
import type { Field } from "../../rules/field/field";
import { STILL, type Ship, createShip } from "../../rules/ship/ship";
import type { Moving, Torus } from "../../rules/torus";
import {
  type EventsView,
  type FieldView,
  type Stepped,
  angleBetween,
  shipAt,
  wrappedBetween,
} from "./frame";

/** The field the spec's things are drawn on, longer down than across. */
const TORUS: Torus = { width: 10, height: 20 };

/**
 * Returns where a thing is drawn on the spec's field, `alpha` of the way from
 * its last place to its next.
 */
function drawnAt(thing: Stepped, alpha: number): Moving {
  return wrappedBetween(thing, alpha, TORUS, { x: 0, y: 0 });
}

/** Returns a ship that went from a place and an angle to another in its last step. */
function shipFrom(
  last: { readonly x: number; readonly y: number; readonly angle: number },
  next: { readonly x: number; readonly y: number; readonly angle: number },
): Ship {
  return {
    ...createShip(next.x, next.y, STILL),
    angle: next.angle,
    lastX: last.x,
    lastY: last.y,
    lastAngle: last.angle,
  };
}

describe("a field frame", () => {
  it("reads the rules' field as it is", () => {
    expectTypeOf<Field>().toExtend<FieldView>();
  });

  it("reads the rules' event log as it is", () => {
    expectTypeOf<FieldEventLog>().toExtend<EventsView>();
  });
});

describe("wrappedBetween", () => {
  it("draws a thing between its last place and its next as lerp() does, away from the wrap", () => {
    expect(drawnAt({ lastX: 2, lastY: 6, x: 4, y: 10 }, 0.25)).toEqual({
      x: 2.5,
      y: 7,
    });
  });

  it.each([
    [0.25, 9.75],
    [0.75, 0.25],
  ])(
    "draws a thing a step took across the right edge %s of the way the short way, at %s",
    (alpha, at) => {
      expect(drawnAt({ lastX: 9.5, lastY: 5, x: 0.5, y: 5 }, alpha).x).toBe(at);
    },
  );

  it("draws a thing a step took across the bottom edge the short way, by the field's height", () => {
    expect(drawnAt({ lastX: 5, lastY: 19.5, x: 5, y: 0.5 }, 0.25).y).toBe(
      19.75,
    );
  });

  it("writes into the record it is given", () => {
    const into = { x: 0, y: 0 };

    const written = wrappedBetween(
      { lastX: 1, lastY: 1, x: 2, y: 2 },
      0.5,
      TORUS,
      into,
    );

    expect(written).toBe(into);
  });
});

describe("angleBetween", () => {
  it("turns a thing between its last angle and its next", () => {
    expect(angleBetween(1, 2, 0.25)).toBe(1.25);
  });

  it("turns a thing whose angle went round past a whole turn the shorter way", () => {
    // From just short of a whole turn to just past none: a turn of 0.2.
    expect(angleBetween(2 * Math.PI - 0.1, 0.1, 0.5)).toBeCloseTo(
      2 * Math.PI,
      9,
    );
  });
});

describe("shipAt", () => {
  it("draws the ship between its last place and turn and its next, the short way across the wrap", () => {
    const ship = shipFrom(
      { x: 9.5, y: 10, angle: 1 },
      { x: 0.5, y: 12, angle: 2 },
    );

    const drawn = shipAt({ ship, torus: TORUS }, 0.25, {
      x: 0,
      y: 0,
      angle: 0,
    });

    expect(drawn).toEqual({ x: 9.75, y: 10.5, angle: 1.25 });
  });

  it("writes into the record it is given", () => {
    const ship = createShip(5, 5, STILL);
    const into = { x: 0, y: 0, angle: 0 };

    expect(shipAt({ ship, torus: TORUS }, 0.5, into)).toBe(into);
  });

  it("draws no ship between one ship and the next", () => {
    expect(
      shipAt({ ship: null, torus: TORUS }, 0.5, { x: 0, y: 0, angle: 0 }),
    ).toBeNull();
  });
});
