import { itemAt } from "@fz/core/records";
import { ART_SCALE } from "../../testing/art_frames";
import { ringLine, ringRadius } from "../effects/flourishes";
import { RING_RUNGS } from "./frame_names";
import { rungRadius, rungRatio } from "./ring_ladder";

/** How far the ladder reaches, in squares: a ring that spreads no further is drawn from its frames. */
const REACH = 1;

/** The ladder's foot, its thinnest rung. */
const FOOT = itemAt(RING_RUNGS, RING_RUNGS.length - 1);

describe("rungRatio", () => {
  it("draws the top rung's line as wide for its radius as a ring's as it starts", () => {
    expect(rungRatio(0)).toBeCloseTo(ringLine(0) / ringRadius(0, 1), 9);
  });

  it("draws the foot's line as wide for its radius as a ring's that spreads as far as the ladder reaches, as it ends", () => {
    expect(rungRatio(FOOT)).toBeCloseTo(ringLine(1) / ringRadius(1, REACH), 9);
  });

  it("draws each rung's line thinner for its radius than the rung's above by one step", () => {
    const steps = RING_RUNGS.slice(1).map(
      (rung) => rungRatio(itemAt(RING_RUNGS, rung - 1)) / rungRatio(rung),
    );

    expect(Math.max(...steps) - Math.min(...steps)).toBeCloseTo(0, 9);
  });
});

describe("rungRadius", () => {
  it("draws the foot's ring as far across as the ladder reaches", () => {
    expect(rungRadius(FOOT, ART_SCALE)).toBe(REACH);
  });

  it("draws no rung's ring further across than the ladder reaches", () => {
    expect(
      Math.max(...RING_RUNGS.map((rung) => rungRadius(rung, ART_SCALE))),
    ).toBe(REACH);
  });

  it.each(RING_RUNGS)(
    "draws rung %i's ring as far across, in squares, at a square of 100 device pixels as at one of 144, and half as far at one of 288, so the atlas keeps to its budget",
    (rung) => {
      const at = (unit: number): number =>
        rungRadius(rung, { unit, pixelRatio: 3 });

      expect([at(100), at(288)]).toEqual([
        at(144),
        expect.closeTo(at(144) / 2, 9),
      ]);
    },
  );
});
