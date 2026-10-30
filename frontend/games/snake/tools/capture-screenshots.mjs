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
 * says the run is paused, toward the apple. The palette is Soft pastel.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { withChrome, withPage } from "@fz/dev/chrome";
import { SITE_IMAGES, writeSiteImages } from "@fz/dev/screenshots";
import { THEME_STORAGE_KEY } from "@fz/style/themes";

/** @import { Page } from "@fz/dev/chrome" */

const USAGE = `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Snake from a running server.

  --url <url>      The server (default: http://localhost:9003/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/snake");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The palette the screenshot is taken in. */
const THEME = "pastel";

/** The page kept around the board in the thumbnail, in CSS pixels. */
const THUMB_MARGIN = 24;

/** Where the game keeps the run under way. */
const SAVED_GAME_KEY = "snake-game";

/** Where the game keeps the stats, which set the best score shown. */
const STATS_KEY = "snake-stats";

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
 * What the page shows once the run is taken up.
 *
 * @typedef {{state: string, outcome: string, score: string, board: Region | null}} PageState
 */

/**
 * A part of the page, in CSS pixels.
 *
 * @typedef {{left: number, top: number, width: number, height: number}} Region
 */

/**
 * Keeps the run and the stats, and chooses the palette, before the game
 * starts. It runs in the page, so it uses nothing from this module.
 *
 * @param {string} run The run, as stored.
 * @param {string} stats The stats, as stored.
 * @param {string} gameKey Where the game keeps the run.
 * @param {string} statsKey Where the game keeps the stats.
 * @param {string} theme
 * @param {string} themeKey Where the palette the player chose is kept.
 */
function preparePage(run, stats, gameKey, statsKey, theme, themeKey) {
  localStorage.setItem(gameKey, run);
  localStorage.setItem(statsKey, stats);
  localStorage.setItem(themeKey, theme);
}

/**
 * Waits for the scene to draw and the apple to pop up, then returns what
 * the page shows. It runs in the page, so it uses nothing from this module.
 *
 * @returns {Promise<PageState>}
 */
async function describePage() {
  const host = () => document.querySelector("fz-phaser-canvas");
  // A host not yet rendered is still loading too.
  const loading = () =>
    (host()?.getAttribute("data-state") ?? "loading") === "loading";
  for (let i = 0; i < 200 && loading(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await document.fonts.ready;
  // Long enough for the apple's pop and the placeholder's fade.
  await new Promise((resolve) => setTimeout(resolve, 800));
  const board = document.querySelector("app-board");
  const canvas = document
    .querySelector("fz-phaser-canvas canvas")
    ?.getBoundingClientRect();
  const [x = 0, y = 0, width = 0, height = 0] = (
    board?.getAttribute("data-board") ?? ""
  )
    .split(" ")
    .map(Number);
  const score = [...document.querySelectorAll("dt")].find(
    (term) => term.textContent?.trim() === "Score",
  );
  return {
    state: host()?.getAttribute("data-state") ?? "",
    outcome: board?.getAttribute("data-outcome") ?? "",
    score: score?.nextElementSibling?.textContent?.trim() ?? "",
    board: canvas
      ? { left: canvas.left + x, top: canvas.top + y, width, height }
      : null,
  };
}

/**
 * Returns the part of the capture the thumbnail keeps: the board with a
 * margin around it, widened to the thumbnail's shape and kept on the page,
 * in the capture's pixels.
 *
 * @param {Region} board The board, in CSS pixels.
 * @returns {Region}
 */
function thumbRegion(board) {
  const { width: thumbWidth, height: thumbHeight } = SITE_IMAGES.thumb;
  const height = Math.min(board.height + 2 * THUMB_MARGIN, VIEWPORT.height);
  const width = Math.min((height * thumbWidth) / thumbHeight, VIEWPORT.width);
  const centerX = board.left + board.width / 2;
  const centerY = board.top + board.height / 2;
  const left = Math.min(
    Math.max(0, centerX - width / 2),
    VIEWPORT.width - width,
  );
  const top = Math.min(
    Math.max(0, centerY - height / 2),
    VIEWPORT.height - height,
  );
  const scale = VIEWPORT.deviceScaleFactor;
  return {
    left: Math.round(left * scale),
    top: Math.round(top * scale),
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Opens the run on a page of its own and returns the screenshot, or why it
 * could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<{png: Buffer, page: PageState & {board: Region}} | {problem: string}>}
 */
async function capture(page, url) {
  await page.beforeLoad(
    preparePage,
    JSON.stringify(RUN),
    JSON.stringify(STATS),
    SAVED_GAME_KEY,
    STATS_KEY,
    THEME,
    THEME_STORAGE_KEY,
  );
  await page.navigate(url);
  const shown = await page.evaluate(describePage);
  if (shown.state !== "ready") return { problem: "the board did not draw" };
  if (shown.outcome !== "paused")
    return { problem: "the run was not taken up" };
  if (shown.score !== String(RUN.eaten)) {
    return { problem: `the score reads ${shown.score}` };
  }
  const { board } = shown;
  if (!board) return { problem: "the board is missing" };
  return { png: await page.screenshot(), page: { ...shown, board } };
}

/**
 * Returns the options the command line sets.
 *
 * @returns {{url: string, chrome?: string} | undefined} Nothing when it asks
 *   only for help.
 */
function parseCommandLine() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: "http://localhost:9003/" },
      chrome: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return undefined;
  }
  return { url: values.url, chrome: values.chrome };
}

async function main() {
  const options = parseCommandLine();
  if (!options) return;
  await fetch(options.url).catch(() => {
    throw new Error(
      `Nothing answers at ${options.url}; start the game with yarn dev.`,
    );
  });

  const shot = await withChrome(
    { chrome: options.chrome, name: "snake" },
    (devtools) =>
      withPage(devtools, VIEWPORT, (page) => capture(page, options.url)),
  );
  if ("problem" in shot) {
    console.error(`Not captured: ${shot.problem}.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Took up the run, paused with a score of ${shot.page.score}.`);
  const sizes = await writeSiteImages(shot.png, SCREENSHOT_DIR, {
    thumbRegion: thumbRegion(shot.page.board),
  });
  for (const [file, bytes] of sizes) {
    console.log(`${file}: ${Math.round(bytes / 1024)} KB`);
  }
}

await main();
