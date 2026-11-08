import { formatPoints } from "@fz/core/format";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { NEW_SHIP_GUARD_MS } from "../rules/tuning";
import { WAVES } from "../rules/waves/waves";
import { type KeptRun, keptRun } from "./kept_run";
import { SCREENSHOT_API } from "./screenshot_api";

/** A run on Crowd, wave 9, a second before its first stray, on a field of 72 by 40. */
const KEPT: KeptRun = {
  wave: 9,
  speed: "normal",
  seed: 9,
  torus: { width: 72, height: 40 },
  strayInMs: 1000,
};

describe("SCREENSHOT_API", () => {
  it("keeps a run among the written waves as keptRun() does", () => {
    const kept = SCREENSHOT_API.keptRun(KEPT);

    expect(kept).toEqual(keptRun(WAVES, KEPT));
  });

  it("writes points as the game does", () => {
    expect(SCREENSHOT_API.formatPoints).toBe(formatPoints);
  });

  it("hands the script the new ship's guard and the version the run is kept under", () => {
    expect({
      guardMs: SCREENSHOT_API.newShipGuardMs,
      version: SCREENSHOT_API.savedGameVersion,
    }).toEqual({ guardMs: NEW_SHIP_GUARD_MS, version: SAVED_GAME_VERSION });
  });
});
