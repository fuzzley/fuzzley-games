import type { InEffect } from "../rules/capsules";
import { stepsIn } from "../rules/stepper";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  NET_DEPTH,
  PADDLE_TOP,
} from "../rules/tuning";
import { TAG_RADIUS, TAG_SPACING, TAG_Y, firstTagX, timeLeft } from "./tags";

describe("timeLeft", () => {
  // Wide lasts 20 seconds.
  const WIDE_STEPS = stepsIn(20_000);

  it.each([
    [0, 1],
    [WIDE_STEPS / 4, 0.75],
    [WIDE_STEPS, 0],
  ])("leaves, %i steps into Wide, %s of its time", (into, left) => {
    const effect: InEffect = { capsule: "wide", endsAt: 100 + WIDE_STEPS };

    expect(timeLeft(effect, 100 + into)).toBe(left);
  });

  it("leaves all of the time of an effect that lasts until it is used", () => {
    expect(timeLeft({ capsule: "net", endsAt: 0 }, 500)).toBe(1);
  });

  it("leaves none past an effect's end", () => {
    expect(timeLeft({ capsule: "wide", endsAt: 100 }, 200)).toBe(0);
  });

  it("leaves all of the time while no effect of the group is in play", () => {
    expect(timeLeft({ capsule: null, endsAt: 0 }, 500)).toBe(1);
  });
});

describe("firstTagX", () => {
  it("centers a row of tags under the paddle", () => {
    expect(firstTagX(13, 3)).toBe(13 - TAG_SPACING);
  });

  it("keeps a row by the left wall inside it", () => {
    expect(firstTagX(0.5, 3)).toBe(TAG_RADIUS);
  });

  it("keeps a row by the right wall inside it", () => {
    expect(firstTagX(FIELD_WIDTH, 3)).toBeCloseTo(
      FIELD_WIDTH - TAG_RADIUS - 2 * TAG_SPACING,
    );
  });
});

describe("TAG_Y", () => {
  it("keeps the tags' rings clear of the net and on the field", () => {
    expect({
      belowNet: TAG_Y - TAG_RADIUS > PADDLE_TOP + NET_DEPTH,
      onField: TAG_Y + TAG_RADIUS < FIELD_HEIGHT,
    }).toEqual({ belowNet: true, onField: true });
  });
});
