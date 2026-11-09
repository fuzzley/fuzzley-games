import { formatPoints } from "@fz/core/format";
import { LEVELS } from "../rules/levels/levels";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { keptRun } from "./kept_run";
import { SCREENSHOT_API } from "./screenshot_api";
import type { ScreenshotRun } from "./script_api";

/** A run on Rocket, level 9, with a flame broken and a fin brick worn. */
const KEPT: ScreenshotRun = {
  level: 9,
  speed: "normal",
  seed: 9,
  playedMs: 20_000,
  broken: [[12, 4]],
  worn: [[11, 1]],
};

describe("SCREENSHOT_API", () => {
  it("keeps a run among the game's levels as keptRun() does", () => {
    const kept = SCREENSHOT_API.keptRun(KEPT);

    expect(kept).toEqual(keptRun(LEVELS, KEPT));
  });

  it("writes points as the game does", () => {
    expect(SCREENSHOT_API.formatPoints).toBe(formatPoints);
  });

  it("hands the script the version the run is kept under", () => {
    expect(SCREENSHOT_API.savedGameVersion).toBe(SAVED_GAME_VERSION);
  });
});
