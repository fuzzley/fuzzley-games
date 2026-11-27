import { keysOf } from "@fz/core/records";
import FEEL_TS from "../timeline/feel.ts?raw";
import { FEEL, type FeelTuning } from "../timeline/feel";
import { TUNING_SLIDERS, formatTuning, tuningLines } from "./tuning_menu";

/** Returns the slider of a number of the feel. */
function sliderOf(id: keyof FeelTuning): (typeof TUNING_SLIDERS)[number] {
  const slider = TUNING_SLIDERS.find((each) => each.id === id);
  if (slider === undefined) {
    throw new Error(`No slider tunes ${id}.`);
  }
  return slider;
}

describe("TUNING_SLIDERS", () => {
  it("offers a slider for each number of the feel, once, in its order", () => {
    expect(TUNING_SLIDERS.map(({ id }) => id)).toEqual(keysOf(FEEL));
  });

  it("names each slider in words of its own", () => {
    const names = TUNING_SLIDERS.map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((name) => !/^[A-Z2][\w ',:-]+$/.test(name))).toEqual(
      [],
    );
  });

  it.each<[keyof FeelTuning, string]>([
    ["pickUpMs", "Pick up: time"],
    ["refusedReach", "Refused swap: reach"],
    ["fallWaitMs", "Wait before the fall"],
    ["laneGapMs", "Columns and stacks: a column"],
    ["shakeTwoPuffersPx", "Shake: 2 puffers"],
  ])("names %s as the design's moment: %s", (id, name) => {
    expect(sliderOf(id).name).toBe(name);
  });

  it.each(TUNING_SLIDERS.map((slider) => [slider.id, slider] as const))(
    "runs %s from a step above nothing, past the design's number, to three times it at the most",
    (id, { least, most, step }) => {
      expect(least).toBe(step);
      expect(FEEL[id]).toBeLessThanOrEqual(most);
      expect(most).toBeLessThanOrEqual(3 * FEEL[id] + step / 2);
    },
  );

  it.each<[keyof FeelTuning, number]>([
    ["pickUpMs", 360],
    ["shakeMadePx", 7.5],
    ["hintHops", 6],
    ["lessMotionFluff", 0.75],
    ["refusedReach", 1],
    ["runInFadeFrom", 1],
    ["handGoesFrom", 1],
    ["handOpacity", 1],
    ["chordThirdVolume", 1],
  ])("runs %s to %d", (id, most) => {
    expect(sliderOf(id).most).toBe(most);
  });

  // The refused swap's reach, a third of the way, lies on no step.
  it.each(
    TUNING_SLIDERS.filter(({ id }) => id !== "refusedReach").map(
      (slider) => [slider.id, slider] as const,
    ),
  )(
    "starts %s at the design's number, on one of its steps",
    (id, { least, step }) => {
      const steps = (FEEL[id] - least) / step;

      expect(steps).toBeCloseTo(Math.round(steps), 6);
    },
  );

  it.each<[keyof FeelTuning, number]>([
    ["pickUpMs", 1],
    ["hintWaitMs", 100],
    ["pickUpScale", 0.01],
    ["pufferBreath", 0.001],
    ["shakeTwoPuffersPx", 0.1],
    ["hintHops", 1],
    ["mostZaps", 1],
    ["mostLooseBits", 10],
  ])("steps %s by %d", (id, step) => {
    expect(sliderOf(id).step).toBe(step);
  });
});

describe("formatTuning", () => {
  it.each<[keyof FeelTuning, number, string]>([
    ["pickUpMs", 120, "120 ms"],
    ["shakeMadePx", 2.5, "2.5 px"],
    ["swipeSquares", 0.4, "0.4 squares"],
    ["pickUpScale", 1.14, "1.14"],
    ["refusedReach", 1 / 3, "0.33"],
    ["hintHops", 2, "2"],
  ])("writes %s at %d as %s", (id, value, written) => {
    expect(formatTuning(id, value)).toBe(written);
  });
});

describe("tuningLines", () => {
  it("says no number has moved, under the file's comment, at the design's feel", () => {
    expect(tuningLines(FEEL)).toBe(
      "// src/view/timeline/feel.ts, FEEL: no number moved off the design's",
    );
  });

  it("writes each number moved off the design's as `FEEL` writes it, in its order, under the file's comment", () => {
    expect(tuningLines({ ...FEEL, hopScale: 1.5, pickUpMs: 130.0000001 })).toBe(
      [
        "// src/view/timeline/feel.ts, FEEL",
        "  pickUpMs: 130,",
        "  hopScale: 1.5,",
      ].join("\n"),
    );
  });

  it("says no number has moved where one has moved less than its slider shows", () => {
    expect(tuningLines({ ...FEEL, pickUpMs: 120.0000001 })).toBe(
      tuningLines(FEEL),
    );
  });

  it("finds a line of `FEEL` for each number to paste over", () => {
    expect(
      keysOf(FEEL).filter((id) => !FEEL_TS.includes(`\n  ${id}: `)),
    ).toEqual([]);
  });
});
