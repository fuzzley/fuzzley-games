import { DEPTHS } from "@fz/brick-wall/rules/field";
import { formatPoints } from "@fz/core/format";
import { LEVELS } from "../rules/levels/levels";
import { describeAim } from "../rules/run/describe";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { MARKS } from "./every_level";
import { type KeptRun, keptRun } from "./kept_run";
import { SCREENSHOT_API } from "./screenshot_api";

/** First bounce, level 1, on a field 11 deep, a shot let fly straight up: the layout check's run (`LAYOUT_RUN`), but for its score. */
const KEPT: KeptRun = { level: 1, depth: 11, shots: [328] };

describe("SCREENSHOT_API", () => {
  it("keeps a run among the game's levels, by their marks, as keptRun() does", () => {
    expect(SCREENSHOT_API.keptRun(KEPT)).toEqual(keptRun(LEVELS, MARKS, KEPT));
  });

  it("keeps a run begun at every level on every depth, its marks holding each a par", () => {
    const begun = LEVELS.flatMap(({ number }) =>
      DEPTHS.map((depth) => ({ level: number, depth, shots: [328] })),
    );

    expect(() => begun.map((run) => SCREENSHOT_API.keptRun(run))).not.toThrow();
  });

  it("writes points as the game does", () => {
    expect(SCREENSHOT_API.formatPoints).toBe(formatPoints);
  });

  it("says an aim as the game says it as the keys turn it", () => {
    expect(SCREENSHOT_API.aimWords(415)).toBe(describeAim(415));
  });

  it("hands the scripts the version a run is kept under", () => {
    expect(SCREENSHOT_API.savedGameVersion).toBe(SAVED_GAME_VERSION);
  });
});
