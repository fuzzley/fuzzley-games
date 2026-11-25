import TUNING_TS from "../../rules/tuning.ts?raw";
import { FLIGHT_RULES } from "../../rules/tuning";
import PACE_TS from "../play/pace.ts?raw";
import { FLIGHT_PACE } from "../play/pace";
import {
  TUNED_NUMBERS,
  TUNING_SLIDERS,
  type TunedNumber,
  type TunedNumbers,
  formatTuning,
  staleCertificates,
  tunedPace,
  tunedRules,
  tuningLines,
} from "./debug_tuning";

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

describe("TUNED_NUMBERS", () => {
  it("are the numbers the game ships: the pace, the guide's length, the boredom, the floor bounce ladder and the hatches", () => {
    expect(TUNED_NUMBERS).toEqual({
      normal: 14,
      normal10: 17,
      normal25: 20,
      normal45: 24,
      fast: 22,
      fast10: 26,
      fast25: 30,
      fast45: 36,
      dash: FLIGHT_PACE.dash,
      fastForward: FLIGHT_PACE.fastForward,
      guidePast: FLIGHT_RULES.guidePast,
      bored: FLIGHT_RULES.bored,
      firstBounce: FLIGHT_RULES.firstBounce,
      bounceStep: FLIGHT_RULES.bounceStep,
      hatchHolds: FLIGHT_RULES.hatchHolds,
    });
  });
});

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

describe("tunedPace", () => {
  it("is FLIGHT_PACE at the game's own numbers", () => {
    expect(tunedPace(TUNED_NUMBERS)).toEqual(FLIGHT_PACE);
  });

  it("gives each setting's speeds, the dash and fast-forward as tuned", () => {
    expect(tunedPace(TRIED)).toEqual({
      speeds: { normal: [15, 18, 21, 25], fast: [23, 27, 31, 37] },
      dash: 2.5,
      fastForward: 6.5,
    });
  });
});

describe("tunedRules", () => {
  it("is FLIGHT_RULES at the game's own numbers", () => {
    expect(tunedRules(TUNED_NUMBERS)).toEqual(FLIGHT_RULES);
  });

  it("gives the guide's length, the boredom, the floor bounce ladder and the hatches as tuned, and the rest as the game's own", () => {
    expect(tunedRules(TRIED)).toEqual({
      ...FLIGHT_RULES,
      guidePast: 0.8,
      bored: 120,
      firstBounce: 12,
      bounceStep: 6,
      hatchHolds: 2,
    });
  });
});

describe("staleCertificates", () => {
  it("leaves the certificates sound at the game's own numbers", () => {
    expect(staleCertificates(TUNED_NUMBERS)).toBe(false);
  });

  it.each<TunedNumber>(["bored", "firstBounce", "bounceStep", "hatchHolds"])(
    "leaves them stale once %s moves, as a round's flight reads it",
    (id) => {
      expect(staleCertificates({ ...TUNED_NUMBERS, [id]: TRIED[id] })).toBe(
        true,
      );
    },
  );

  it.each<TunedNumber>([
    "normal",
    "fast45",
    "dash",
    "fastForward",
    "guidePast",
  ])(
    "leaves them sound as %s moves, which only plays a round back or shows one",
    (id) => {
      expect(staleCertificates({ ...TUNED_NUMBERS, [id]: TRIED[id] })).toBe(
        false,
      );
    },
  );
});
