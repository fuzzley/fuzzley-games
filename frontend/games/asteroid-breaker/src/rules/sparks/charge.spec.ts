import {
  KEEPER,
  fieldFrom,
  loggedOn,
  shipOf,
} from "../../testing/field_picture";
import type { Field } from "../field/field";
import { stepsIn } from "../stepper";
import {
  STATIC_DRAIN,
  STATIC_HOLD_MS,
  STATIC_MOST,
  STATIC_STEPS,
  STEP_S,
} from "../tuning";
import {
  FULL_STEP,
  TUNED_SPARKING,
  drainStatic,
  knockStaticDown,
  multiplierOf,
  raiseStatic,
  stepOf,
} from "./charge";

/** The steps static holds after a spark before it drains. */
const HOLD_STEPS = stepsIn(STATIC_HOLD_MS);

/** How much static drains in a step once it no longer holds. */
const DRAINED = STATIC_DRAIN * STEP_S;

/** A picture of the ship, the keeper beside it. */
const SHIP_PICTURE = [...KEEPER, "", ".........^"];

/** Returns a field of the ship and the keeper, its static at a level. */
function fieldAt(level: number): Field {
  return fieldFrom(SHIP_PICTURE, { charge: level });
}

/** Returns the steps static came to on a field, each rising or falling. */
function stepsLoggedOn(field: Field): { step: number; fell: boolean }[] {
  return loggedOn(field)
    .filter((event) => event.kind === "stepped")
    .map(({ step, fell }) => ({ step, fell }));
}

describe("stepOf", () => {
  it.each([
    [0, 0],
    [9.9, 0],
    [10, 1],
    [19.9, 1],
    [20, 2],
    [30, 3],
    [39.9, 3],
    [STATIC_MOST, FULL_STEP],
  ])("puts static at %f on step %i", (level, step) => {
    expect(stepOf(level, TUNED_SPARKING)).toBe(step);
  });

  it("puts full one step past the multiplier's last", () => {
    expect(FULL_STEP).toBe(STATIC_STEPS.length + 1);
  });
});

describe("multiplierOf", () => {
  it.each([
    [0, 1],
    [10, 2],
    [25, 3],
    [STATIC_MOST, 4],
  ])("scores static at %i %i times", (level, times) => {
    expect(multiplierOf(level)).toBe(times);
  });
});

describe("raiseStatic", () => {
  it("raises static by an amount, holding it from the step", () => {
    const field = fieldAt(5);
    field.steps = 300;

    raiseStatic(field, 1);

    expect(field.charge).toEqual({ level: 6, lastSparkAt: 300 });
  });

  it("logs static rising to a step at the ship", () => {
    const field = fieldAt(9);

    raiseStatic(field, 1);

    expect(stepsLoggedOn(field)).toEqual([{ step: 1, fell: false }]);
  });

  it("raises static no higher than its most, full", () => {
    const field = fieldAt(STATIC_MOST - 0.5);

    raiseStatic(field, 2);

    expect([field.charge.level, stepsLoggedOn(field)]).toEqual([
      STATIC_MOST,
      [{ step: FULL_STEP, fell: false }],
    ]);
  });
});

describe("drainStatic", () => {
  it("holds static until its hold since the last spark is past", () => {
    const field = fieldAt(15);
    field.charge.lastSparkAt = 100;
    field.steps = 100 + HOLD_STEPS;

    drainStatic(field);

    expect(field.charge.level).toBe(15);
  });

  it("drains static a step's worth once its hold is past", () => {
    const field = fieldAt(15);
    field.charge.lastSparkAt = 100;
    field.steps = 101 + HOLD_STEPS;

    drainStatic(field);

    expect(field.charge.level).toBeCloseTo(15 - DRAINED);
  });

  it("drains static no lower than nothing", () => {
    const field = fieldAt(DRAINED / 2);
    field.steps = HOLD_STEPS + 1;

    drainStatic(field);

    expect(field.charge.level).toBe(0);
  });

  it("leaves no static as it is, logging nothing", () => {
    const field = fieldAt(0);
    field.steps = HOLD_STEPS + 1;

    drainStatic(field);

    expect([field.charge.level, stepsLoggedOn(field)]).toEqual([0, []]);
  });

  it("logs static falling to the step below at the ship as it drains past a step's foot", () => {
    const field = fieldAt(10);
    field.steps = HOLD_STEPS + 1;
    const { x, y } = shipOf(field);

    drainStatic(field);

    expect(loggedOn(field)).toEqual([
      expect.objectContaining({ kind: "stepped", x, y, step: 0, fell: true }),
    ]);
  });

  it("logs nothing as it drains within a step", () => {
    const field = fieldAt(15);
    field.steps = HOLD_STEPS + 1;

    drainStatic(field);

    expect(stepsLoggedOn(field)).toEqual([]);
  });

  it("logs nothing with no ship, as the run is over", () => {
    const field = fieldFrom(KEEPER, { charge: 10 });
    field.steps = HOLD_STEPS + 1;

    drainStatic(field);

    expect([field.charge.level < 10, stepsLoggedOn(field)]).toEqual([true, []]);
  });
});

describe("how static works, as the field's sparking says", () => {
  it("drains static as fast as the field's sparking says", () => {
    const field = fieldAt(15);
    field.sparking = { ...TUNED_SPARKING, drain: 6 };
    field.steps = HOLD_STEPS + 1;

    drainStatic(field);

    expect(field.charge.level).toBeCloseTo(15 - 6 * STEP_S);
  });

  it("fills static at the most the field's sparking holds", () => {
    const sparking = { ...TUNED_SPARKING, most: 32 };

    expect([stepOf(32, sparking), stepOf(31, sparking)]).toEqual([
      FULL_STEP,
      3,
    ]);
  });

  it("knocks full static, at the field's most, to the multiplier's last step", () => {
    const field = fieldAt(32);
    field.sparking = { ...TUNED_SPARKING, most: 32 };

    knockStaticDown(field);

    expect(field.charge.level).toBe(STATIC_STEPS[0].from);
  });
});

describe("knockStaticDown", () => {
  it.each([
    ["from full to the multiplier's last step", STATIC_MOST, 30, 3],
    ["from within a step to the foot of the one below", 25, 10, 1],
    ["from a step's foot to the foot of the one below", 20, 10, 1],
    ["from the multiplier's first step to nothing", 12, 0, 0],
  ])("knocks static %s", (_, level, after, step) => {
    const field = fieldAt(level);

    knockStaticDown(field);

    expect([field.charge.level, stepsLoggedOn(field)]).toEqual([
      after,
      [{ step, fell: true }],
    ]);
  });

  it("holds static at the foot it was knocked to as long as after a spark, then drains it", () => {
    const field = fieldAt(25);
    field.steps = 1000;
    knockStaticDown(field);

    field.steps += HOLD_STEPS;
    drainStatic(field);
    const held = field.charge.level;
    field.steps += 1;
    drainStatic(field);

    expect([held, field.charge.level]).toEqual([10, 10 - DRAINED]);
  });

  it("knocks static below the multiplier's first step to nothing, logging nothing, as it stays on its step", () => {
    const field = fieldAt(5);

    knockStaticDown(field);

    expect([field.charge.level, stepsLoggedOn(field)]).toEqual([0, []]);
  });
});
