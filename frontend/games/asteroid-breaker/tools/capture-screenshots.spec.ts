import { formatPoints } from "@fz/core/format";
import { SAVED_GAME_VERSION, restoreGame } from "../src/rules/run/saved_game";
import { NEW_SHIP_GUARD_MS } from "../src/rules/tuning";
import { WAVES } from "../src/rules/waves/waves";
import {
  RUN,
  loadScreenshotApi,
  readCommandLine,
  run,
  shownRun,
  thumbRegion,
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

describe("readCommandLine", () => {
  it("takes the game's own dev server and the usual Chrome by default", () => {
    expect(readCommandLine([])).toEqual({
      url: "http://localhost:9005/",
      chrome: undefined,
    });
  });

  it("takes the server and the Chrome the command line names", () => {
    expect(
      readCommandLine([
        "--url",
        "http://127.0.0.1:4173/",
        "--chrome",
        "/opt/chrome",
      ]),
    ).toEqual({ url: "http://127.0.0.1:4173/", chrome: "/opt/chrome" });
  });

  it.each([["--help"], ["-h"]])("prints the usage for %s", (flag) => {
    expect(readCommandLine([flag])).toEqual({
      code: 0,
      message: expect.stringMatching(
        /^Usage: yarn capture:screenshots/,
      ) as unknown,
    });
  });

  it.each([
    [["--port", "9005"], "Unknown option '--port'"],
    [["--url"], "Option '--url <value>' argument missing"],
    [["9005"], "Unexpected argument '9005'"],
    [
      ["--url", "localhost:9005"],
      `--url takes an http or https address, not "localhost:9005".`,
    ],
  ])("exits with 2 for %j, saying why", (args, problem) => {
    expect(readCommandLine(args)).toEqual({
      code: 2,
      message: expect.stringContaining(problem) as unknown,
    });
  });

  it("follows what is wrong with the usage", () => {
    expect(readCommandLine(["--port", "9005"])).toEqual({
      code: 2,
      message: expect.stringMatching(
        /^Unknown option '--port'[^]*\n\nUsage: yarn capture:screenshots/,
      ) as unknown,
    });
  });
});

describe("run", () => {
  it("prints the usage asked for and exits with 0", async () => {
    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [
        expect.stringMatching(/^Usage: yarn capture:screenshots/) as unknown,
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

describe("thumbRegion", () => {
  it("keeps the field and its margin in the middle, at the thumbnail's shape", () => {
    expect(
      thumbRegion({ left: 352, top: 216, width: 576, height: 320 }),
    ).toEqual({ left: 626, top: 384, width: 1308, height: 736 });
  });

  it("keeps the region on the capture for a field at its top left", () => {
    expect(thumbRegion({ left: 0, top: 0, width: 400, height: 225 })).toEqual({
      left: 0,
      top: 0,
      width: 971,
      height: 546,
    });
  });

  it("keeps the region on the capture for a field at its bottom right", () => {
    expect(
      thumbRegion({ left: 880, top: 495, width: 400, height: 225 }),
    ).toEqual({ left: 1589, top: 894, width: 971, height: 546 });
  });

  it("keeps the whole capture for a field as wide as the page", () => {
    expect(thumbRegion({ left: 0, top: 48, width: 1280, height: 640 })).toEqual(
      { left: 0, top: 0, width: 2560, height: 1440 },
    );
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
