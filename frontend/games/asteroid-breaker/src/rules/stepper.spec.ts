import { STEP_MS, createFieldClock, stepsIn } from "./stepper";

describe("createFieldClock", () => {
  it("keeps the field's step and its most a frame, with no time under way", () => {
    expect(createFieldClock()).toEqual({
      stepMs: 1000 / 120,
      maxStepsPerFrame: 12,
      carried: 0,
    });
  });
});

describe("stepsIn", () => {
  it.each([
    [2.4, 2],
    [2.6, 3],
  ])("counts %f steps' time as %i, to the nearest", (steps, counted) => {
    expect(stepsIn(STEP_MS * steps)).toBe(counted);
  });
});
