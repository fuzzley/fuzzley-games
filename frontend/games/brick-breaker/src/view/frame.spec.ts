import type { EventLog } from "../rules/events";
import type { Field } from "../rules/field";
import { type EventsView, type FieldView, between } from "./frame";

describe("a field frame", () => {
  it("reads the rules' field as it is", () => {
    expectTypeOf<Field>().toExtend<FieldView>();
  });

  it("reads the rules' event log as it is", () => {
    expectTypeOf<EventLog>().toExtend<EventsView>();
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
