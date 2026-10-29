import type { EventLog } from "../rules/events";
import type { Field } from "../rules/field";
import type { EventsView, FieldView } from "./frame";

describe("a field frame", () => {
  it("reads the rules' field as it is", () => {
    expectTypeOf<Field>().toExtend<FieldView>();
  });

  it("reads the rules' event log as it is", () => {
    expectTypeOf<EventLog>().toExtend<EventsView>();
  });
});
