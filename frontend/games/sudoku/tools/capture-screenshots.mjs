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
import { withPage } from "@fz/dev/chrome";
import {
  SCREENSHOT_VIEWPORT,
  keepShot,
  runScreenshotScript,
  setUpPage,
  settled,
  siteImagesFolder,
  thumbRegionAround,
} from "@fz/dev/screenshots";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, Region, ScreenshotScript, Shot } from "@fz/dev/screenshots" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "sudoku");

/** The palette the screenshot is taken in. */
const THEME = "midnight";

/** Seeds the page's `Math.random`, which the game deals from. */
const SEED = 11;

/** How many squares the hints fill in before the screenshot. */
const FILLS = 14;

/** How many blank squares get their candidates as notes. */
const NOTED = 5;

/** What the clock reads when the screenshot is taken, in seconds. */
const CLOCK_SECONDS = 312;

/** Where the game keeps the settings, which set the level dealt. */
const SETTINGS_KEY = "sudoku-settings";

/** Where the game keeps the game in progress, which sets the clock. */
const SAVED_GAME_KEY = "sudoku-game";

/** The settings the game is dealt at: Medium, with nothing marked. */
const SETTINGS = {
  version: 1,
  level: "medium",
  markMistakes: false,
  clearNotes: true,
};

/** The selector the page matches once the game shows. */
const BOARD = ".board";

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
 * Plays the opening of a game: asks for a hint and fills it in, as often as
 * asked, then notes every candidate in the first blank squares, working
 * them out from the digits around each, once the game shows. It runs in the
 * page, so it uses nothing from this module.
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

  const [first] = squares();
  if (first) {
    for (let i = 0; i < fills * 2; i++) press(first, "KeyH", "h", false);
  }
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
 * Selects a square in the middle of the reloaded game that holds a digit,
 * once the game shows, so the board shows its shading, and returns what the
 * page shows once it has painted. It runs in the page, so it uses nothing
 * from this module.
 *
 * @returns {Promise<PageState>}
 */
async function describePage() {
  const squares = [...document.querySelectorAll('[role="gridcell"]')];
  const middle = squares
    .slice(36, 45)
    .find((square) => /^\d/.test(square.getAttribute("aria-label") ?? ""));
  if (middle instanceof HTMLElement) middle.click();
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
 * Plays the opening on a page of its own and returns the screenshot, or why
 * it could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url) {
  // The deal is seeded, and the clock is set once the game has saved itself.
  await setUpPage(page, {
    theme: THEME,
    seed: SEED,
    stored: { [SETTINGS_KEY]: JSON.stringify(SETTINGS) },
    merged: { [SAVED_GAME_KEY]: { seconds: CLOCK_SECONDS } },
  });
  await page.navigate(url);
  if (!(await settled(page, BOARD))) {
    return { problem: "the board did not show" };
  }
  const opening = await page.evaluate(playOpening, FILLS, NOTED);
  if (opening.noted !== NOTED) return { problem: "too few squares were noted" };

  // The game saves itself as it goes; the reload takes the clock from it.
  await page.reload();
  if (!(await settled(page, BOARD))) {
    return { problem: "the board did not show" };
  }
  const shown = await page.evaluate(describePage);
  if (shown.boards !== 1) return { problem: "the board did not show" };
  if (shown.noted !== NOTED) return { problem: "the game was not restored" };
  if (shown.openDialogs > 0) return { problem: "a dialog is open" };

  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(shown.room, SCREENSHOT_VIEWPORT),
    says:
      `Filled ${opening.filled} squares, noted ${opening.noted}, ` +
      `the clock at ${shown.time}.`,
  };
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "Sudoku",
  root: ROOT,
  port: 9002,
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
