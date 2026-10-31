import {
  eventsOf,
  fieldFrom,
  stepTimes,
  throwBall,
} from "../testing/field_picture";
import { fireBolts } from "./bolts";
import { catchCapsule } from "./capsules";
import type { Field } from "./field";
import { cellIndex } from "./grid";
import { paddleTopOf } from "./paddle";
import { stepsIn } from "./stepper";
import {
  BOLT_GAP_MS,
  BOLT_INSET,
  BOLT_SPEED,
  FIELD_HEIGHT,
  PADDLE_TOP,
  STEP_S,
  TALLEST_FIELD,
} from "./tuning";

/** The steps a bolt takes to rise from the paddle to the top wall. */
const TO_TOP = Math.ceil(PADDLE_TOP / (BOLT_SPEED * STEP_S)) + 1;

/**
 * Returns a field in play with a laser in effect, from rows of bricks, a
 * height tall, its ball rising by the right wall; its bolts rise in the
 * sixth column and the eighth, from 11.4 and 14.6 across.
 */
function laserField(rows: readonly string[], height = FIELD_HEIGHT): Field {
  const field = fieldFrom(
    [
      ...rows,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "o",
    ].slice(0, 16),
    { height },
  );
  catchCapsule(field, "laser", 0, 0);
  throwBall(field, 25, 20, 0);
  return field;
}

/** Returns where each bolt in flight is, across and down. */
function boltsOf(field: Field): [number, number][] {
  return field.bolts
    .filter((bolt) => bolt.live)
    .map((bolt) => [bolt.x, bolt.y]);
}

/** Returns whether the brick in a cell is broken. */
function isBroken(
  field: Field,
  column: number,
  row: number,
): boolean | undefined {
  return field.bricks[cellIndex(column, row)]?.broken;
}

describe("fireBolts", () => {
  it("fires a bolt from each end of the paddle", () => {
    const field = laserField([]);

    fireBolts(field);

    expect({ bolts: boltsOf(field), events: eventsOf(field) }).toEqual({
      bolts: [
        [11 + BOLT_INSET, PADDLE_TOP],
        [15 - BOLT_INSET, PADDLE_TOP],
      ],
      events: ["caught", "fired"],
    });
  });

  it("fires from the paddle's top on a taller field", () => {
    const field = laserField([], TALLEST_FIELD);

    fireBolts(field);

    expect(boltsOf(field).map(([, y]) => y)).toEqual([
      paddleTopOf(TALLEST_FIELD),
      paddleTopOf(TALLEST_FIELD),
    ]);
  });

  it("fires nothing without a laser", () => {
    const field = laserField([]);
    field.mode = null;

    fireBolts(field);

    expect(boltsOf(field)).toEqual([]);
  });

  it("fires nothing before the ball is served", () => {
    const field = fieldFrom(["o"]);
    catchCapsule(field, "laser", 0, 0);

    fireBolts(field);

    expect(boltsOf(field)).toEqual([]);
  });

  it("fires no second pair too soon after the first", () => {
    const field = laserField([]);
    fireBolts(field);
    stepTimes(field, stepsIn(BOLT_GAP_MS) - 1);

    fireBolts(field);

    expect(boltsOf(field)).toHaveLength(2);
  });

  it("fires again once the gap has gone by", () => {
    const field = laserField([]);
    fireBolts(field);
    stepTimes(field, stepsIn(BOLT_GAP_MS));

    fireBolts(field);

    expect(boltsOf(field)).toHaveLength(4);
  });
});

describe("a bolt", () => {
  it("rises at its speed", () => {
    const field = laserField([]);
    fireBolts(field);

    stepTimes(field, 1);

    expect(field.bolts[0]?.y).toBeCloseTo(PADDLE_TOP - BOLT_SPEED * STEP_S);
  });

  it("breaks the first brick above it, and stops", () => {
    const field = laserField([".....o", "", "", "", ".....o"]);
    fireBolts(field);

    stepTimes(field, TO_TOP);

    expect({
      lower: isBroken(field, 5, 4),
      upper: isBroken(field, 5, 0),
      bolts: boltsOf(field),
    }).toEqual({ lower: true, upper: false, bolts: [] });
  });

  it("stops at steel", () => {
    const field = laserField([".....o", "", "", "", ".....#"]);
    fireBolts(field);

    stepTimes(field, TO_TOP);

    expect({
      steel: isBroken(field, 5, 4),
      upper: isBroken(field, 5, 0),
    }).toEqual({ steel: false, upper: false });
  });

  it("stops at the top wall", () => {
    const field = laserField([]);
    fireBolts(field);

    stepTimes(field, TO_TOP);

    expect(boltsOf(field)).toEqual([]);
  });

  it("clears the level when it breaks the last brick the level needs", () => {
    const field = fieldFrom([".....o"]);
    catchCapsule(field, "laser", 0, 0);
    throwBall(field, 1, 20, 0);
    fireBolts(field);

    stepTimes(field, TO_TOP);

    expect(field.state).toBe("cleared");
  });

  it("goes as the last ball is lost", () => {
    const field = laserField([]);
    fireBolts(field);
    throwBall(field, 5, 29.5, 175);

    stepTimes(field, 10);

    expect(boltsOf(field)).toEqual([]);
  });
});
