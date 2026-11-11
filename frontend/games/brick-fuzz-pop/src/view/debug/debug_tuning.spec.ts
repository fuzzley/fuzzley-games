import { RULES } from "../../rules/round/round";
import TUNING_TS from "../../rules/tuning.ts?raw";
import { BORED, GUIDE_PAST_TURN } from "../../rules/tuning";
import ROUND_PLAY_TS from "../round_play.ts?raw";
import { FLIGHT_PACE } from "../round_play";
import {
  TUNED_NUMBERS,
  TUNING_SLIDERS,
  type TunedNumber,
  type TunedNumbers,
  formatTuning,
  paceOf,
  rulesOf,
  staleCertificates,
  tuningLines,
} from "./debug_tuning";

/** A tuning with every number away from the game's own. */
const TRIED: TunedNumbers = {
  normalPace: 18,
  fastPace: 30,
  fastForward: 6.5,
  longFlightMs: 5500,
  longFlightSpeedUp: 2.75,
  guidePastTurn: 4,
  bored: 85,
};

/** Returns the lines of a tuning written under a file's comment, up to the next file's; throws if no comment names the file. */
function linesUnder(lines: string, file: string): readonly string[] {
  const all = lines.split("\n");
  const from = all.indexOf(`// ${file}`) + 1;
  if (from === 0) throw new Error(`No lines are written under ${file}`);
  const to = all.findIndex((line, at) => at >= from && line.startsWith("//"));
  return all.slice(from, to === -1 ? undefined : to);
}

describe("TUNED_NUMBERS", () => {
  it("are the numbers the game ships: the flight's pace, the guide's length and the rules' boredom", () => {
    expect(TUNED_NUMBERS).toEqual({
      normalPace: FLIGHT_PACE.unitsPerSecond.normal,
      fastPace: FLIGHT_PACE.unitsPerSecond.fast,
      fastForward: FLIGHT_PACE.fastForward,
      longFlightMs: FLIGHT_PACE.longFlightMs,
      longFlightSpeedUp: FLIGHT_PACE.longFlightSpeedUp,
      guidePastTurn: GUIDE_PAST_TURN,
      bored: BORED,
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
});

describe("formatTuning", () => {
  it.each<[TunedNumber, number, string]>([
    ["normalPace", 14, "14 u/s"],
    ["fastPace", 22.5, "22.5 u/s"],
    ["fastForward", 4, "×4"],
    ["longFlightMs", 8500, "8.5 s"],
    ["longFlightSpeedUp", 1.75, "×1.75"],
    ["guidePastTurn", 1.5, "1.5 units"],
    ["bored", 60, "60 units"],
  ])("writes %s at %s as %s", (id, value, written) => {
    expect(formatTuning(id, value)).toBe(written);
  });
});

describe("tuningLines", () => {
  it("writes round_play.ts's own lines for the game's own pace, so a paste changes only what was tuned", () => {
    const lines = linesUnder(
      tuningLines(TUNED_NUMBERS),
      "src/view/round_play.ts",
    );

    expect(lines.filter((line) => !ROUND_PLAY_TS.includes(line))).toEqual([]);
  });

  it("writes tuning.ts's own lines for the game's own guide and boredom", () => {
    const lines = linesUnder(tuningLines(TUNED_NUMBERS), "src/rules/tuning.ts");

    expect(lines.filter((line) => !TUNING_TS.includes(line))).toEqual([]);
  });

  it("writes each number tuned in its line, under the file it lives in", () => {
    expect(tuningLines(TRIED)).toBe(
      [
        "// src/view/round_play.ts",
        "export const FLIGHT_PACE: FlightPace = {",
        "  unitsPerSecond: { normal: 18, fast: 30 },",
        "  fastForward: 6.5,",
        "  longFlightMs: 5500,",
        "  longFlightSpeedUp: 2.75,",
        "};",
        "// src/rules/tuning.ts",
        "export const BORED = 85;",
        "export const GUIDE_PAST_TURN = 4;",
      ].join("\n"),
    );
  });

  it("writes a number to two places at most, as a slider's steps leave it", () => {
    const lines = tuningLines({ ...TUNED_NUMBERS, fastForward: 2.3000000004 });

    expect(lines).toContain("  fastForward: 2.3,");
  });
});

describe("paceOf", () => {
  it("is FLIGHT_PACE at the game's own numbers", () => {
    expect(paceOf(TUNED_NUMBERS)).toEqual(FLIGHT_PACE);
  });

  it("gives each speed's pace, fast-forward and the long flight's speed-up as tuned", () => {
    expect(paceOf(TRIED)).toEqual({
      unitsPerSecond: { normal: 18, fast: 30 },
      fastForward: 6.5,
      longFlightMs: 5500,
      longFlightSpeedUp: 2.75,
    });
  });
});

describe("rulesOf", () => {
  it("is RULES at the game's own numbers", () => {
    expect(rulesOf(TUNED_NUMBERS)).toEqual(RULES);
  });

  it("gives the boredom as tuned", () => {
    expect(rulesOf(TRIED)).toEqual({ bored: 85 });
  });
});

describe("staleCertificates", () => {
  it("leaves the certificates sound at the game's own numbers", () => {
    expect(staleCertificates(TUNED_NUMBERS)).toBe(false);
  });

  it("leaves them stale once the boredom moves, as the rules read it", () => {
    expect(staleCertificates({ ...TUNED_NUMBERS, bored: 65 })).toBe(true);
  });

  it("leaves them sound as the flight's pace moves, which only plays a round back", () => {
    expect(staleCertificates({ ...TUNED_NUMBERS, normalPace: 18 })).toBe(false);
  });

  it("leaves them sound as the guide's length moves, which shows a shot and plays none", () => {
    expect(staleCertificates({ ...TUNED_NUMBERS, guidePastTurn: 4 })).toBe(
      false,
    );
  });
});
