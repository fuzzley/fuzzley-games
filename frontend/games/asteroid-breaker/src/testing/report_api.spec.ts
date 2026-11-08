import { SPEEDS } from "../rules/speed";
import { STEP_S } from "../rules/tuning";
import { WAVES, waveEntryOf } from "../rules/waves/waves";
import {
  AUTOPILOT_LIMIT,
  ENDLESS_PLAYED,
  NARROWEST,
  TALLEST,
  WIDEST,
  playWave,
} from "./autopilot";
import { REPORT_API } from "./report_api";

/** A play on the widest field, on its side, from seed 7, with nothing able to take the ship. */
const HOW = { seed: 7, torus: WIDEST, invulnerable: true };

describe("REPORT_API", () => {
  it("hands the report every written wave and Endless's the autopilot's spec plays", () => {
    expect({
      waves: REPORT_API.waves,
      endless: REPORT_API.endless,
    }).toEqual({ waves: WAVES, endless: ENDLESS_PLAYED });
  });

  it("plays at the speeds, by the step and within the limit the autopilot's spec does", () => {
    expect({
      speeds: REPORT_API.speeds,
      stepSeconds: REPORT_API.stepSeconds,
      limit: REPORT_API.limit,
    }).toEqual({ speeds: SPEEDS, stepSeconds: STEP_S, limit: AUTOPILOT_LIMIT });
  });

  it("names the narrowest field and the widest either way up as --field does", () => {
    expect(REPORT_API.fields).toEqual({
      narrow: NARROWEST,
      wide: WIDEST,
      tall: TALLEST,
    });
  });

  it("plays a written wave by its number as the autopilot plays it", () => {
    const played = REPORT_API.playWave(9, "normal", HOW);

    expect(played).toEqual(playWave(waveEntryOf(WAVES, 9), "normal", HOW));
  });

  it("plays Endless's first wave, 31, by its number as the autopilot's spec plays it", () => {
    const played = REPORT_API.playWave(31, "fast", HOW);

    expect([played]).toEqual(
      ENDLESS_PLAYED.slice(0, 1).map((entry) => playWave(entry, "fast", HOW)),
    );
  });
});
