import { formatPoints } from "@fz/core/format";
import { LEVELS } from "../rules/levels/levels";
import { describeShot } from "../rules/run/describe";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { type KeptRun, keptRun } from "./kept_run";
import { SCREENSHOT_API } from "./screenshot_api";

/** Hello, wall, level 1, on a field 11 deep, a shot let fly straight up, uncharged. */
const KEPT: KeptRun = { level: 1, depth: 11, shots: [[328, 0]] };

describe("SCREENSHOT_API", () => {
  it("keeps a run among the game's levels as keptRun() does", () => {
    expect(SCREENSHOT_API.keptRun(KEPT)).toEqual(keptRun(LEVELS, KEPT));
  });

  it("writes points as the game does", () => {
    expect(SCREENSHOT_API.formatPoints).toBe(formatPoints);
  });

  it("says a shot aimed at some degrees with some charge as the game says it", () => {
    expect(SCREENSHOT_API.shotWords(55, 3)).toBe(
      describeShot({ aim: 188, charge: 3 }),
    );
  });

  it("throws for degrees no aim has", () => {
    expect(() => SCREENSHOT_API.shotWords(5, 3)).toThrow(RangeError);
  });

  it("hands the scripts the version a run is kept under", () => {
    expect(SCREENSHOT_API.savedGameVersion).toBe(SAVED_GAME_VERSION);
  });
});
