import { ELEMENT_RULES, WIND_RULE } from "../src/rules/elements/element_rules";
import { LEVELS } from "../src/rules/levels/levels";
import { SAVED_GAME_VERSION, readSavedGame } from "../src/rules/run/saved_game";
import type { ScriptRun } from "../src/testing/script_api";
import { loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** Three's company, level 1, on its deal 1, a move into its certificate. */
const RUN: ScriptRun = { level: 1, deal: 1, moves: [[34, 35]] };

describe("storedRun", () => {
  it("stores the level kept, stamped with the version the shell takes it up under, which the rules take up", async () => {
    const stored = storedRun(await loadScreenshotApi(), RUN);

    const kept = JSON.parse(stored) as Record<string, unknown>;
    const rules = { elements: ELEMENT_RULES, wind: WIND_RULE };
    expect({
      version: kept["version"],
      moves: readSavedGame(kept, LEVELS, rules)?.moves,
    }).toEqual({ version: SAVED_GAME_VERSION, moves: [{ from: 34, to: 35 }] });
  });

  it("stores the level as the rules keep it", async () => {
    const api = await loadScreenshotApi();

    const stored = storedRun(api, RUN);

    expect(JSON.parse(stored)).toEqual({
      version: SAVED_GAME_VERSION,
      ...api.keptRun(RUN),
    });
  });
});
