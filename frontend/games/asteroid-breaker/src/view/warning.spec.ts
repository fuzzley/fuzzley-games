import type { Comet, Crossing } from "../rules/hazards";
import { stepsIn } from "../rules/stepper";
import type { Torus } from "../rules/torus";
import { COMET_WARNING_MS } from "../rules/tuning";
import { WARNING_INSET, warnedFor, warningAt } from "./warning";

const TORUS: Torus = { width: 72, height: 40 };

/** Returns a comet waiting at a place off the field, heading in. */
function waitingAt(x: number, y: number): Crossing {
  return { live: true, x, y, lastX: x, lastY: y, heading: 0 };
}

describe("warningAt", () => {
  it.each([
    ["left", -3, 20, WARNING_INSET, 20],
    ["right", 75, 20, 72 - WARNING_INSET, 20],
    ["top", 30, -3, 30, WARNING_INSET],
    ["bottom", 30, 43, 30, 40 - WARNING_INSET],
  ])(
    "warns of a comet beyond the %s edge just inside it, level with the comet",
    (_, x, y, warnedX, warnedY) => {
      const at = warningAt(waitingAt(x, y), TORUS, { x: 0, y: 0 });

      expect(at).toEqual({ x: warnedX, y: warnedY });
    },
  );

  it("writes the place into the record it is given", () => {
    const into = { x: 0, y: 0 };

    const at = warningAt(waitingAt(-3, 20), TORUS, into);

    expect(at).toBe(into);
  });
});

describe("warnedFor", () => {
  /** Returns a comet waiting off the field with so many steps of its warning left. */
  function warnedWith(warnSteps: number): Comet {
    return {
      ...waitingAt(-3, 20),
      warnSteps,
      smashedAt: [],
      smashes: 0,
    };
  }

  it.each([
    [stepsIn(COMET_WARNING_MS), 0],
    [stepsIn(COMET_WARNING_MS) - stepsIn(500), 0.5],
    [0, COMET_WARNING_MS / 1000],
  ])(
    "finds a comet with %i steps of its warning left warned of for %s s",
    (left, seconds) => {
      expect(warnedFor(warnedWith(left))).toBeCloseTo(seconds, 9);
    },
  );
});
