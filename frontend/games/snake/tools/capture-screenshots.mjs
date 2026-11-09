#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Snake from a running server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the board, to
 * `public/docs/screenshots/snake/`. Both show the same run, kept as the game
 * keeps one and taken up paused on load: at Normal, twelve apples in, the
 * snake bending across the upper half of the board, clear of the card that
 * says the run is paused, toward the apple. The palette is Casino night,
 * dark as the classics' are in the catalog, and Brick Breaker beside it
 * takes the other dark one.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withPage } from "@fz/dev/chrome";
import {
  SCREENSHOT_VIEWPORT,
  keepShot,
  runScreenshotScript,
  setUpPage,
  siteImagesFolder,
  takenUpBoard,
  thumbRegionAround,
} from "@fz/dev/screenshots";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "snake");

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** Where the game keeps the run under way. */
const SAVED_GAME_KEY = "snake-game";

/** Where the game keeps the stats, which set the best score shown. */
const STATS_KEY = "snake-stats";

/**
 * The board, by its name, its element, and its element's attribute that says
 * where the scene drew it on the canvas.
 */
const BOARD = { name: "board", element: "app-board", drawnAt: "data-board" };

/**
 * The run shown, as the game keeps one: the snake from head to tail, three
 * squares and one for each apple eaten, heading right.
 */
const RUN = {
  version: 1,
  snake: [
    [10, 7],
    [9, 7],
    [8, 7],
    [8, 6],
    [8, 5],
    [8, 4],
    [7, 4],
    [6, 4],
    [5, 4],
    [4, 4],
    [3, 4],
    [3, 5],
    [3, 6],
    [3, 7],
    [3, 8],
  ],
  heading: "right",
  turns: [],
  apple: [13, 5],
  seed: 7,
  eaten: 12,
  speed: "normal",
  steps: 164,
};

/** The stats kept beside it, for a best score above the run's. */
const STATS = {
  version: 1,
  slow: { runs: 3, best: 9, longest: 12 },
  normal: { runs: 14, best: 21, longest: 24 },
  fast: { runs: 2, best: 6, longest: 9 },
};

/**
 * Opens the run on a page of its own and returns the screenshot, or why it
 * could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url) {
  await setUpPage(page, {
    theme: THEME,
    stored: {
      [SAVED_GAME_KEY]: JSON.stringify(RUN),
      [STATS_KEY]: JSON.stringify(STATS),
    },
  });
  await page.navigate(url);
  const score = String(RUN.eaten);
  const board = await takenUpBoard(page, BOARD, score);
  if ("problem" in board) return board;
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(board, SCREENSHOT_VIEWPORT),
    says: `Took up the run, paused with a score of ${score}.`,
  };
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "Snake",
  root: ROOT,
  port: 9003,
  capture: async (devtools, { url }, printer) =>
    keepShot(
      await withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
        capture(page, url),
      ),
      SCREENSHOT_DIR,
      printer,
    ),
};

process.exitCode = await runScreenshotScript(SCRIPT);
