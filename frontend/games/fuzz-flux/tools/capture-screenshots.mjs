#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Fuzz Flux from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the board, to
 * `public/docs/screenshots/fuzz-flux/`. Both show the same level in play,
 * kept as the game keeps one and taken up on load: Spring cleaning, the
 * last of Warm-up, two moves into its certificate on its deal 4, the third
 * made by the keys, and the page held 45 frames into it: the four red
 * fuzzballs it lines up gone in a burst of fluff, but for the dasher they
 * make, and the columns over them falling into their places. The page
 * runs on a clock of steady frames from before its own scripts, which
 * stands still until the board has drawn, and its `Math.random` from a
 * seed, so the move stands at the same moment every time it is held. The
 * palette is Casino night, dark as the other arcade
 * games' are in the catalog, and Rickashay and Brick Breaker either side
 * of it take the other dark one.
 */
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { withPage } from "@fz/dev/chrome";
import {
  PHASER_CANVAS_SETTLED,
  describePhaserPage,
  readRect,
} from "@fz/dev/board-page";
import {
  SCREENSHOT_VIEWPORT,
  keepShot,
  runScreenshotScript,
  settled,
  setUpPage,
  siteImagesFolder,
  thumbRegionAround,
} from "@fz/dev/screenshots";
import { CONSOLE } from "@fz/dev/script";
import { SAVED_GAME_KEY, loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */
/** @import { ScriptIo } from "@fz/dev/script" */
/** @import { ScreenshotApi, ScriptMove, ScriptRun } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "fuzz-flux");

/** The dev server's port, as `vite.config.ts` gives it. */
const PORT = 9008;

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** The seed of the page's `Math.random`. */
const SEED = 9;

/**
 * How long the board has to draw, in ms, timed in Node, since the page's
 * own clock stands still until the script starts it.
 */
const DRAW_TIMEOUT_MS = 20_000;

/** The board, by its name, its element, and its element's attribute that says where the scene drew it on the canvas. */
const BOARD = { name: "board", element: "app-board", drawnAt: "data-board" };

/**
 * The level shown, as `keptRun()` keeps it: Spring cleaning, level 9, on
 * its deal 4, two moves into its certificate there.
 *
 * @type {ScriptRun}
 */
export const RUN = {
  level: 9,
  deal: 4,
  moves: [
    [49, 57],
    [20, 28],
  ],
};

/** The move the page is held in: the certificate's third, which lines up four red fuzzballs. */
export const MOVE = /** @type {ScriptMove} */ ([45, 53]);

/**
 * How many of the page's frames run before the move is made: long enough
 * for the board taken up to come to rest, and short of the hint.
 */
const FRAMES_BEFORE = 120;

/** How many of the page's frames the move plays before the page is held. */
const FRAMES_IN = 45;

/**
 * How long each of the page's frames takes on the clock it runs on, in ms:
 * a whole number, so every frame's time is exact, and shorter than a 60th
 * of a second, which Phaser cuts a frame's time down to while the page is
 * out of focus.
 */
const FRAME_MS = 16;

/**
 * The clock of steady frames a page runs on: whether it has started, the
 * frames drawn since, the time `requestAnimationFrame` handed the last,
 * what to call before the next frame's callbacks, and the frame past which
 * no callback runs.
 *
 * @typedef {object} SteadyClock
 * @property {boolean} started
 * @property {number} frame
 * @property {number} drawn
 * @property {((frame: number) => void) | null} onFrame
 * @property {number} heldAfter
 */

/**
 * Runs the page on a clock of steady frames, in the page before its own
 * scripts: each frame of `requestAnimationFrame` is handed a time a frame
 * on from the last, and `performance.now()` reads the frame's time, so
 * Phaser plays each frame for the same time however fast Chrome draws. It
 * keeps the clock as `steadyClock` on the window. Its time stands at 0
 * until it is `started`, however long the page takes to load, so the
 * scene's own clock, which counts from the scene's first frame, reads the
 * same at each frame from then on every run, and with it the specials'
 * breaths and the fuzzballs' blinks; and anything in the page that times
 * itself by `performance.now()` sees no time pass till then. Its `onFrame`
 * is called once, before the next frame's callbacks, and past its
 * `heldAfter` no callback runs again, the page left as that frame drew
 * it. It is sent as its source, so it uses nothing from this module.
 *
 * @param {number} frameMs
 */
export function steadyFrames(frameMs) {
  const nextFrame = window.requestAnimationFrame.bind(window);
  /** @type {SteadyClock} */
  const clock = {
    started: false,
    frame: 0,
    drawn: -1,
    onFrame: null,
    heldAfter: Number.POSITIVE_INFINITY,
  };
  window.requestAnimationFrame = (callback) =>
    nextFrame((drawn) => {
      // Every callback of a frame is handed the same time.
      if (drawn !== clock.drawn) {
        clock.drawn = drawn;
        if (clock.started) clock.frame++;
        const onFrame = clock.onFrame;
        clock.onFrame = null;
        onFrame?.(clock.frame);
      }
      if (clock.frame <= clock.heldAfter) callback(clock.frame * frameMs);
    });
  performance.now = () => clock.frame * frameMs;
  Reflect.set(window, "steadyClock", clock);
}

/**
 * Returns the arrow that swaps a square of a board toward a neighbor, by
 * its code and the key code Phaser reads, or null for a square that isn't
 * its neighbor. It is sent to the page as its source, so it uses nothing
 * from this module.
 *
 * @param {number} from
 * @param {number} to
 * @param {number} across The board's width, in squares.
 * @returns {[code: string, keyCode: number] | null}
 */
export function swapArrow(from, to, across) {
  const sameRow = Math.floor(from / across) === Math.floor(to / across);
  if (sameRow && to === from + 1) return ["ArrowRight", 39];
  if (sameRow && to === from - 1) return ["ArrowLeft", 37];
  if (to === from + across) return ["ArrowDown", 40];
  if (to === from - across) return ["ArrowUp", 38];
  return null;
}

/**
 * What the board says once the page is held: the level shown, by its
 * number, how it stands, the move the game kept, as storage keeps one, or
 * null where it kept none, and whether the page was held.
 *
 * @typedef {{level: string, outcome: string, made: unknown, held: boolean}} HeldMove
 */

/**
 * Starts {@link steadyFrames}' clock, makes a move on the board by the keys
 * as a frame begins a number of frames on, as a player would, on the
 * grid's cell it picks up: Space picks it up and an arrow swaps it toward
 * its neighbor. It holds the page a number of frames into the move and
 * returns what the board says then. It runs in the page, with
 * {@link swapArrow}, so it uses nothing else of this module.
 *
 * @param {string} key Where the game keeps the level in play.
 * @param {ScriptMove} move
 * @param {number} framesBefore
 * @param {number} framesIn
 * @returns {Promise<HeldMove>}
 */
export async function makeMove(key, move, framesBefore, framesIn) {
  const board = document.querySelector("app-board");
  /** @type {SteadyClock} */
  const clock = Reflect.get(window, "steadyClock");
  const [from, to] = move;
  const cell = board?.querySelector(`[role=gridcell][data-index="${from}"]`);
  /**
   * Presses a key on the cell and lets it go.
   *
   * @param {string} code
   * @param {number} keyCode
   */
  const press = (code, keyCode) => {
    for (const type of ["keydown", "keyup"]) {
      const event = new KeyboardEvent(type, {
        key: code === "Space" ? " " : code,
        code,
        bubbles: true,
      });
      // Phaser reads a key's code from `keyCode`, which a made event leaves 0.
      Object.defineProperty(event, "keyCode", { get: () => keyCode });
      cell?.dispatchEvent(event);
    }
  };
  /**
   * Returns the moves the game keeps of the level in play, as storage keeps
   * them.
   *
   * @returns {unknown[]}
   */
  const keptMoves = () => {
    /** @type {unknown} */
    const kept = JSON.parse(localStorage.getItem(key) ?? "null");
    /** @type {unknown} */
    const moves =
      kept !== null && typeof kept === "object"
        ? Reflect.get(kept, "moves")
        : null;
    return Array.isArray(moves) ? moves : [];
  };
  const before = keptMoves().length;
  const arrow =
    board &&
    swapArrow(
      from,
      to,
      parseFloat(getComputedStyle(board).getPropertyValue("--across")),
    );
  if (arrow && cell instanceof HTMLElement) {
    cell.focus();
    /**
     * Presses the keys as a frame begins, before Phaser reads the keys in
     * it, once the frames before the move have run.
     *
     * @param {number} frame
     */
    const moveAt = (frame) => {
      if (frame < framesBefore) {
        clock.onFrame = moveAt;
        return;
      }
      press("Space", 32);
      press(...arrow);
      clock.heldAfter = frame + framesIn;
    };
    clock.onFrame = moveAt;
    clock.started = true;
    for (let i = 0; i < 400 && clock.frame <= clock.heldAfter; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    // Long enough for the shell to show what the frame held left it at.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const after = keptMoves();
  return {
    level: board?.getAttribute("data-level") ?? "",
    outcome: board?.getAttribute("data-outcome") ?? "",
    made: after.length > before ? after.at(-1) : null,
    held: clock.frame > clock.heldAfter,
  };
}

/**
 * Opens the level on a page of its own and returns the screenshot, or why
 * it could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @param {string} stored The level in play as storage keeps it.
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url, stored) {
  await page.beforeLoad(steadyFrames, FRAME_MS);
  await setUpPage(page, {
    theme: THEME,
    stored: { [SAVED_GAME_KEY]: stored },
    seed: SEED,
  });
  await page.navigate(url);
  const drew = await Promise.race([
    settled(page, PHASER_CANVAS_SETTLED),
    delay(DRAW_TIMEOUT_MS, false, { ref: false }),
  ]);
  if (!drew) return { problem: "the board did not draw" };
  const shown = await page.evaluateWith([readRect], describePhaserPage, BOARD);
  if (shown.state !== "ready") return { problem: "the board did not draw" };
  if (shown.board === null) return { problem: "the board is missing" };
  const held = await page.evaluateWith(
    [swapArrow],
    makeMove,
    SAVED_GAME_KEY,
    MOVE,
    FRAMES_BEFORE,
    FRAMES_IN,
  );
  if (held.level !== String(RUN.level)) {
    return { problem: `the level was not taken up: it is ${held.level}` };
  }
  if (held.made === null) return { problem: "no move was made" };
  if (JSON.stringify(held.made) !== JSON.stringify(MOVE)) {
    return {
      problem: `the move made was ${JSON.stringify(held.made)}, not ${JSON.stringify(MOVE)}`,
    };
  }
  if (!held.held) {
    return { problem: `the page didn't draw ${String(FRAMES_IN)} frames` };
  }
  if (held.outcome !== "playing") {
    return { problem: `the move ended the level: it is ${held.outcome}` };
  }
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(shown.board, SCREENSHOT_VIEWPORT),
    says: `Took up level ${String(RUN.level)}, made its next move and held ${String(FRAMES_IN)} frames into it.`,
  };
}

/**
 * Returns the script, which loads what it takes from the game with `load`.
 *
 * @param {() => Promise<ScreenshotApi>} load
 * @returns {ScreenshotScript}
 */
function scriptLoading(load) {
  return {
    game: "Fuzz Flux",
    root: ROOT,
    port: PORT,
    capture: async (devtools, { url, force }, printer) => {
      const stored = storedRun(await load(), RUN);
      const shot = await withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
        capture(page, url, stored),
      );
      return keepShot(shot, SCREENSHOT_DIR, printer, { force });
    },
  };
}

/**
 * Captures the screenshots a command line asks for, or prints its usage,
 * and returns the code to exit with: 0, 1 if nothing answers at the server
 * or the level couldn't be captured, or 2 for a command line it can't
 * read, before Chrome starts.
 *
 * @param {readonly string[]} args
 * @param {ScriptIo<ScreenshotApi>} [io]
 * @returns {Promise<number>}
 */
export function run(
  args,
  {
    load = loadScreenshotApi,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  return runScreenshotScript(scriptLoading(load), { args, print, printError });
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
