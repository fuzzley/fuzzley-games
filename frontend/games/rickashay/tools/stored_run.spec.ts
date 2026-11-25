import { DEPTHS } from "@fz/brick-wall/rules/field";
import { thirdsOf } from "@fz/brick-wall/rules/wall";
import { LEVELS } from "../src/rules/levels/levels";
import { SAVED_GAME_VERSION, restoreGame } from "../src/rules/run/saved_game";
import { MARKS } from "../src/testing/every_level";
import { LAYOUT_RUN, loadScreenshotApi, storedRun } from "./stored_run.mjs";

describe("storedRun", () => {
  it("stores the run kept, stamped with the version the shell takes it up under, paused", async () => {
    const { stored } = storedRun(await loadScreenshotApi(), LAYOUT_RUN);

    const kept = JSON.parse(stored) as Record<string, unknown>;
    expect({
      version: kept["version"],
      outcome: restoreGame(kept, LEVELS, 2, MARKS)?.run.outcome,
    }).toEqual({ version: SAVED_GAME_VERSION, outcome: "paused" });
  });

  it("hands back the run as the rules keep it", async () => {
    const api = await loadScreenshotApi();

    const { saved } = storedRun(api, LAYOUT_RUN);

    expect(saved).toEqual(api.keptRun(LAYOUT_RUN));
  });
});

describe("LAYOUT_RUN", () => {
  it("scores five figures, the longest the check holds the bar's figures to beside the game's name", async () => {
    const { saved } = storedRun(await loadScreenshotApi(), LAYOUT_RUN);

    expect(String(saved.score)).toHaveLength(5);
  });

  // So a page that dropped the run, laying its level out afresh, can't
  // stand the wall where the run kept it by chance.
  it("stands its wall under every row a level opens on, at any depth", async () => {
    const { saved } = storedRun(await loadScreenshotApi(), LAYOUT_RUN);
    const row = saved.start?.lowestRow ?? Number.POSITIVE_INFINITY;

    expect(DEPTHS.filter((depth) => thirdsOf(depth).opensOn <= row)).toEqual(
      [],
    );
  });
});
