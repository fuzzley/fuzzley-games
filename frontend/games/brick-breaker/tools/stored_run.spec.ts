import { type Field, createField } from "../src/rules/field/field";
import { tallyOf } from "../src/rules/field/scoring";
import { LEVELS, parseLevel } from "../src/rules/levels/levels";
import { levelSeed } from "../src/rules/run/run";
import {
  SAVED_GAME_VERSION,
  restoreGame,
  takeUpField,
} from "../src/rules/run/saved_game";
import { starsIn, starsWon } from "../src/rules/run/stars";
import { stepsIn } from "../src/rules/stepper";
import { stepTimes } from "../src/testing/field_picture";
import { CLEARING_RUN, loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** Returns the field of a run storage holds, taken up by the rules as the page takes it up. */
function takenUpField(stored: string): Field {
  const takenUp = restoreGame(JSON.parse(stored), LEVELS, 2);
  if (!takenUp) throw new Error("The run can't be taken up.");
  const { run } = takenUp;
  const field = createField(parseLevel(LEVELS[run.level - 1]!), {
    speed: run.speed,
    seed: levelSeed(run),
  });
  takeUpField(field, takenUp.field, run);
  return field;
}

describe("storedRun", () => {
  it("stores the run kept, stamped with the version the shell takes it up under, paused", async () => {
    const { stored } = storedRun(await loadScreenshotApi(), CLEARING_RUN);

    const kept = JSON.parse(stored) as Record<string, unknown>;
    expect({
      version: kept["version"],
      outcome: restoreGame(kept, LEVELS, 2)?.run.outcome,
    }).toEqual({ version: SAVED_GAME_VERSION, outcome: "paused" });
  });

  it("hands back the run as the rules keep it", async () => {
    const api = await loadScreenshotApi();

    const { saved } = storedRun(api, CLEARING_RUN);

    expect(saved).toEqual(api.keptRun(CLEARING_RUN));
  });
});

describe("CLEARING_RUN", () => {
  it("clears its level as it goes on, its ball still on the paddle, with double pay and every star", async () => {
    const { stored } = storedRun(await loadScreenshotApi(), CLEARING_RUN);
    const field = takenUpField(stored);

    stepTimes(field, stepsIn(2000));

    expect({
      state: field.state,
      doublePay: tallyOf(field).dares > 0,
      stars: starsIn(starsWon(field)),
    }).toEqual({
      state: "cleared",
      doublePay: true,
      stars: ["clear", "clean", "streak"],
    });
  });
});
