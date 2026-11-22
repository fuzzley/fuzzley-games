#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Asteroid Breaker from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the field, to
 * `public/docs/screenshots/asteroid-breaker/`. Both show the same run, kept
 * as the game keeps one, laid out on the field the page's board shapes,
 * taken up paused on load and gone on with, firing, until its first stray
 * fuzzball drifts in from an edge: at Normal on wave 9, Crowd, played by the
 * autopilot until a second before. The palette is Casino night, dark as the
 * other arcade games' are in the catalog, and Brick Breaker beside it takes
 * the other dark one.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withPage } from "@fz/dev/chrome";
import {
  PHASER_CANVAS_READY,
  SCREENSHOT_VIEWPORT,
  keepShot,
  runScreenshotScript,
  setUpPage,
  settled,
  siteImagesFolder,
  takenUpBoard,
  thumbRegionAround,
} from "@fz/dev/screenshots";
import { CONSOLE } from "@fz/dev/script";
import { SAVED_GAME_KEY, loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** @import { DevToolsConnection, Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */
/** @import { ScriptIo } from "@fz/dev/script" */
/** @import { FieldShape, ScreenshotApi, ScreenshotRun } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "asteroid-breaker");

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** What the announcer says as a stray comes in, which the screenshot waits for. */
const STRAY_WORDS = "A stray fuzzball drifts in.";

/**
 * How long the stray takes to come in off the edge once it is said, in
 * milliseconds of the field's time.
 */
const STRAY_SETTLE_MS = 500;

/**
 * How long to wait for the stray once the run goes on, in milliseconds of
 * the field's time: the second the run is kept before it
 * (`RUN.strayInMs`), and three more.
 */
const STRAY_WAIT_MS = 4000;

/**
 * The least a frame of the page moves the field on, in milliseconds: its
 * time on the clock, up to a sixtieth of a second. Phaser holds its first
 * 120 frames to a sixtieth, and a frame longer than a fifth of a second to
 * an earlier frame's time, so a page drawing in software, a few frames a
 * second, moves the field on a few times slower than the clock; a page
 * between moves it on by the clock, so a wait counted so may run long,
 * never short.
 */
const MOST_FRAME_MS = 1000 / 60;

/**
 * How long each wait in the page may take at most, in milliseconds of the
 * clock: a page drawing in software can take this long over the field's
 * few seconds.
 */
const WAIT_CLOCK_MS = 60_000;

/**
 * The field, by its name, its element, and its element's attribute that says
 * where the scene drew it on the canvas.
 */
const FIELD = { name: "field", element: "app-board", drawnAt: "data-field" };

/**
 * The run shown, as `keptRun()` keeps it, but for its field's shape, which
 * the page gives: begun on Crowd at Normal, played until a second before
 * the wave's first stray comes.
 *
 * @type {Omit<ScreenshotRun, "torus">}
 */
export const RUN = {
  wave: 9,
  speed: "normal",
  seed: 9,
  strayInMs: 1000,
};

/**
 * The run as storage keeps it, which the page is given, its score as the
 * game writes points, and how long to wait once its stray is said, in the
 * field's time.
 *
 * @typedef {{stored: string, score: string, afterStrayMs: number}} ShownRun
 */

/**
 * Returns the field's shape as the board laid it out, once the scene has
 * drawn. It runs in the page, so it uses nothing from this module.
 *
 * @returns {FieldShape | null}
 */
function readShape() {
  const board = document.querySelector("app-board");
  if (!(board instanceof HTMLElement)) return null;
  const width = Number(board.style.getPropertyValue("--across"));
  const height = Number(board.style.getPropertyValue("--down"));
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * How `goOn()` waits for the stray, its times in milliseconds.
 *
 * @typedef {object} StrayWait
 * @property {string} strayWords What the announcer says as a stray comes
 *   in.
 * @property {number} waitMs How long to wait for it at most, in the
 *   field's time.
 * @property {number} afterMs How long to wait once it is said, in the
 *   field's time.
 * @property {number} mostFrameMs The most a frame of the page counts for.
 * @property {number} clockMs How long each wait may take at most, by the
 *   clock.
 */

/**
 * What the board says once `goOn()` has waited: the run's outcome, whether
 * the stray drifted in, and whether the page drew fast enough to wait as
 * long as it was asked.
 *
 * @typedef {{outcome: string, strayed: boolean, waited: boolean}} GoneOn
 */

/**
 * Goes on with the run taken up, by the card's Resume, holds Space down on
 * the board, so the ship's first move ends its wait and it fires, waits for
 * the stray to drift in and a while more, and returns what the board says
 * then. It runs in the page, so it uses nothing from this module.
 *
 * Its waits are counted in the field's time, each frame of the page as its
 * time on the clock up to `mostFrameMs`, so a page drawing slowly, as one
 * drawing in software does, waits at least as long in the game as a fast
 * one.
 *
 * @param {StrayWait} wait
 * @returns {Promise<GoneOn>}
 */
async function goOn({ strayWords, waitMs, afterMs, mostFrameMs, clockMs }) {
  const resume = [...document.querySelectorAll("app-board .card button")].find(
    (button) => button.textContent?.trim() === "Resume",
  );
  if (resume instanceof HTMLButtonElement) resume.click();
  // Phaser reads a key's code from `keyCode`, which a made event leaves 0.
  const space = new KeyboardEvent("keydown", {
    key: " ",
    code: "Space",
    bubbles: true,
  });
  Object.defineProperty(space, "keyCode", { get: () => 32 });
  document.querySelector("app-board")?.dispatchEvent(space);
  let fieldMs = 0;
  let counting = true;
  let last = performance.now();
  /** @param {number} now */
  const count = (now) => {
    fieldMs += Math.max(0, Math.min(now - last, mostFrameMs));
    last = now;
    if (counting) requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
  /**
   * @param {() => boolean} done
   * @returns {Promise<boolean>}
   */
  const until = async (done) => {
    const started = performance.now();
    while (!done() && performance.now() - started < clockMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return done();
  };
  const said = () =>
    [...document.querySelectorAll("[aria-live]")].some((region) =>
      region.textContent?.includes(strayWords),
    );
  let waited = await until(() => said() || fieldMs >= waitMs);
  const strayed = said();
  if (strayed) {
    const saidAt = fieldMs;
    waited = await until(() => fieldMs >= saidAt + afterMs);
  }
  counting = false;
  return {
    outcome:
      document.querySelector("app-board")?.getAttribute("data-outcome") ?? "",
    strayed,
    waited,
  };
}

/**
 * Opens the game on a page of its own and returns the shape its board lays
 * the field out in, or null if it drew none.
 *
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<FieldShape | null>}
 */
async function shapeOn(page, url) {
  await setUpPage(page, { theme: THEME });
  await page.navigate(url);
  if (!(await settled(page, PHASER_CANVAS_READY))) return null;
  return page.evaluate(readShape);
}

/**
 * Opens the run on a page of its own and returns the screenshot, or why it
 * could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @param {ShownRun} run
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url, run) {
  await setUpPage(page, {
    theme: THEME,
    stored: { [SAVED_GAME_KEY]: run.stored },
  });
  await page.navigate(url);
  const field = await takenUpBoard(page, FIELD, run.score);
  if ("problem" in field) return field;
  const goneOn = await page.evaluate(goOn, {
    strayWords: STRAY_WORDS,
    waitMs: STRAY_WAIT_MS,
    afterMs: run.afterStrayMs,
    mostFrameMs: MOST_FRAME_MS,
    clockMs: WAIT_CLOCK_MS,
  });
  if (!goneOn.waited) {
    return { problem: "the page drew too slowly to wait for the stray" };
  }
  if (goneOn.outcome !== "playing") {
    return { problem: `the run didn't go on: ${goneOn.outcome}` };
  }
  if (!goneOn.strayed) return { problem: "no stray drifted in" };
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(field, SCREENSHOT_VIEWPORT),
    says: `Took up the run with a score of ${run.score}, and went on with it as a stray drifted in.`,
  };
}

/**
 * Returns the shape the page lays the field out in, then the run kept on
 * it, captured, or why it could not be.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @param {() => Promise<ScreenshotApi>} load
 * @returns {Promise<Shot | Missed>}
 */
async function shapeAndCapture(devtools, url, load) {
  // Each on a page of its own, so the first page, going away, keeps no run
  // over the one the second takes up.
  const torus = await withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
    shapeOn(page, url),
  );
  if (!torus) return { problem: "the board laid no field out" };
  const run = shownRun(await load(), torus);
  return withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
    capture(page, url, run),
  );
}

/**
 * Returns the run shown on a field of a shape: kept as the game keeps it,
 * stamped with the version the shell keeps it under, its score as the game
 * writes it, and how long to wait once its stray is said, in the field's
 * time.
 *
 * @param {ScreenshotApi} api
 * @param {FieldShape} torus
 * @returns {ShownRun}
 */
export function shownRun(api, torus) {
  const saved = api.keptRun({ ...RUN, torus });
  return {
    stored: storedRun(api, saved),
    score: api.formatPoints(saved.score),
    // The ship's guard, which blinks it, began as it first moved, the run's
    // lead on the stray before the stray came.
    afterStrayMs:
      Math.max(0, api.newShipGuardMs - RUN.strayInMs) + STRAY_SETTLE_MS,
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
    game: "Asteroid Breaker",
    root: ROOT,
    port: 9005,
    capture: async (devtools, { url, force }, printer) =>
      keepShot(
        await shapeAndCapture(devtools, url, load),
        SCREENSHOT_DIR,
        printer,
        { force },
      ),
  };
}

/**
 * Captures the screenshots a command line asks for, or prints its usage,
 * and returns the code to exit with: 0, 1 if nothing answers at the server
 * or the run couldn't be captured, or 2 for a command line it can't read,
 * before Chrome starts.
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
