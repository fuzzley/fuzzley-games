import { formatPoints } from "@fz/core/format";
import { LEVELS } from "../src/rules/levels/levels";
import { SAVED_GAME_VERSION, restoreGame } from "../src/rules/run/saved_game";
import { RUN, loadScreenshotApi, shownRun } from "./capture-screenshots.mjs";

describe("shownRun", () => {
  it("stamps the run kept with the version the shell takes it up under, paused on its level", async () => {
    const shown = shownRun(await loadScreenshotApi());

    const stored = JSON.parse(shown.stored) as Record<string, unknown>;
    const takenUp = restoreGame(stored, LEVELS, 2);
    expect({
      version: stored["version"],
      level: takenUp?.run.level,
      outcome: takenUp?.run.outcome,
    }).toEqual({
      version: SAVED_GAME_VERSION,
      level: RUN.level,
      outcome: "paused",
    });
  });

  it("writes the run's score as the game writes points", async () => {
    const shown = shownRun(await loadScreenshotApi());

    const stored = JSON.parse(shown.stored) as { score: number };
    expect(shown.score).toBe(formatPoints(stored.score));
  });
});
