import { levelAt } from "@fz/core/levels";
import { recordingPrinter } from "@fz/dev/script";
import { ELEMENT_RULES, WIND_RULE } from "../src/rules/elements/element_rules";
import { LEVELS } from "../src/rules/levels/levels";
import {
  type LevelInPlay,
  movePlayed,
  readSavedGame,
} from "../src/rules/run/saved_game";
import { CERTIFICATES, keptAt } from "../src/testing/certificates";
import { SCREENSHOT_API } from "../src/testing/screenshot_api";
import viteConfig from "../vite.config";
import {
  MOVE,
  RUN,
  type SteadyClock,
  run,
  steadyFrames,
  swapArrow,
} from "./capture-screenshots.mjs";

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

/** The game's own rules. */
const RULES = { elements: ELEMENT_RULES, wind: WIND_RULE };

/** Returns the level in play the page takes up, and throws where it takes none up. */
function takenUp(): LevelInPlay {
  const inPlay = readSavedGame(SCREENSHOT_API.keptRun(RUN), LEVELS, RULES);
  if (inPlay === null) throw new Error("The page takes no level up.");
  return inPlay;
}

describe("run", () => {
  it("prints the usage asked for, the game's own dev server its default, and exits with 0", async () => {
    const port = String(viteConfig.server?.port);

    expect(await ran(["--help"])).toEqual({
      code: 0,
      out: [
        expect.stringMatching(
          new RegExp(
            `^Usage: yarn capture:screenshots[^]*of Fuzz Flux[^]*\\(default: http://localhost:${port}/\\)`,
          ),
        ) as unknown,
      ],
      err: [],
    });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, before Chrome starts", async () => {
    expect(await ran(["--port", "9008"])).toEqual({
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

describe("RUN and MOVE", () => {
  it("play the first three moves of the level's certificate on its deal, whose fourth clears it", () => {
    const { set, data } = levelAt(LEVELS, RUN.level);

    expect(keptAt(CERTIFICATES, set.id, data.id, String(RUN.deal))).toEqual([
      ...RUN.moves,
      MOVE,
      expect.anything(),
    ]);
  });

  it("line up four red fuzzballs, which make a dasher, on the level taken up, and keep it on", () => {
    const [from, to] = MOVE;

    const played = movePlayed(takenUp(), { from, to }, RULES);

    expect({
      bunches: played.record.waves[0]?.bunches.map(
        ({ kind, squares, makes }) => ({
          kind,
          squares: squares.length,
          makes: makes?.what,
        }),
      ),
      outcome: played.inPlay.game.outcome,
    }).toEqual({
      bunches: [{ kind: "red", squares: 4, makes: "dasher-down" }],
      outcome: "playing",
    });
  });
});

describe("swapArrow", () => {
  it.each<[number, [string, number]]>([
    [10, ["ArrowRight", 39]],
    [8, ["ArrowLeft", 37]],
    [17, ["ArrowDown", 40]],
    [1, ["ArrowUp", 38]],
  ])("swaps square 9 of a board 8 across toward square %i", (to, arrow) => {
    expect(swapArrow(9, to, 8)).toEqual(arrow);
  });

  it.each([
    ["the last of the row before it", 7],
    ["one past its neighbors", 11],
  ])(
    "swaps square 8 of a board 8 across toward no square but a neighbor, not %s",
    (_, to) => {
      expect(swapArrow(8, to, 8)).toBeNull();
    },
  );
});

describe("steadyFrames", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stands at 0 until it is started, however many frames Chrome draws, and calls onFrame meanwhile", () => {
    const { clock, draw } = steadyPage();
    const called: string[] = [];
    clock.onFrame = (frame) => called.push(`onFrame ${String(frame)}`);
    window.requestAnimationFrame((time) =>
      called.push(`callback ${String(time)}`),
    );

    draw(1000);
    window.requestAnimationFrame((time) =>
      called.push(`callback ${String(time)}`),
    );
    draw(1016);

    expect({ called, now: performance.now() }).toEqual({
      called: ["onFrame 0", "callback 0", "callback 0"],
      now: 0,
    });
  });

  it("hands every callback of a frame the frame's time once started, a frame on from the last however long Chrome took, and performance.now() reads it", () => {
    const { clock, draw } = steadyPage();
    const times: number[] = [];
    const ask = () => window.requestAnimationFrame((time) => times.push(time));
    clock.started = true;

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
    clock.started = true;
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
    clock.started = true;
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
