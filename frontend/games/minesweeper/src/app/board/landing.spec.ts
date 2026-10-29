import { fieldFrom } from "../../testing/field_picture";
import { LANDING_SPREAD_MS, LANDING_STEP_MS, landings } from "./landing";

describe("landings", () => {
  it("lands a loss's mines and wrong flags a step later for each step out", () => {
    const before = fieldFrom(["*f*"]);
    const after = fieldFrom(["xf*"], { livesLeft: 0 });

    const landed = landings(after, before, 0);

    expect(landed).toEqual(
      new Map([
        [1, LANDING_STEP_MS],
        [2, 2 * LANDING_STEP_MS],
      ]),
    );
  });

  it("lands the flags a win lays, but not the player's own", () => {
    const before = fieldFrom(["F1.*"]);
    const after = fieldFrom(["F11F"]);

    const landed = landings(after, before, 2);

    expect(landed).toEqual(new Map([[3, LANDING_STEP_MS]]));
  });

  it("shrinks the steps on a large field, to reach its farthest square in time", () => {
    const before = fieldFrom([`*${".".repeat(19)}*`]);
    const after = fieldFrom([`x${".".repeat(19)}*`], { livesLeft: 0 });

    const landed = landings(after, before, 0);

    expect(landed).toEqual(new Map([[20, LANDING_SPREAD_MS]]));
  });
});
