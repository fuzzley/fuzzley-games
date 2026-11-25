import { levelAt } from "@fz/brick-wall/rules/progress";
import { STRAIGHT_UP as STARTING_AIM } from "@fz/brick-wall/view/aim_settings";
import { AIMS_PER_DEGREE } from "@fz/brick-wall/rules/aims";
import { formatPoints } from "@fz/core/format";
import { recordingPrinter } from "@fz/dev/script";
import { LEVELS } from "../src/rules/levels/levels";
import { playRound } from "../src/rules/round/round";
import { describeAim } from "../src/rules/run/describe";
import { SAVED_GAME_VERSION, restoreGame } from "../src/rules/run/saved_game";
import { FLIGHT_RULES } from "../src/rules/tuning";
import { MARKS, certificateOf } from "../src/testing/every_level";
import viteConfig from "../vite.config";
import {
  AIM,
  AIMS_A_PRESS,
  RUN,
  STRAIGHT_UP,
  aimingKeys,
  run,
  shownRun,
  steadyFrames,
} from "./capture-screenshots.mjs";
import type { SteadyClock } from "./capture-screenshots.mjs";
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

/** Returns how many times each key is pressed, by its code, its key code and whether Shift is held. */
function countedPresses(
  keys: readonly { code: string; keyCode: number; shift: boolean }[],
): Record<string, number> {
  const counted: Record<string, number> = {};
  for (const { code, keyCode, shift } of keys) {
    const key = `${shift ? "Shift+" : ""}${code} ${String(keyCode)}`;
    counted[key] = (counted[key] ?? 0) + 1;
  }
  return counted;
}

/**
 * Puts a page's frames, drawn only as the spec draws them, on
 * {@link steadyFrames}' clock of 16 ms frames, and returns the clock and
 * a way to draw the next frame at a time of Chrome's, running every
 * callback asked for since the last.
 */
function steadyPage(): { clock: SteadyClock; draw: (time: number) => void } {
  let asked: FrameRequestCallback[] = [];
  vi.stubGlobal("window", {
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      asked.push(callback),
  });
  vi.stubGlobal("performance", { now: () => 0 });
  steadyFrames(16);
  return {
    clock: Reflect.get(window, "steadyClock") as SteadyClock,
    draw: (time) => {
      const drawing = asked;
      asked = [];
      for (const callback of drawing) callback(time);
    },
  };
}

/** Returns the run shown as a page takes it up, by the levels' marks. */
async function takenUp(): Promise<ReturnType<typeof restoreGame>> {
  const { stored } = shownRun(await loadScreenshotApi());
  return restoreGame(JSON.parse(stored), LEVELS, 2, MARKS);
}

describe("run", () => {
  it("prints the usage asked for, the game's own dev server its default, and exits with 0", async () => {
    const port = String(viteConfig.server?.port);

    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [
        expect.stringMatching(
          new RegExp(
            `^Usage: yarn capture:screenshots[^]*of Rickaashay[^]*\\(default: http://localhost:${port}/\\)`,
          ),
        ) as unknown,
      ],
      err: [],
    });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, before Chrome starts", async () => {
    expect(await ran(["--port", "9007"])).toEqual({
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
    const { stored } = shownRun(await loadScreenshotApi());

    const kept = JSON.parse(stored) as Record<string, unknown>;
    const page = await takenUp();
    expect({
      version: kept["version"],
      level: page?.run.level,
      rounds: page?.run.rounds,
      outcome: page?.run.outcome,
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

    expect(shown.aimed).toBe(describeAim(AIM));
  });
});

describe("aimingKeys", () => {
  it.each([
    [415, { "ArrowLeft 37": 21, "Shift+ArrowLeft 37": 3 }],
    [250, { "ArrowRight 39": 19, "Shift+ArrowRight 39": 2 }],
    [332, { "ArrowLeft 37": 1 }],
    [328, {}],
  ])(
    "presses for aim %i, from straight up, 328, a degree a press and a quarter with Shift, %j",
    (aim, presses) => {
      expect(countedPresses(aimingKeys(aim))).toEqual(presses);
    },
  );
});

describe("STRAIGHT_UP and AIMS_A_PRESS", () => {
  it("are the aim a shot starts from and the aims an arrow's press turns, as the game's aiming has them", () => {
    expect({ STRAIGHT_UP, AIMS_A_PRESS }).toEqual({
      STRAIGHT_UP: STARTING_AIM,
      AIMS_A_PRESS: AIMS_PER_DEGREE,
    });
  });
});

describe("steadyFrames", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hands every callback of a frame the frame's time, a frame on from the last however long Chrome took, and performance.now() reads it", () => {
    const { draw } = steadyPage();
    const times: number[] = [];
    const ask = () => window.requestAnimationFrame((time) => times.push(time));

    ask();
    ask();
    draw(1000.4);
    const first = performance.now();
    ask();
    draw(1100.9);

    expect({ times, first, now: performance.now() }).toEqual({
      times: [16, 16, 32],
      first: 16,
      now: 32,
    });
  });

  it("calls onFrame once, with its frame, before the frame's callbacks", () => {
    const { clock, draw } = steadyPage();
    const called: string[] = [];
    const ask = () =>
      window.requestAnimationFrame((time) =>
        called.push(`callback ${String(time)}`),
      );
    clock.onFrame = (frame) => called.push(`onFrame ${String(frame)}`);

    ask();
    ask();
    draw(5);
    ask();
    draw(6);

    expect(called).toEqual([
      "onFrame 1",
      "callback 16",
      "callback 16",
      "callback 32",
    ]);
  });

  it("runs no callback past the frame it is held after, though the frames go on", () => {
    const { clock, draw } = steadyPage();
    const times: number[] = [];
    const ask = () => window.requestAnimationFrame((time) => times.push(time));
    clock.heldAfter = 2;

    for (const time of [5, 6, 7, 8]) {
      ask();
      draw(time);
    }

    expect({ times, frame: clock.frame }).toEqual({
      times: [16, 32],
      frame: 4,
    });
  });
});

describe("RUN", () => {
  it("plays the first two shots of its level's certificate on its depth", () => {
    const line = certificateOf(levelAt(LEVELS, RUN.level), RUN.depth);

    expect(RUN.shots).toEqual(line?.slice(0, 2));
  });
});

describe("AIM", () => {
  it("lets fly, from where the run's next round starts, a hot shot that rallies 13 and keeps the level on", async () => {
    const start = (await takenUp())?.start;
    if (!start) throw new Error("The run shown keeps no start.");

    const { outcome } = playRound(start, { aim: AIM }, FLIGHT_RULES);

    expect({
      hot: start.hot,
      rally: outcome.rally,
      result: outcome.result,
    }).toEqual({ hot: true, rally: 13, result: "on" });
  });
});
