import { fieldFrom, stepTimes, throwBall } from "../testing/field_picture";
import type { FieldEventKind, FieldFrame } from "./frame";

describe("a field frame", () => {
  it("reads the rules' field, and its events, as they stand", () => {
    const field = fieldFrom(["o"]);
    throwBall(field, 1, 5, 0);
    stepTimes(field, 60);
    const frame: FieldFrame = { field, alpha: 0.5, events: field.events };

    const kinds: FieldEventKind[] = [];
    frame.events.forEachSince(0, (event) => kinds.push(event.kind));

    expect({ state: frame.field.state, kinds }).toEqual({
      state: "cleared",
      kinds: ["broken", "cleared"],
    });
  });
});
