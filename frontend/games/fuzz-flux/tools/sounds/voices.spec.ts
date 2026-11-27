import { SR } from "@fz/dev/synth";
import { shaped, toward } from "./voices.mjs";

/** A second of a steady level of 1, to shape. */
const STEADY = new Float64Array(SR).fill(1);

/** Returns a shaped sound's level at a time, in seconds. */
function levelAt(x: Float64Array, t: number): number {
  return x[Math.round(t * SR)] ?? Number.NaN;
}

describe("shaped", () => {
  it("rises over its attack, bowed by its curve, holds, then falls to a third every decay", () => {
    const x = shaped(STEADY, {
      attack: 0.1,
      hold: 0.1,
      decay: 0.2,
      curve: 2,
    });

    expect({
      halfwayUp: levelAt(x, 0.05),
      held: levelAt(x, 0.15),
      oneDecayOn: levelAt(x, 0.4),
    }).toEqual({
      halfwayUp: expect.closeTo(0.25, 6) as unknown,
      held: 1,
      oneDecayOn: expect.closeTo(Math.exp(-1), 6) as unknown,
    });
  });

  it("rises in a straight line and falls at once, unless told to bow or hold", () => {
    const x = shaped(STEADY, { attack: 0.1, decay: 0.2 });

    expect({
      halfwayUp: levelAt(x, 0.05),
      oneDecayOn: levelAt(x, 0.3),
    }).toEqual({
      halfwayUp: expect.closeTo(0.5, 6) as unknown,
      oneDecayOn: expect.closeTo(Math.exp(-1), 6) as unknown,
    });
  });
});

describe("toward", () => {
  it("moves two-thirds of its way in its time, and two-thirds of what is left in as long again", () => {
    const settling = toward(400, 100, 0.05);

    expect([settling(0), settling(0.05), settling(0.1)]).toEqual([
      400,
      expect.closeTo(100 + 300 / Math.E, 6),
      expect.closeTo(100 + 300 / Math.E ** 2, 6),
    ]);
  });
});
