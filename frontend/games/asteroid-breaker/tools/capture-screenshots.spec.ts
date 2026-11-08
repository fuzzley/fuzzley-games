import { formatPoints } from "@fz/core/format";
import { SAVED_GAME_VERSION, restoreGame } from "../src/rules/run/saved_game";
import { NEW_SHIP_GUARD_MS } from "../src/rules/tuning";
import { WAVES } from "../src/rules/waves/waves";
import {
  RUN,
  loadScreenshotApi,
  run,
  shownRun,
} from "./capture-screenshots.mjs";

/** A field on its side, as a page of 1280 by 720 lays one out. */
const FIELD = { width: 72, height: 40 };

/**
 * Returns the code the script exits with for a command line that captures
 * nothing, and the lines it printed, as its output and as what went wrong.
 */
async function ran(
  args: readonly string[],
): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(args, {
    print: (line) => out.push(line),
    printError: (line) => err.push(line),
  });
  return { code, out, err };
}

describe("run", () => {
  it("prints the usage asked for, the game's own dev server its default, and exits with 0", async () => {
    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [
        expect.stringMatching(
          /^Usage: yarn capture:screenshots[^]*of Asteroid Breaker[^]*\(default: http:\/\/localhost:9005\/\)/,
        ) as unknown,
      ],
      err: [],
    });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, before Chrome starts", async () => {
    expect(await ran(["--port", "9005"])).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^Unknown option '--port'[^]*\n\nUsage: yarn capture:screenshots/,
        ) as unknown,
      ],
    });
  });

  it("exits with 2 for a server's address that is no web address, before Chrome starts", async () => {
    expect(await ran(["--url", "localhost:9005"])).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^--url takes an http or https address, not "localhost:9005"\.\n\nUsage: yarn capture:screenshots/,
        ) as unknown,
      ],
    });
  });

  it("exits with 1 when nothing answers at the server, saying so, before Chrome starts", async () => {
    expect(await ran(["--url", "http://127.0.0.1:9/"])).toEqual({
      code: 1,
      out: [],
      err: [
        "Nothing answers at http://127.0.0.1:9/; start the game with yarn dev.",
      ],
    });
  });
});

describe("shownRun", () => {
  it("stamps the run kept on the page's field with the version the shell takes it up under, paused on its wave", async () => {
    const shown = shownRun(await loadScreenshotApi(), FIELD);

    const stored = JSON.parse(shown.stored) as Record<string, unknown>;
    const takenUp = restoreGame(stored, WAVES, 2);
    expect({
      version: stored["version"],
      wave: takenUp?.run.wave,
      outcome: takenUp?.run.outcome,
    }).toEqual({
      version: SAVED_GAME_VERSION,
      wave: RUN.wave,
      outcome: "paused",
    });
  });

  it("writes the run's score as the game writes points", async () => {
    const shown = shownRun(await loadScreenshotApi(), FIELD);

    const stored = JSON.parse(shown.stored) as { score: number };
    expect(shown.score).toBe(formatPoints(stored.score));
  });
});

describe("loadScreenshotApi", () => {
  it("keeps the run the screenshots show, loaded through Vite as the script loads it", async () => {
    const api = await loadScreenshotApi();

    const kept = api.keptRun({ ...RUN, torus: FIELD });

    expect({
      scored: kept.score > 0,
      points: api.formatPoints(4250),
      guardMs: api.newShipGuardMs,
    }).toEqual({ scored: true, points: "4,250", guardMs: NEW_SHIP_GUARD_MS });
  });
});
