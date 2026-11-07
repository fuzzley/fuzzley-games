import { PICKUP_IDS } from "../../rules/catalog/pickups";
import { EFFECT_KINDS, type InEffect, lasts } from "../../rules/rocks/pickups";
import { stepsIn } from "../../rules/stepper";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import {
  TAG_INSET,
  TAG_RADIUS,
  TAG_SPACING,
  isTagged,
  tagX,
  tagY,
  timeLeft,
} from "./tags";

describe("timeLeft", () => {
  // Spread lasts 12 seconds.
  const SPREAD_STEPS = stepsIn(12_000);

  it.each([
    [0, 1],
    [SPREAD_STEPS / 4, 0.75],
    [SPREAD_STEPS, 0],
  ])("leaves, %i steps into Spread, %s of its time", (into, left) => {
    const effect: InEffect = { pickup: "spread", endsAt: 100 + SPREAD_STEPS };

    expect(timeLeft(effect, 100 + into)).toBe(left);
  });

  it("leaves all of the time of an effect that lasts until it is used", () => {
    expect(timeLeft({ pickup: "shield", endsAt: 0 }, 500)).toBe(1);
  });

  it("leaves none past an effect's end", () => {
    expect(timeLeft({ pickup: "spread", endsAt: 100 }, 200)).toBe(0);
  });

  it("leaves all of the time while no effect of the group is in play", () => {
    expect(timeLeft({ pickup: null, endsAt: 0 }, 500)).toBe(1);
  });
});

describe("isTagged", () => {
  it("tags each pickup whose effect lasts, and none that is over as it starts", () => {
    expect(PICKUP_IDS.filter(isTagged)).toEqual([
      "spread",
      "rapid",
      "shield",
      "lance",
      "magnet",
      "slow",
    ]);
  });
});

describe("a row of tags", () => {
  // As many tags as there are groups whose effects last can show at once.
  const MOST_TAGS = EFFECT_KINDS.filter(lasts).length;

  it("keeps the first tag's ring clear of the field's left and bottom edges", () => {
    expect(tagX(0) - TAG_RADIUS).toBeGreaterThan(0);
    expect(tagY(FIELD_SHORT_SIDE) + TAG_RADIUS).toBeLessThan(FIELD_SHORT_SIDE);
  });

  it("keeps the rings of tags side by side apart", () => {
    expect(tagX(1) - tagX(0)).toBeCloseTo(TAG_SPACING, 9);
    expect(TAG_SPACING).toBeGreaterThan(2 * TAG_RADIUS);
  });

  it("keeps a full row within a third of the narrowest field, clear of its middle", () => {
    expect(tagX(MOST_TAGS - 1) + TAG_RADIUS).toBeLessThan(FIELD_SHORT_SIDE / 3);
  });

  it("lies as far in from the bottom edge as the first tag from the left", () => {
    expect(FIELD_SHORT_SIDE - tagY(FIELD_SHORT_SIDE)).toBeCloseTo(tagX(0), 9);
    expect(tagX(0)).toBe(TAG_INSET);
  });
});
