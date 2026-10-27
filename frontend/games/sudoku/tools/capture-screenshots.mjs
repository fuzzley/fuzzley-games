#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Sudoku from a running server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the board and the
 * pad, to `public/docs/screenshots/sudoku/`. Both show the same game, part played:
 * the deal is seeded at Medium, a third of its blanks are filled in by hints,
 * a few squares hold their candidates as notes, and one square is selected,
 * so the board shows its shading. The palette is Midnight blue, which sets
 * the game apart from the green and dark tables beside it in the catalog.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { withChrome, withPage } from "@fz/dev/chrome";
import { SITE_IMAGES, writeSiteImages } from "@fz/dev/screenshots";
import { THEME_STORAGE_KEY } from "@fz/style/themes";

/** @import { Page } from "@fz/dev/chrome" */

const USAGE = `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Sudoku from a running server.

  --url <url>      The server (default: http://localhost:9002/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/sudoku");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The palette the screenshot is taken in. */
const THEME = "midnight";

/** Seeds the page's `Math.random`, which the game deals from. */
const SEED = 11;

/** How many squares the hints fill in before the screenshot. */
const FILLS = 14;

/** How many blank squares get their candidates as notes. */
const NOTED = 5;

/** The page kept around the board and the pad in the thumbnail, in CSS pixels. */
const THUMB_MARGIN = 24;

/** What the clock reads when the screenshot is taken, in seconds. */
const CLOCK_SECONDS = 312;

/** Where the game keeps the settings, which set the level dealt. */
const SETTINGS_KEY = "sudoku-settings";

/** Where the game keeps the game in progress, which sets the clock. */
const SAVED_GAME_KEY = "sudoku-game";

/**
 * What the opening left on the board.
 *
 * @typedef {{filled: number, noted: number}} Opening
 */

/**
 * What the page shows once it has reloaded the game.
 *
 * @typedef {{boards: number, noted: number, openDialogs: number, time: string, room: Region}} PageState
 */

/**
 * A part of the page, in CSS pixels.
 *
 * @typedef {{left: number, top: number, width: number, height: number}} Region
 */

/**
 * Seeds `Math.random`, chooses the palette and the level, and sets the clock
 * of a game in progress, before the game starts. It runs in the page, so it
 * uses nothing from this module.
 *
 * @param {number} seed
 * @param {number} seconds
 * @param {string} settingsKey Where the game keeps the settings.
 * @param {string} gameKey Where the game keeps the game in progress.
 * @param {string} theme
 * @param {string} themeKey Where the palette the player chose is kept.
 */
function preparePage(seed, seconds, settingsKey, gameKey, theme, themeKey) {
  // Mulberry32, as the game's own random numbers are.
  let state = seed;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  localStorage.setItem(themeKey, theme);
  localStorage.setItem(
    settingsKey,
    JSON.stringify({
      version: 1,
      level: "medium",
      markMistakes: false,
      clearNotes: true,
    }),
  );
  const saved = localStorage.getItem(gameKey);
  if (saved) {
    localStorage.setItem(
      gameKey,
      JSON.stringify({ ...JSON.parse(saved), seconds }),
    );
  }
}

/**
 * Plays the opening of a game: asks for a hint and fills it in, as often as
 * asked, then notes every candidate in the first blank squares, working
 * them out from the digits around each. It runs in the page, so it uses
 * nothing from this module.
 *
 * @param {number} fills How many squares the hints fill in.
 * @param {number} noted How many blank squares get their notes.
 * @returns {Promise<Opening>}
 */
async function playOpening(fills, noted) {
  /** @returns {Promise<void>} */
  const settle = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
  for (let i = 0; i < 100 && !document.querySelector(".board"); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  /** @returns {HTMLElement[]} */
  const squares = () =>
    [...document.querySelectorAll('[role="gridcell"]')].map(
      (square) => /** @type {HTMLElement} */ (square),
    );
  /**
   * @param {HTMLElement} square
   * @returns {number}
   */
  const digitOf = (square) =>
    Number(/^\d/.exec(square.getAttribute("aria-label") ?? "")?.[0] ?? 0);
  /**
   * @param {HTMLElement} square
   * @param {string} code
   * @param {string} key
   * @param {boolean} shiftKey
   */
  const press = (square, code, key, shiftKey) => {
    square.dispatchEvent(
      new KeyboardEvent("keydown", { code, key, shiftKey, bubbles: true }),
    );
  };

  const first = squares()[0];
  if (!first) throw new Error("No board showed.");
  for (let i = 0; i < fills * 2; i++) press(first, "KeyH", "h", false);
  await settle();

  let done = 0;
  for (const square of squares()) {
    if (done === noted) break;
    if (digitOf(square) !== 0) continue;
    const row = Number(square.dataset["row"]);
    const col = Number(square.dataset["col"]);
    const seen = new Set(
      squares()
        .filter((other) => {
          const r = Number(other.dataset["row"]);
          const c = Number(other.dataset["col"]);
          const box =
            Math.floor(r / 3) === Math.floor(row / 3) &&
            Math.floor(c / 3) === Math.floor(col / 3);
          return r === row || c === col || box;
        })
        .map(digitOf),
    );
    square.click();
    for (let digit = 1; digit <= 9; digit++) {
      if (!seen.has(digit)) press(square, `Digit${digit}`, "", true);
    }
    done++;
  }
  await settle();
  return {
    filled: squares().filter(
      (square) => !/given|Blank/.test(square.getAttribute("aria-label") ?? ""),
    ).length,
    noted: done,
  };
}

/**
 * Waits for the reloaded game to show and paint, selects a square in the
 * middle that holds a digit, so the board shows its shading, and returns
 * what the page shows. It runs in the page, so it uses nothing from this
 * module.
 *
 * @returns {Promise<PageState>}
 */
async function describePage() {
  for (let i = 0; i < 100 && !document.querySelector(".board"); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const squares = [...document.querySelectorAll('[role="gridcell"]')];
  const middle = squares
    .slice(36, 45)
    .find((square) => /^\d/.test(square.getAttribute("aria-label") ?? ""));
  if (middle instanceof HTMLElement) middle.click();
  await document.fonts.ready;
  for (let i = 0; i < 2; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const timer = [...document.querySelectorAll("dt")].find(
    (term) => term.textContent?.trim() === "Time",
  );
  const board = document.querySelector(".board")?.getBoundingClientRect();
  const pad = document.querySelector("app-pad")?.getBoundingClientRect();
  const left = Math.min(board?.left ?? 0, pad?.left ?? 0);
  const top = Math.min(board?.top ?? 0, pad?.top ?? 0);
  return {
    boards: document.querySelectorAll(".board").length,
    noted: squares.filter((square) =>
      (square.getAttribute("aria-label") ?? "").includes("notes"),
    ).length,
    openDialogs: document.querySelectorAll("dialog[open]").length,
    time: timer?.nextElementSibling?.textContent?.trim() ?? "",
    room: {
      left,
      top,
      width: Math.max(board?.right ?? 0, pad?.right ?? 0) - left,
      height: Math.max(board?.bottom ?? 0, pad?.bottom ?? 0) - top,
    },
  };
}

/**
 * Returns the part of the capture the thumbnail keeps: the board and the pad
 * with a margin around them, widened to the thumbnail's shape and kept on
 * the page, in the capture's pixels.
 *
 * @param {Region} room The board and the pad, in CSS pixels.
 * @returns {Region}
 */
function thumbRegion(room) {
  const { width: thumbWidth, height: thumbHeight } = SITE_IMAGES.thumb;
  const height = Math.min(room.height + 2 * THUMB_MARGIN, VIEWPORT.height);
  const width = Math.min((height * thumbWidth) / thumbHeight, VIEWPORT.width);
  const centerX = room.left + room.width / 2;
  const centerY = room.top + room.height / 2;
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
 * Plays the opening on a page of its own and returns the screenshot, or why
 * it could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<{png: Buffer, opening: Opening, page: PageState} | {problem: string}>}
 */
async function capture(page, url) {
  await page.beforeLoad(
    preparePage,
    SEED,
    CLOCK_SECONDS,
    SETTINGS_KEY,
    SAVED_GAME_KEY,
    THEME,
    THEME_STORAGE_KEY,
  );
  await page.navigate(url);
  const opening = await page.evaluate(playOpening, FILLS, NOTED);
  if (opening.noted !== NOTED) return { problem: "too few squares were noted" };

  // The game saves itself as it goes; the reload takes the clock from it.
  await page.reload();
  const shown = await page.evaluate(describePage);
  if (shown.boards !== 1) return { problem: "the board did not show" };
  if (shown.noted !== NOTED) return { problem: "the game was not restored" };
  if (shown.openDialogs > 0) return { problem: "a dialog is open" };

  return { png: await page.screenshot(), opening, page: shown };
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
      url: { type: "string", default: "http://localhost:9002/" },
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
    { chrome: options.chrome, name: "sudoku" },
    (devtools) =>
      withPage(devtools, VIEWPORT, (page) => capture(page, options.url)),
  );
  if ("problem" in shot) {
    console.error(`Not captured: ${shot.problem}.`);
    process.exitCode = 1;
    return;
  }
  const { opening, page } = shot;
  console.log(
    `Filled ${opening.filled} squares, noted ${opening.noted}, ` +
      `the clock at ${page.time}.`,
  );
  const sizes = await writeSiteImages(shot.png, SCREENSHOT_DIR, {
    thumbRegion: thumbRegion(page.room),
  });
  for (const [file, bytes] of sizes) {
    console.log(`${file}: ${Math.round(bytes / 1024)} KB`);
  }
}

await main();
