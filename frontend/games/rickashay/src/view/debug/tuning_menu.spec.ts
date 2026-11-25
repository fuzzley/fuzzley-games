import TUNING_TS from "../../rules/tuning.ts?raw";
import { FLIGHT_RULES } from "../../rules/tuning";
import PACE_TS from "../play/pace.ts?raw";
import {
  TUNED_NUMBERS,
  type TunedNumber,
  type TunedNumbers,
} from "./debug_tuning";
import { TUNING_SLIDERS, formatTuning, tuningLines } from "./tuning_menu";

/** A tuning with every number away from the game's own. */
const TRIED: TunedNumbers = {
  normal: 15,
  normal10: 18,
  normal25: 21,
  normal45: 25,
  fast: 23,
  fast10: 27,
  fast25: 31,
  fast45: 37,
  dash: 2.5,
  fastForward: 6.5,
  guidePast: 0.8,
  bored: 120,
  firstBounce: 12,
  bounceStep: 6,
  hatchHolds: 2,
};

/** Returns the lines of a tuning written under a file's comment, up to the next file's; throws if no comment names the file. */
function linesUnder(lines: string, comment: string): readonly string[] {
  const all = lines.split("\n");
  const from = all.indexOf(`// ${comment}`) + 1;
  if (from === 0) throw new Error(`No lines are written under ${comment}`);
  const to = all.findIndex((line, at) => at >= from && line.startsWith("//"));
  return all.slice(from, to === -1 ? undefined : to);
}

describe("TUNING_SLIDERS", () => {
  it("offers a slider for each number, once", () => {
    expect(TUNING_SLIDERS.map((slider) => slider.id).sort()).toEqual(
      Object.keys(TUNED_NUMBERS).sort(),
    );
  });

  it.each(TUNING_SLIDERS.map((slider) => [slider.name, slider] as const))(
    "starts %s at the game's own number, on a step of its range",
    (_, { id, least, most, step }) => {
      const steps = (TUNED_NUMBERS[id] - least) / step;

      expect(TUNED_NUMBERS[id]).toBeGreaterThanOrEqual(least);
      expect(TUNED_NUMBERS[id]).toBeLessThanOrEqual(most);
      expect(steps).toBeCloseTo(Math.round(steps));
    },
  );

  it("runs each speed's slider from 4 to 60 units a second, a unit a step", () => {
    const speeds = TUNING_SLIDERS.filter(({ id }) =>
      /^(normal|fast)\d*$/.test(id),
    );

    expect({
      speeds: speeds.length,
      ranges: new Set(
        speeds.map(({ least, most, step }) => `${least}-${most} by ${step}`),
      ),
    }).toEqual({ speeds: 8, ranges: new Set(["4-60 by 1"]) });
  });

  it("runs the guide no farther past its last turn than the scene's pools draw it", () => {
    expect(
      TUNING_SLIDERS.find((slider) => slider.id === "guidePast")?.most,
    ).toBe(FLIGHT_RULES.guidePast);
  });
});

describe("formatTuning", () => {
  it.each<[TunedNumber, number, string]>([
    ["normal", 14, "14 u/s"],
    ["fast45", 36.5, "36.5 u/s"],
    ["dash", 3, "×3"],
    ["fastForward", 4.5, "×4.5"],
    ["guidePast", 1.5, "1.5 units"],
    ["bored", 60, "60 units"],
    ["firstBounce", 10, "rally 10"],
    ["bounceStep", 5, "+5"],
    ["hatchHolds", 1, "1 hold"],
    ["hatchHolds", 3, "3 holds"],
  ])("writes %s at %s as %s", (id, value, written) => {
    expect(formatTuning(id, value)).toBe(written);
  });
});

describe("tuningLines", () => {
  it("writes pace.ts's own lines for the game's own pace, so a paste changes only what was tuned", () => {
    const lines = linesUnder(
      tuningLines(TUNED_NUMBERS),
      "src/view/play/pace.ts, FLIGHT_PACE",
    );

    expect(lines.filter((line) => !PACE_TS.includes(line))).toEqual([]);
  });

  it("writes tuning.ts's own lines for the game's own rules", () => {
    const lines = linesUnder(
      tuningLines(TUNED_NUMBERS),
      "src/rules/tuning.ts, FLIGHT_RULES",
    );

    expect(lines.filter((line) => !TUNING_TS.includes(line))).toEqual([]);
  });

  it("writes each number tuned in its line, under the file it lives in", () => {
    expect(tuningLines(TRIED)).toBe(
      [
        "// src/view/play/pace.ts, FLIGHT_PACE",
        "  speeds: { normal: [15, 18, 21, 25], fast: [23, 27, 31, 37] },",
        "  dash: 2.5,",
        "  fastForward: 6.5,",
        "// src/rules/tuning.ts, FLIGHT_RULES",
        "  bored: 120,",
        "  firstBounce: 12,",
        "  bounceStep: 6,",
        "  hatchHolds: 2,",
        "  guidePast: 0.8,",
      ].join("\n"),
    );
  });

  it("writes a number to two places at most, as a slider's steps leave it", () => {
    const lines = tuningLines({ ...TUNED_NUMBERS, guidePast: 0.30000000004 });

    expect(lines).toContain("  guidePast: 0.3,");
  });
});
