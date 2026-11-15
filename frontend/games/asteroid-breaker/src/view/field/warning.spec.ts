import type { Comet } from "../../rules/hazards/comets";
import type { Crossing } from "../../rules/hazards/crossing";
import { stepsIn } from "../../rules/stepper";
import type { Torus } from "../../rules/torus";
import { COMET_MARGIN, COMET_WARNING_MS } from "../../rules/tuning";
import {
  chevronLit,
  laneLength,
  tailShare,
  warnedFor,
  warningAt,
} from "./warning";

const TORUS: Torus = { width: 72, height: 40 };

/** Returns a comet waiting at a place off the field, heading a way. */
function waitingAt(x: number, y: number, heading = 0): Crossing {
  return { live: true, x, y, lastX: x, lastY: y, heading };
}

/** Returns a comet waiting off the field with so many steps of its warning left. */
function warnedWith(warnSteps: number): Comet {
  return {
    ...waitingAt(-3, 20),
    warnSteps,
    smashedAt: [],
    smashes: 0,
    pass: "spent",
  };
}

/** Returns a comet warned of for a time, in seconds, to the nearest step. */
function warnedForSeconds(seconds: number): Comet {
  return warnedWith(stepsIn(COMET_WARNING_MS) - stepsIn(seconds * 1000));
}

describe("warningAt", () => {
  it.each([
    ["left", -3, 20, 0, 0, 20],
    ["right", 75, 20, Math.PI, 72, 20],
    ["top", 30, -3, Math.PI / 2, 30, 0],
    ["bottom", 30, 43, (3 * Math.PI) / 2, 30, 40],
  ])(
    "warns of a comet beyond the %s edge on the edge, where it will come in straight across",
    (_, x, y, heading, warnedX, warnedY) => {
      const at = warningAt(waitingAt(x, y, heading), TORUS, { x: 0, y: 0 });

      expect([at.x, at.y]).toEqual([
        expect.closeTo(warnedX, 9),
        expect.closeTo(warnedY, 9),
      ]);
    },
  );

  it("warns of a comet coming in tilted where its way meets the edge, not level with it", () => {
    const at = warningAt(waitingAt(-3, 20, Math.atan2(1, 2)), TORUS, {
      x: 0,
      y: 0,
    });

    expect([at.x, at.y]).toEqual([0, expect.closeTo(21.5, 9)]);
  });

  it("writes the place into the record it is given", () => {
    const into = { x: 0, y: 0 };

    const at = warningAt(waitingAt(-3, 20), TORUS, into);

    expect(at).toBe(into);
  });
});

describe("laneLength", () => {
  it.each([
    ["straight across", { x: 0, y: 20 }, 0, 72],
    ["straight down", { x: 30, y: 0 }, Math.PI / 2, 40],
    ["back from the right edge", { x: 72, y: 10 }, Math.PI, 72],
    [
      "tilted, to the edge it meets first",
      { x: 0, y: 20 },
      Math.atan2(1, 2),
      Math.hypot(40, 20),
    ],
  ])("runs %s as far as the comet crosses", (_, from, heading, length) => {
    expect(laneLength(from, heading, TORUS)).toBeCloseTo(length, 9);
  });
});

describe("warnedFor", () => {
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

describe("chevronLit", () => {
  /** Returns how many times the lit chevron changes over a span of a warning, a step at a time. */
  function changesBetween(from: number, to: number): number {
    let changes = 0;
    let last = chevronLit(warnedForSeconds(from), true);
    for (
      let steps = stepsIn(from * 1000) + 1;
      steps <= stepsIn(to * 1000);
      steps++
    ) {
      const lit = chevronLit(
        warnedWith(stepsIn(COMET_WARNING_MS) - steps),
        true,
      );
      if (lit !== last) changes += 1;
      last = lit;
    }
    return changes;
  }

  it("lights the chevron nearest the edge as the warning starts", () => {
    expect(chevronLit(warnedForSeconds(0), true)).toBe(0);
  });

  it("lights each chevron in turn, from the edge in", () => {
    const lits = Array.from({ length: stepsIn(600) }, (_, step) =>
      chevronLit(warnedWith(stepsIn(COMET_WARNING_MS) - step), true),
    );

    expect([...new Set(lits)]).toEqual([0, 1, 2]);
  });

  it("lights them faster as the comet comes", () => {
    expect(changesBetween(1, 1.5)).toBeGreaterThan(changesBetween(0, 0.5));
  });

  it("flashes no chevron more than three times a second", () => {
    // Each is lit once in three changes.
    expect(changesBetween(0.5, 1.5) / 3).toBeLessThanOrEqual(3);
  });

  it("holds every chevron still where motion isn't welcome", () => {
    expect(chevronLit(warnedForSeconds(0.7), false)).toBeNull();
  });
});

describe("tailShare", () => {
  it.each([
    ["on the field", { x: 30, y: 20 }, 1],
    ["on its edge", { x: 0, y: 20 }, 1],
    ["halfway out to the margin", { x: -COMET_MARGIN / 2, y: 20 }, 0.5],
    ["at the margin", { x: 72 + COMET_MARGIN, y: 20 }, 0],
    [
      "past a corner by the margin",
      { x: -3 * (COMET_MARGIN / 5), y: -4 * (COMET_MARGIN / 5) },
      0,
    ],
  ])("shows a comet's tail drawn %s at %f", (_, at, share) => {
    expect(tailShare(at, TORUS)).toBeCloseTo(share, 9);
  });
});
