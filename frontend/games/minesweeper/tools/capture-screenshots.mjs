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
} from "@fz/dev/screenshots";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "minesweeper");

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** Seeds the page's `Math.random`, which the game deals from. */
const SEED = 7;

/** How much of the field the opening clears before it stops, from 0 to 1. */
const OPEN_SHARE = 0.45;

/** What the clock reads when the screenshot is taken, in seconds. */
const CLOCK_SECONDS = 84;

/** Where the game keeps the game in progress, which sets the clock. */
const SAVED_GAME_KEY = "minesweeper-game";

/** The selector the page matches once the game shows. */
const BOARD = ".board";

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
 * Plays the opening of a game: reveals the middle square, then flags the
 * mines the numbers give away and opens the squares they clear until enough
 * of the field is open, and steps on the last mine it flagged, once the game
 * shows. It runs in the page, so it uses nothing from this module.
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
  const board = document.querySelector(".board");
  if (!(board instanceof HTMLElement)) {
    return { open: 0, flagged: 0, tripped: 0 };
  }
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
  if (middle) press(middle, "click");
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
 * Returns what the reloaded game shows, once it shows and has painted. It
 * runs in the page, so it uses nothing from this module.
 *
 * @returns {PageState}
 */
function describePage() {
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
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url) {
  // The deal is seeded, and the clock is set once the game has saved itself.
  await setUpPage(page, {
    theme: THEME,
    seed: SEED,
    merged: { [SAVED_GAME_KEY]: { seconds: CLOCK_SECONDS } },
  });
  await page.navigate(url);
  if (!(await settled(page, BOARD))) {
    return { problem: "the board did not show" };
  }
  const opening = await page.evaluate(playOpening, OPEN_SHARE);
  if (opening.tripped !== 1) return { problem: "no mine was stepped on" };

  // The game saves itself as it goes; the reload takes the clock from it.
  await page.reload();
  if (!(await settled(page, BOARD))) {
    return { problem: "the board did not show" };
  }
  const shown = await page.evaluate(describePage);
  if (shown.boards !== 1) return { problem: "the board did not show" };
  if (shown.tripped !== 1) return { problem: "the game was not restored" };
  if (shown.openDialogs > 0) return { problem: "a dialog is open" };

  return {
    png: await page.screenshot(),
    says:
      `Cleared ${Math.round(opening.open * 100)}%, ${opening.flagged} flags, ` +
      `the clock at ${shown.time}.`,
  };
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "Minesweeper",
  root: ROOT,
  port: 9001,
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
