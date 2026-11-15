import { ROCK_KINDS } from "../src/rules/catalog/rocks";
import { type Field, stepField } from "../src/rules/field/field";
import {
  SAVED_GAME_VERSION,
  restoreGame,
  takeUpField,
} from "../src/rules/run/saved_game";
import { STILL } from "../src/rules/ship/ship";
import { stepsIn } from "../src/rules/stepper";
import { NEW_SHIP_GUARD_MS } from "../src/rules/tuning";
import { waveToPlay } from "../src/rules/waves/endless";
import { WAVES, waveEntryOf } from "../src/rules/waves/waves";
import { CLEARING_RUN, loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** How long a volatile rock's fuse burns, in steps, as its blast says. */
const FUSE_STEPS = stepsIn(ROCK_KINDS.volatile.traits[0].delayMs);

/** Returns the field of a run storage holds, taken up by the rules as the page takes it up. */
function takenUpField(stored: string): Field {
  const takenUp = restoreGame(JSON.parse(stored), WAVES, 2);
  if (!takenUp?.field) throw new Error("The run kept no field.");
  const { run, field } = takenUp;
  const wave = waveToPlay(waveEntryOf(WAVES, run.wave), run.seed);
  return takeUpField(wave, { held: STILL }, field, run);
}

describe("loadScreenshotApi", () => {
  it("loads what the scripts take from the game through Vite, as they load it", async () => {
    const api = await loadScreenshotApi();

    expect({
      points: api.formatPoints(4250),
      guardMs: api.newShipGuardMs,
      version: api.savedGameVersion,
    }).toEqual({
      points: "4,250",
      guardMs: NEW_SHIP_GUARD_MS,
      version: SAVED_GAME_VERSION,
    });
  });
});

describe("storedRun", () => {
  it("stores the run kept, stamped with the version the shell takes it up under", async () => {
    const api = await loadScreenshotApi();

    const stored = storedRun(api, { score: 120 });

    expect(JSON.parse(stored)).toEqual({
      version: SAVED_GAME_VERSION,
      score: 120,
    });
  });
});

describe("CLEARING_RUN", () => {
  it("is kept on the last written wave, the trophy's, paused with its field", async () => {
    const api = await loadScreenshotApi();

    const stored = storedRun(api, api.clearingRun(CLEARING_RUN));

    const takenUp = restoreGame(JSON.parse(stored), WAVES, 2);
    expect({
      wave: takenUp?.run.wave,
      outcome: takenUp?.run.outcome,
      field: takenUp?.field?.torus,
    }).toEqual({
      wave: WAVES.length,
      outcome: "paused",
      field: CLEARING_RUN.torus,
    });
  });

  it("clears its wave as the page goes on with it, the ship spared, as its fuse burns down", async () => {
    const api = await loadScreenshotApi();
    const field = takenUpField(storedRun(api, api.clearingRun(CLEARING_RUN)));

    for (let step = 0; step < FUSE_STEPS; step++) stepField(field);

    expect({ cleared: field.cleared, ship: field.ship !== null }).toEqual({
      cleared: true,
      ship: true,
    });
  });
});
