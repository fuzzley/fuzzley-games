import { itemAt } from "@fz/core/records";
import { ART_SCALE } from "../../testing/art_frames";
import { ringLine, ringRadius } from "../effects/flourishes";
import { RING_RUNGS } from "./frame_names";
import { onLadder, ringRung, rungRadius, rungRatio } from "./ring_ladder";

/** How far the ladder reaches, in squares: a ring that spreads no further is drawn from its frames. */
const REACH = 1;

/** The ladder's foot, its thinnest rung. */
const FOOT = itemAt(RING_RUNGS, RING_RUNGS.length - 1);

/** How many times as wide for its radius each rung's line is as the rung's below. */
const STEP = rungRatio(0) / rungRatio(1);

/** Each moment of a ring's spreading a spec reads, a hundredth of it apart. */
const MOMENTS = Array.from({ length: 101 }, (_, index) => index / 100);

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

describe("onLadder", () => {
  it("draws a ring from the ladder's frames that spreads as far as the ladder reaches, and strokes one that spreads further", () => {
    expect([onLadder(REACH), onLadder(REACH + 0.01)]).toEqual([true, false]);
  });

  it("draws a ring from the ladder's frames that stays as wide as every ring starts, and strokes one that shrinks from it", () => {
    expect([onLadder(ringRadius(0, 1)), onLadder(0.2)]).toEqual([true, false]);
  });
});

describe("ringRung", () => {
  it("draws a ring as it starts from the top rung", () => {
    expect(ringRung(0, 0.75)).toBe(0);
  });

  it("draws a ring that spreads as far as the ladder reaches, as it ends, from the foot", () => {
    expect(ringRung(1, REACH)).toBe(FOOT);
  });

  it.each([0.25, 0.5, 0.75, 0.9, REACH])(
    "draws a ring spreading to %f squares, at every moment, from a rung whose line is within half a step as wide for its radius as the ring's",
    (radius) => {
      const misses = MOMENTS.map((done) => {
        const ratio = ringLine(done) / ringRadius(done, radius);
        return Math.abs(Math.log(rungRatio(ringRung(done, radius)) / ratio));
      });

      expect(Math.max(...misses)).toBeLessThanOrEqual(Math.log(STEP) / 2);
    },
  );

  it.each([0.25, 0.5, 0.75, 0.9, REACH])(
    "draws a ring spreading to %f squares, at every moment, from a rung whose frame reaches as far across as the ring at least, so it is only ever scaled down",
    (radius) => {
      const reaches = MOMENTS.map(
        (done) =>
          rungRadius(ringRung(done, radius), ART_SCALE) >=
          ringRadius(done, radius),
      );

      expect(reaches).not.toContain(false);
    },
  );
});
