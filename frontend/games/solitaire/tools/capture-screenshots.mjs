#!/usr/bin/env node
/**
 * Captures each game's rules-page screenshot from the running dev server.
 *
 *   yarn dev
 *   yarn capture:screenshots [game id ...]
 *   yarn build:thumbs
 *
 * Writes `docs/screenshots/<id>/overview.png` for every game that has one, or
 * only the games named. Each game opens on a fresh deal in a browser context
 * of its own, so it shows the whole page with every setting at its default,
 * rather than whatever the last game left in storage. These lossless
 * originals stay out of `public/`: `yarn build:thumbs` makes the WebP images
 * the site serves from them.
 */
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withPage } from "@fz/dev/chrome";
import { runScreenshotScript } from "@fz/dev/screenshots";
import sharp from "sharp";

/** @import { DevToolsConnection, Page } from "@fz/dev/chrome" */
/** @import { ScreenshotRequest, ScreenshotScript } from "@fz/dev/screenshots" */
/** @import { Printer } from "@fz/dev/script" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "docs/screenshots");
const TARGET = "overview.png";

/** The page size every screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1440, height: 810, deviceScaleFactor: 2 };

/**
 * How long to let a board settle once its game is running, while the card
 * textures load and the first frames draw.
 */
const SETTLE_MS = 2500;

/**
 * What the page reports once its game is running.
 *
 * @typedef {{hash: string, running: boolean, openDialogs: number}} PageState
 */

/**
 * Waits for the game to start and its board to settle, then returns what the
 * page shows. It runs in the page, so it uses nothing from this module.
 *
 * @param {number} settleMs
 * @returns {Promise<PageState>}
 */
async function waitForGame(settleMs) {
  for (let i = 0; i < 100 && !("fsolitaire" in window); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  return {
    hash: location.hash,
    running: "fsolitaire" in window,
    openDialogs: document.querySelectorAll("dialog[open]").length,
  };
}

/**
 * Opens one game on a page of its own and returns its screenshot, or why it
 * could not be taken.
 *
 * @param {Page} page
 * @param {string} baseUrl
 * @param {string} id
 * @returns {Promise<{png: Buffer} | {problem: string}>}
 */
async function capture(page, baseUrl, id) {
  await page.navigate(new URL(`#/${id}`, baseUrl).href);
  const state = await page.evaluate(waitForGame, SETTLE_MS);
  if (state.hash !== `#/${id}`) return { problem: `opened ${state.hash}` };
  if (!state.running) return { problem: "no game started" };
  if (state.openDialogs > 0) return { problem: "a dialog is open" };
  return { png: await page.screenshot() };
}

/**
 * Returns every game with a screenshot, by the folder its original keeps.
 *
 * @returns {Promise<string[]>}
 */
async function everyGame() {
  return (await readdir(SCREENSHOT_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Captures each game the command line names, or every game with a
 * screenshot, each on a page of its own, says which it captured and which
 * it skipped, and returns the code to exit with: 1 if it skipped any.
 *
 * @param {DevToolsConnection} devtools
 * @param {ScreenshotRequest} request
 * @param {Printer} printer
 * @returns {Promise<number>}
 */
async function captureEach(devtools, { url, names }, { print, printError }) {
  const ids = names.length > 0 ? names : await everyGame();
  const skipped = [];
  for (const id of ids) {
    const shot = await withPage(devtools, VIEWPORT, (page) =>
      capture(page, url, id),
    );
    if ("problem" in shot) {
      skipped.push(id);
      print(`${id}: skipped, ${shot.problem}`);
      continue;
    }
    const target = join(SCREENSHOT_DIR, id, TARGET);
    await mkdir(dirname(target), { recursive: true });
    await sharp(shot.png).png({ compressionLevel: 9 }).toFile(target);
    print(`${id}: ${TARGET}`);
  }

  print(`Captured ${ids.length - skipped.length} of ${ids.length}.`);
  if (skipped.length > 0) {
    printError(`Not captured: ${skipped.join(", ")}`);
    return 1;
  }
  print("Run yarn build:thumbs to make the images the site serves.");
  return 0;
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "the Solitaire Collection",
  root: ROOT,
  port: 9000,
  about:
    "Captures each game's rules-page screenshot from the running dev server, " +
    "or only the games named. Run yarn build:thumbs afterwards.",
  nameLabel: "game id",
  capture: captureEach,
};

process.exitCode = await runScreenshotScript(SCRIPT);
