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
  PHASER_CANVAS_SETTLED,
  describePhaserPage,
  keepShot,
  runScreenshotScript,
  setUpPage,
  settled,
  thumbRegionAround,
} from "@fz/dev/screenshots";
import { CONSOLE, importThroughVite } from "@fz/dev/script";

/** @import { DevToolsConnection, Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */
/** @import { ScriptIo } from "@fz/dev/script" */
/** @import { FieldShape, ScreenshotApi, ScreenshotRun } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/asteroid-breaker");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** The page kept around the field in the thumbnail, in CSS pixels. */
const THUMB_MARGIN = 24;

/**
 * Where the game keeps the run under way: a copy of `SAVED_GAME_KEY` in
 * `src/app/play/saved_game.service.ts`, the shell's, which the scripts'
 * entries, fenced as the rules are, can't import.
 */
const SAVED_GAME_KEY = "asteroid-breaker-game";

/** What the announcer says as a stray comes in, which the screenshot waits for. */
const STRAY_WORDS = "A stray fuzzball drifts in.";

/** How long the stray takes to come in off the edge once it is said, in milliseconds. */
const STRAY_SETTLE_MS = 500;

/**
 * The board's element, and its attribute that says where the scene drew the
 * field on the canvas.
 */
const BOARD = { element: "app-board", drawnAt: "data-field" };

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
 * game writes points, and how long to wait once its stray is said.
 *
 * @typedef {{stored: string, score: string, afterStrayMs: number}} ShownRun
 */

/**
 * Returns what the script takes from the game's own code, `SCREENSHOT_API`
 * in `src/testing/screenshot_api.ts`, loaded through Vite.
 *
 * @returns {Promise<ScreenshotApi>}
 */
export async function loadScreenshotApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/screenshot_api.ts"),
    ROOT,
  );
  return /** @type {ScreenshotApi} */ (module["SCREENSHOT_API"]);
}

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
 * Goes on with the run taken up, by the card's Resume, holds Space down on
 * the board, so the ship's first move ends its wait and it fires, waits for
 * the stray to drift in and a while more, and returns what the board says
 * then. It runs in the page, so it uses nothing from this module.
 *
 * @param {string} strayWords What the announcer says as a stray comes in.
 * @param {number} afterMs How long to wait once the stray is said.
 * @returns {Promise<{outcome: string, strayed: boolean}>}
 */
async function goOn(strayWords, afterMs) {
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
  const said = () =>
    [...document.querySelectorAll("[aria-live]")].some((region) =>
      region.textContent?.includes(strayWords),
    );
  for (let i = 0; i < 40 && !said(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const strayed = said();
  await new Promise((resolve) => setTimeout(resolve, afterMs));
  return {
    outcome:
      document.querySelector("app-board")?.getAttribute("data-outcome") ?? "",
    strayed,
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
  await settled(page, PHASER_CANVAS_SETTLED);
  const shown = await page.evaluate(describePhaserPage, BOARD);
  if (shown.state !== "ready") return { problem: "the field did not draw" };
  if (shown.outcome !== "paused") {
    return { problem: "the run was not taken up" };
  }
  if (shown.score !== run.score) {
    return { problem: `the score reads ${shown.score}` };
  }
  const field = shown.board;
  if (!field) return { problem: "the field is missing" };
  const goneOn = await page.evaluate(goOn, STRAY_WORDS, run.afterStrayMs);
  if (goneOn.outcome !== "playing") {
    return { problem: `the run didn't go on: ${goneOn.outcome}` };
  }
  if (!goneOn.strayed) return { problem: "no stray drifted in" };
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(field, VIEWPORT, THUMB_MARGIN),
    says: `Took up the run with a score of ${shown.score}, and went on with it as a stray drifted in.`,
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
  const torus = await withPage(devtools, VIEWPORT, (page) =>
    shapeOn(page, url),
  );
  if (!torus) return { problem: "the board laid no field out" };
  const run = shownRun(await load(), torus);
  return withPage(devtools, VIEWPORT, (page) => capture(page, url, run));
}

/**
 * Returns the run shown on a field of a shape: kept as the game keeps it,
 * stamped with the version the shell keeps it under, its score as the game
 * writes it, and how long to wait once its stray is said.
 *
 * @param {ScreenshotApi} api
 * @param {FieldShape} torus
 * @returns {ShownRun}
 */
export function shownRun(api, torus) {
  const saved = api.keptRun({ ...RUN, torus });
  return {
    stored: JSON.stringify({ version: api.savedGameVersion, ...saved }),
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
    capture: async (devtools, { url }, printer) =>
      keepShot(
        await shapeAndCapture(devtools, url, load),
        SCREENSHOT_DIR,
        printer,
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
