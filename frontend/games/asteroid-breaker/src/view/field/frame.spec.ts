import type { FieldEventLog } from "../../rules/field/events";
import type { Field } from "../../rules/field/field";
import {
  type EventsView,
  type FieldView,
  angleBetween,
  between,
  betweenOnAxis,
} from "./frame";

describe("a field frame", () => {
  it("reads the rules' field as it is", () => {
    expectTypeOf<Field>().toExtend<FieldView>();
  });

  it("reads the rules' event log as it is", () => {
    expectTypeOf<FieldEventLog>().toExtend<EventsView>();
  });
});

describe("between", () => {
  it.each([
    [0, 2],
    [0.25, 2.5],
    [1, 4],
  ])(
    "draws a thing %s of the way from its last place to its next at %s",
    (alpha, at) => {
      expect(between(2, 4, alpha)).toBe(at);
    },
  );
});

describe("betweenOnAxis", () => {
  it("draws a thing between its last place and its next as between does, away from the wrap", () => {
    expect(betweenOnAxis(2, 4, 0.25, 10)).toBe(2.5);
  });

  it.each([
    [0.25, 9.75],
    [0.75, 0.25],
  ])(
    "draws a thing a step took across the edge %s of the way the short way, at %s",
    (alpha, at) => {
      expect(betweenOnAxis(9.5, 0.5, alpha, 10)).toBe(at);
    },
  );
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
