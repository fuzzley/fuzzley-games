import type { FieldEventLog } from "../../rules/field/events";
import type { Field } from "../../rules/field/field";
import type { FieldFrame, FieldView } from "./frame";

describe("a field frame", () => {
  it("reads the rules' field as it is", () => {
    expectTypeOf<Field>().toExtend<FieldView>();
  });

  it("reads the rules' event log as it is", () => {
    expectTypeOf<FieldEventLog>().toExtend<FieldFrame["events"]>();
  });
});
