import { ELEMENT_RULES, WIND_RULE } from "../rules/elements/element_rules";
import { LEVELS } from "../rules/levels/levels";
import { SAVED_GAME_VERSION } from "../rules/run/saved_game";
import { type KeptRun, keptRun } from "./kept_run";
import { SCREENSHOT_API } from "./screenshot_api";

/** Three's company, level 1, on its deal 1, a move into its certificate. */
const KEPT: KeptRun = { level: 1, deal: 1, moves: [[34, 35]] };

describe("SCREENSHOT_API", () => {
  it("keeps a level in play among the game's levels, by its rules, as keptRun() does", () => {
    expect(SCREENSHOT_API.keptRun(KEPT)).toEqual(
      keptRun(LEVELS, { elements: ELEMENT_RULES, wind: WIND_RULE }, KEPT),
    );
  });

  it("keeps every level dealt on each of its deals", () => {
    const dealt = LEVELS.flatMap(({ number, data }) =>
      data.deals.map((deal) => ({ level: number, deal, moves: [] })),
    );

    expect(() => dealt.map((run) => SCREENSHOT_API.keptRun(run))).not.toThrow();
  });

  it("hands the scripts the version a level in play is kept under", () => {
    expect(SCREENSHOT_API.savedGameVersion).toBe(SAVED_GAME_VERSION);
  });
});
