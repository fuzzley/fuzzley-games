import type { FieldEventLog } from "../rules/events";
import type { Field } from "../rules/field";
import {
  type EventsView,
  type FieldView,
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
