import { formatPoints } from "@fz/core/format";
import { recordingPrinter } from "@fz/dev/script";
import { LEVELS, levelEntryOf } from "../src/rules/levels/levels";
import { describeShot } from "../src/rules/run/describe";
import { SAVED_GAME_VERSION, restoreGame } from "../src/rules/run/saved_game";
import { certificateOf } from "../src/testing/every_level";
import {
  AIMING,
  RUN,
  aimingKeys,
  run,
  shownRun,
} from "./capture-screenshots.mjs";
import { loadScreenshotApi } from "./stored_run.mjs";

/**
 * Returns the code the script exits with for a command line that captures
 * nothing, and the lines it printed, as its output and as what went wrong.
 */
async function ran(
  args: readonly string[],
): Promise<{ code: number; out: readonly string[]; err: readonly string[] }> {
  const printer = recordingPrinter();
  const code = await run(args, printer);
  return { code, out: printer.out, err: printer.err };
}

/** Returns how many times each key is pressed, by its code and key code. */
function countedPresses(
  keys: readonly { code: string; keyCode: number }[],
): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const { code, keyCode } of keys) {
    const key = `${code} ${String(keyCode)}`;
    counted[key] = (counted[key] ?? 0) + 1;
  }
  return counted;
}

describe("run", () => {
  it("prints the usage asked for, the game's own dev server its default, and exits with 0", async () => {
    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [
        expect.stringMatching(
          /^Usage: yarn capture:screenshots[^]*of Brick Fuzz Pop[^]*\(default: http:\/\/localhost:9006\/\)/,
        ) as unknown,
      ],
      err: [],
    });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, before Chrome starts", async () => {
    expect(await ran(["--port", "9006"])).toEqual({
      code: 2,
      out: [],
      err: [
        expect.stringMatching(
          /^Unknown option '--port'[^]*\n\nUsage: yarn capture:screenshots/,
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
  it("stamps the run kept with the version the shell takes it up under, paused two rounds into its level", async () => {
    const shown = shownRun(await loadScreenshotApi());

    const stored = JSON.parse(shown.stored) as Record<string, unknown>;
    const takenUp = restoreGame(stored, LEVELS, 2);
    expect({
      version: stored["version"],
      level: takenUp?.run.level,
      rounds: takenUp?.run.rounds,
      outcome: takenUp?.run.outcome,
    }).toEqual({
      version: SAVED_GAME_VERSION,
      level: RUN.level,
      rounds: 2,
      outcome: "paused",
    });
  });

  it("writes the run's score as the game writes points", async () => {
    const shown = shownRun(await loadScreenshotApi());

    const stored = JSON.parse(shown.stored) as { score: number };
    expect(shown.score).toBe(formatPoints(stored.score));
  });

  it("says the aim the keys give the next shot as the game says it", async () => {
    const shown = shownRun(await loadScreenshotApi());

    // 100 degrees is aim 368: 4 aims a degree, from 8 degrees.
    expect([AIMING, shown.aimed]).toEqual([
      { degrees: 100, charge: 3 },
      describeShot({ aim: 368, charge: 3 }),
    ]);
  });
});

describe("aimingKeys", () => {
  it.each([
    [
      { degrees: 100, charge: 3 },
      { "ArrowLeft 37": 10, "ArrowUp 38": 3 },
    ],
    [{ degrees: 55, charge: 0 }, { "ArrowRight 39": 35 }],
    [{ degrees: 90, charge: 5 }, { "ArrowUp 38": 5 }],
  ])(
    "presses for %j, from straight up and no charge, %j",
    (aiming, presses) => {
      expect(countedPresses(aimingKeys(aiming))).toEqual(presses);
    },
  );
});

describe("RUN", () => {
  it("plays the first two shots of its level's certificate on its depth", () => {
    const line = certificateOf(levelEntryOf(LEVELS, RUN.level), RUN.depth);

    expect(RUN.shots).toEqual(line?.slice(0, 2));
  });
});
