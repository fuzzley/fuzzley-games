import { STEP_S } from "../../rules/tuning";
import { NEAR_SLIDE, Travel, flickerAt, nearSlide } from "./motion";

/** A flicker a spec reads: every ten seconds, the first a second in. */
const FLICKER = { every: 10, after: 1 };

/** Returns the field's steps in a number of seconds. */
function stepsIn(seconds: number): number {
  return Math.round(seconds / STEP_S);
}

/** A field a spec flies over. */
const TORUS = { width: 80, height: 40 };

describe("flickerAt", () => {
  it.each([
    ["before the field's first step, its still form", 0, 0],
    ["between flickers", 0.5, 0],
    ["as a flicker starts", 1, 0],
    ["halfway up its first blink", 1.025, 0.5],
    ["at the top of its first blink", 1.05, 1],
    ["at the bottom of its dip", 1.11, 0.25],
    ["at the top of its second blink", 1.16, 0.85],
    ["halfway through its fade", 1.26, 0.425],
    ["once it has faded", 1.36, 0],
    ["a while after", 5, 0],
    ["at the top of the next one's first blink", 11.05, 1],
  ])("shows a mark %s, to the field's step", (_name, seconds, shown) => {
    expect(flickerAt(FLICKER, stepsIn(seconds))).toBeCloseTo(shown, 1);
  });

  it("keeps the beat of its flickers before its first one too", () => {
    const early = { every: 10, after: 11 };

    expect(flickerAt(early, stepsIn(1.05))).toBeCloseTo(1);
  });
});

describe("Travel", () => {
  it("adds up the way the pod flies from where it is drawn to where it is next", () => {
    const travel = new Travel();

    travel.follow({ x: 10, y: 10 }, TORUS);
    travel.follow({ x: 13, y: 6 }, TORUS);
    travel.follow({ x: 15, y: 7 }, TORUS);

    expect([travel.x, travel.y]).toEqual([5, -3]);
  });

  it("follows the pod the shortest way across the wrap, never by its jump to the far edge", () => {
    const travel = new Travel();

    travel.follow({ x: 79, y: 1 }, TORUS);
    travel.follow({ x: 1, y: 39 }, TORUS);

    expect([travel.x, travel.y]).toEqual([2, -2]);
  });

  it("lets go of the pod between one ship and the next, so the next isn't taken to have flown from the last", () => {
    const travel = new Travel();
    travel.follow({ x: 10, y: 10 }, TORUS);
    travel.follow({ x: 12, y: 10 }, TORUS);

    travel.follow(null, TORUS);
    travel.follow({ x: 40, y: 20 }, TORUS);
    travel.follow({ x: 41, y: 20 }, TORUS);

    expect([travel.x, travel.y]).toEqual([3, 0]);
  });

  it("keeps how far the pod has flown once let go of", () => {
    const travel = new Travel();
    travel.follow({ x: 10, y: 10 }, TORUS);
    travel.follow({ x: 12, y: 11 }, TORUS);

    travel.lose();
    travel.follow({ x: 50, y: 30 }, TORUS);

    expect([travel.x, travel.y]).toEqual([2, 1]);
  });

  it("starts again from nothing", () => {
    const travel = new Travel();
    travel.follow({ x: 10, y: 10 }, TORUS);
    travel.follow({ x: 12, y: 11 }, TORUS);

    travel.reset();
    travel.follow({ x: 50, y: 30 }, TORUS);

    expect([travel.x, travel.y]).toEqual([0, 0]);
  });
});

describe("nearSlide", () => {
  it("slides the nearer stars against the pod's travel by a small share of it, in device pixels", () => {
    expect(nearSlide(-100, 10, 1000)).toBeCloseTo(100 * NEAR_SLIDE * 10);
  });

  it("wraps a slide against travel the other way into the field's span", () => {
    expect(nearSlide(100, 10, 1000)).toBeCloseTo(1000 - 100 * NEAR_SLIDE * 10);
  });

  it("wraps a slide past the field's span", () => {
    expect(nearSlide(-5000, 10, 1000)).toBeCloseTo(500);
  });

  it("slides by 3% of the travel at most", () => {
    expect(NEAR_SLIDE).toBeLessThanOrEqual(0.03);
  });

  it("leaves the stars where they lie for no travel", () => {
    expect(nearSlide(0, 10, 1000)).toBe(0);
  });
});
