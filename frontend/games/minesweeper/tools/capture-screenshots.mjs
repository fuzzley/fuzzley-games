#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Minesweeper from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp` to
 * `public/docs/screenshots/minesweeper/`. Both show the same game, part
 * played: the deal is seeded, the moves are the ones the numbers force, and
 * one mine is stepped on to show a life lost. The page opens in a browser
 * context of its own, so the difficulty is the default; the palette is Casino
 * night, which sets the game apart from the Solitaire Collection's green
 * tables beside it in the catalog.
 */
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { withChrome, withPage } from "@fz/dev/chrome";
import sharp from "sharp";

/** @import { Page } from "@fz/dev/chrome" */

const USAGE = `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Minesweeper from a running server.

  --url <url>      The server (default: http://localhost:9001/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/minesweeper");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/**
 * The images written from the screenshot, each at least twice the CSS size
 * the site shows it at, so that it stays sharp on a high density display:
 * the preview at up to 1200 CSS px wide, the thumbnail at up to about 288.
 */
const OUTPUTS = [
  { file: "preview.webp", width: 2560, height: 1440, quality: 80 },
  { file: "thumb.webp", width: 576, height: 324, quality: 80 },
];

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** Where the site and the games keep the palette the player chose. */
const THEME_KEY = "fuzzley-theme";

/** Seeds the page's `Math.random`, which the game deals from. */
const SEED = 7;

/** How much of the field the opening clears before it stops, from 0 to 1. */
const OPEN_SHARE = 0.45;

/** What the clock reads when the screenshot is taken, in seconds. */
const CLOCK_SECONDS = 84;

/** Where the game keeps the game in progress, which sets the clock. */
const SAVED_GAME_KEY = "minesweeper-game";

/**
 * What the opening left on the board.
 *
 * @typedef {{open: number, flagged: number, tripped: number}} Opening
 */

/**
 * What the page shows once it has reloaded the game.
 *
 * @typedef {{boards: number, tripped: number, openDialogs: number, time: string}} PageState
 */

/**
 * Seeds `Math.random`, chooses the palette, and sets the clock of a game in
 * progress, before the game starts. It runs in the page, so it uses nothing
 * from this module.
 *
 * @param {number} seed
 * @param {number} seconds
 * @param {string} key Where the game keeps the game in progress.
 * @param {string} theme
 * @param {string} themeKey Where the palette the player chose is kept.
 */
function preparePage(seed, seconds, key, theme, themeKey) {
  // Mulberry32, as the game's own random numbers are.
  let state = seed;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  localStorage.setItem(themeKey, theme);
  const saved = localStorage.getItem(key);
  if (saved) {
    localStorage.setItem(
      key,
      JSON.stringify({ ...JSON.parse(saved), seconds }),
    );
  }
}

/**
 * Plays the opening of a game: reveals the middle square, then flags the
 * mines the numbers give away and opens the squares they clear until enough
 * of the field is open, and steps on the last mine it flagged. It runs in the
 * page, so it uses nothing from this module.
 *
 * @param {number} share How much of the field to clear, from 0 to 1.
 * @returns {Promise<Opening>}
 */
async function playOpening(share) {
  /** @returns {Promise<void>} */
  const settle = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
  for (let i = 0; i < 100 && !document.querySelector(".board"); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const board = document.querySelector(".board");
  if (!(board instanceof HTMLElement)) throw new Error("No board showed.");
  const cols = Number(board.style.getPropertyValue("--cols"));

  /** @returns {HTMLElement[]} */
  const squares = () =>
    [...board.querySelectorAll("[data-index]")].map(
      (square) => /** @type {HTMLElement} */ (square),
    );
  /**
   * @param {HTMLElement} square
   * @param {string} type
   */
  const press = (square, type) => {
    square.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true }),
    );
  };
  /**
   * @param {number} index
   * @param {number} count
   * @returns {number[]}
   */
  const around = (index, count) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const found = [];
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = col - 1; c <= col + 1; c++) {
        const inside = r >= 0 && c >= 0 && c < cols && r * cols + c < count;
        if (inside && (r !== row || c !== col)) found.push(r * cols + c);
      }
    }
    return found;
  };
  /**
   * @param {string[]} states
   * @returns {number}
   */
  const cleared = (states) =>
    states.filter((state) => state === "number" || state === "blank").length;

  const rows = squares().length / cols;
  const middle = squares()[Math.floor(rows / 2) * cols + Math.floor(cols / 2)];
  if (!middle) throw new Error("The board has no squares.");
  press(middle, "click");
  await settle();

  /** @type {HTMLElement | undefined} */
  let lastFlag;
  for (;;) {
    const all = squares();
    const states = all.map((square) => square.dataset["show"] ?? "");
    if (cleared(states) >= share * all.length) break;
    const mines = new Set();
    const safe = new Set();
    all.forEach((square, index) => {
      if (states[index] !== "number") return;
      const near = around(index, all.length);
      const hidden = near.filter((n) => states[n] === "hidden");
      const known = near.filter(
        (n) => states[n] === "flagged" || states[n] === "tripped",
      ).length;
      const left = Number(square.dataset["n"]) - known;
      if (hidden.length > 0 && left === hidden.length) {
        for (const n of hidden) mines.add(n);
      } else if (hidden.length > 0 && left === 0) {
        for (const n of hidden) safe.add(n);
      }
    });
    if (mines.size === 0 && safe.size === 0) break;
    for (const n of mines) {
      lastFlag = all[n];
      if (lastFlag) press(lastFlag, "contextmenu");
    }
    for (const n of safe) {
      const square = all[n];
      if (square) press(square, "click");
    }
    await settle();
  }

  if (lastFlag) {
    press(lastFlag, "contextmenu");
    await settle();
    press(lastFlag, "click");
    await settle();
  }
  const states = squares().map((square) => square.dataset["show"] ?? "");
  return {
    open: cleared(states) / states.length,
    flagged: states.filter((state) => state === "flagged").length,
    tripped: states.filter((state) => state === "tripped").length,
  };
}

/**
 * Waits for the reloaded game to show and paint, and returns what it shows.
 * It runs in the page, so it uses nothing from this module.
 *
 * @returns {Promise<PageState>}
 */
async function describePage() {
  for (let i = 0; i < 100 && !document.querySelector(".board"); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await document.fonts.ready;
  for (let i = 0; i < 2; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const timer = [...document.querySelectorAll("dt")].find(
    (term) => term.textContent?.trim() === "Time",
  );
  return {
    boards: document.querySelectorAll(".board").length,
    tripped: document.querySelectorAll('[data-show="tripped"]').length,
    openDialogs: document.querySelectorAll("dialog[open]").length,
    time: timer?.nextElementSibling?.textContent?.trim() ?? "",
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
    SAVED_GAME_KEY,
    THEME,
    THEME_KEY,
  );
  await page.navigate(url);
  const opening = await page.evaluate(playOpening, OPEN_SHARE);
  if (opening.tripped !== 1) return { problem: "no mine was stepped on" };

  // The game saves itself as it goes; the reload takes the clock from it.
  await page.reload();
  const shown = await page.evaluate(describePage);
  if (shown.boards !== 1) return { problem: "the board did not show" };
  if (shown.tripped !== 1) return { problem: "the game was not restored" };
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
      url: { type: "string", default: "http://localhost:9001/" },
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
    { chrome: options.chrome, name: "minesweeper" },
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
    `Cleared ${Math.round(opening.open * 100)}%, ${opening.flagged} flags, ` +
      `the clock at ${page.time}.`,
  );
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  for (const output of OUTPUTS) {
    const target = join(SCREENSHOT_DIR, output.file);
    await sharp(shot.png)
      .resize(output.width, output.height)
      // Smart subsampling keeps the numbers' inks from bleeding.
      .webp({ quality: output.quality, smartSubsample: true })
      .toFile(target);
    const kilobytes = Math.round((await stat(target)).size / 1024);
    console.log(`${output.file}: ${kilobytes} KB`);
  }
}

await main();
