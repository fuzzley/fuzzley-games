import TUNING_TS from "../rules/tuning.ts?raw";
import { fieldFrom } from "../testing/field_picture";
import {
  TUNED,
  TUNING_SLIDERS,
  type Tuning,
  type TuningNumber,
  fieldTuning,
  formatTuning,
  tuneField,
  tuningLines,
} from "./debug_tuning";

/** A tuning with every number away from `tuning.ts`'s. */
const TRIED: Tuning = {
  thrust: 31,
  topSpeed: 12.5,
  coastHalfLifeMs: 800,
  keyTurnRate: 420,
  headingTurnRate: 900,
  shotSpeed: 40,
  gunEveryMs: 95,
  carryShip: false,
  rockSpeed: 1.5,
};

describe("TUNING_SLIDERS", () => {
  it.each(TUNING_SLIDERS.map((slider) => [slider.name, slider] as const))(
    "start %s at tuning.ts's number, on a step of its range",
    (_, { id, least, most, step }) => {
      const steps = (TUNED[id] - least) / step;

      expect(TUNED[id]).toBeGreaterThanOrEqual(least);
      expect(TUNED[id]).toBeLessThanOrEqual(most);
      expect(steps).toBeCloseTo(Math.round(steps));
    },
  );
});

describe("formatTuning", () => {
  it.each<[TuningNumber, number, string]>([
    ["thrust", 24, "24 u/s²"],
    ["topSpeed", 15.5, "15.5 u/s"],
    ["coastHalfLifeMs", 1500, "1.5 s"],
    ["keyTurnRate", 300, "300°/s"],
    ["headingTurnRate", 600, "600°/s"],
    ["shotSpeed", 32, "32 u/s"],
    ["gunEveryMs", 140, "140 ms"],
    ["rockSpeed", 1.25, "×1.25"],
  ])("writes %s at %s as %s", (id, value, written) => {
    expect(formatTuning(id, value)).toBe(written);
  });
});

describe("tuningLines", () => {
  it("writes tuning.ts's own lines for its own numbers, so a paste changes only what was tuned", () => {
    const lines = tuningLines(TUNED).split("\n");

    expect(lines.filter((line) => !TUNING_TS.includes(line))).toEqual([]);
  });

  it("writes each number tuned in its line, and each size's speed scaled by the rocks'", () => {
    expect(tuningLines(TRIED)).toBe(
      [
        "export const THRUST = 31;",
        "export const TOP_SPEED = 12.5;",
        "export const COAST_HALF_LIFE_MS = 800;",
        "export const KEY_TURN_RATE = 420;",
        "export const HEADING_TURN_RATE = 900;",
        "export const SHOT_SPEED = 40;",
        "export const SHOTS_CARRY_SHIP = false;",
        "export const SHOT_EVERY_MS = 95;",
        "export const ROCK_SPEED: Readonly<Record<RockSize, Span>> = {",
        "  boulder: { least: 2.25, most: 3.75 },",
        "  large: { least: 3.75, most: 6 },",
        "  medium: { least: 6, most: 9 },",
        "  small: { least: 8.25, most: 12.75 },",
        "};",
      ].join("\n"),
    );
  });

  it("writes each size's speed scaled to four places, as a step of the rocks' speed leaves it", () => {
    const lines = tuningLines({ ...TUNED, rockSpeed: 1.05 });

    expect(lines).toContain("  boulder: { least: 1.575, most: 2.625 },");
  });

  it("writes a number to two places at most, as a slider's steps leave it", () => {
    const lines = tuningLines({ ...TUNED, topSpeed: 15.500000000000002 });

    expect(lines).toContain("export const TOP_SPEED = 15.5;");
  });
});

describe("fieldTuning", () => {
  it("gives the numbers as a field holds them: its flight, its gunnery and its rocks' speed", () => {
    expect(fieldTuning(TRIED)).toEqual({
      flight: {
        thrust: 31,
        topSpeed: 12.5,
        coastHalfLifeMs: 800,
        keyTurnRate: 420,
        headingTurnRate: 900,
      },
      gunnery: { shotSpeed: 40, gunEveryMs: 95, carryShip: false },
      rockSpeed: 1.5,
    });
  });
});

describe("tuneField", () => {
  it("tunes the field's flight and gunnery", () => {
    const field = fieldFrom(["^"]);
    const { flight, gunnery } = fieldTuning(TRIED);

    tuneField(field, TRIED);

    expect({ flight: field.flight, gunnery: field.gunnery }).toEqual({
      flight,
      gunnery,
    });
  });

  it("speeds the rocks in flight to the rocks' speed at once", () => {
    const field = fieldFrom(["L"]);
    const [rock] = field.rocks;
    if (!rock) throw new Error("No rock laid");
    rock.vx = 2;
    rock.vy = -1;

    tuneField(field, TRIED);

    expect({ vx: rock.vx, vy: rock.vy }).toEqual({ vx: 3, vy: -1.5 });
  });
});
