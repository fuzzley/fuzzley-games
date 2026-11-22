#!/usr/bin/env node
/**
 * Captures each game's screenshot from the running dev server, and writes the
 * images the site shows of it.
 *
 *   yarn dev
 *   yarn capture:screenshots [game id ...] [--force]
 *
 * Writes `public/docs/screenshots/<id>/thumb.webp`, the board alone, for a
 * row of the game browser's list, and `preview.webp`, the whole page, for
 * the preview pane beside it, the rules page and link previews, for every
 * game that has them, or only the games named. An image that looks as it
 * did is kept, unless `--force` is given. No lossless original is kept, so
 * an image at another size or quality takes a retake.
 *
 * Each game opens in a browser context of its own, so it shows the whole
 * page with every setting at its default rather than whatever the last game
 * left in storage, but for the palette, pinned to Casino night whatever
 * colour scheme the browser prefers, and the deal, seeded by the game's id,
 * so a retake changes only where the page did.
 */
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withPage } from "@fz/dev/chrome";
import {
  describeImage,
  runScreenshotScript,
  setUpPage,
  siteImagesFolder,
  writeSiteImages,
} from "@fz/dev/screenshots";
import sharp from "sharp";
import { seedFrom } from "../src/engine/core/random/seed_from.ts";

/** @import { Region } from "sharp" */
/** @import { DevToolsConnection, Page } from "@fz/dev/chrome" */
/** @import { ScreenshotRequest, ScreenshotScript } from "@fz/dev/screenshots" */
/** @import { Printer } from "@fz/dev/script" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The page size every screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1440, height: 810, deviceScaleFactor: 2 };

/**
 * The palette every screenshot is taken in: dark, as the other games' are in
 * the site's catalog, with the green felt the capture finds the board by.
 */
const THEME = "casino";

/**
 * Seeds the page's `Math.random`, which every game deals from, mixed with the
 * game's id, so a retake deals each game the same and no two games alike.
 */
const DEAL_SEED = "screenshots";

/**
 * The key the page keeps the last game played under, and deals first on
 * opening. The game a screenshot is of is stored there, so the page deals it
 * alone, and its deal hangs on no other game in the catalog.
 */
const LAST_GAME_KEY = "fsolitaire-game";

/**
 * How long to let a board settle once its game is running, while the card
 * textures load and the first frames draw.
 */
const SETTLE_MS = 2500;

/**
 * The most of the height the header may take before the crop is assumed to
 * have missed the felt.
 */
const MAX_CHROME_FRACTION = 0.2;

/**
 * What the page reports once its game is running.
 *
 * @typedef {{hash: string, running: boolean, openDialogs: number}} PageState
 */

/**
 * Where a screenshot's board lies, below the header, and the colour of the
 * felt along its bottom edge.
 *
 * @typedef {{region: Region, felt: {r: number, g: number, b: number}}} Board
 */

/**
 * Returns whether a pixel is bare felt, which the default table is: a green
 * well clear of both red and blue.
 *
 * The header's translucent tint over the felt leans towards blue, which is
 * what tells it apart.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {boolean}
 */
function isFelt(r, g, b) {
  return g > r + 30 && g > b + 30;
}

/**
 * Finds the board below the header, and the colour of the felt along its
 * bottom edge, or says it found no felt.
 *
 * The board starts at the first row of felt down a column near the middle.
 *
 * @param {Buffer} png The screenshot.
 * @returns {Promise<Board | {problem: string}>}
 */
export async function findBoard(png) {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  /**
   * Returns whether the screenshot's pixel at a point is felt.
   *
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  const feltAt = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return isFelt(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
  };

  const column = Math.floor(info.width * 0.45);
  let top = 0;
  while (top < info.height && !feltAt(column, top)) top++;

  if (top > info.height * MAX_CHROME_FRACTION) {
    return { problem: "found no felt below the header" };
  }
  const i =
    ((info.height - 1) * info.width + Math.floor(info.width / 2)) *
    info.channels;
  return {
    region: { left: 0, top, width: info.width, height: info.height - top },
    felt: { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 },
  };
}

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
 * Opens one game on a page of its own and returns its screenshot and where
 * its board lies, or why it could not be taken.
 *
 * @param {Page} page
 * @param {string} baseUrl
 * @param {string} id
 * @returns {Promise<({png: Buffer} & Board) | {problem: string}>}
 */
async function capture(page, baseUrl, id) {
  await setUpPage(page, {
    theme: THEME,
    seed: seedFrom([DEAL_SEED, id]),
    stored: { [LAST_GAME_KEY]: id },
  });
  await page.navigate(new URL(`#/${id}`, baseUrl).href);
  const state = await page.evaluate(waitForGame, SETTLE_MS);
  if (state.hash !== `#/${id}`) return { problem: `opened ${state.hash}` };
  if (!state.running) return { problem: "no game started" };
  if (state.openDialogs > 0) return { problem: "a dialog is open" };
  const png = await page.screenshot();
  const board = await findBoard(png);
  return "problem" in board ? board : { png, ...board };
}

/**
 * Returns every game with a screenshot, by the folder its images are in.
 *
 * @returns {Promise<string[]>}
 */
async function everyGame() {
  return (await readdir(siteImagesFolder(ROOT, ""), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Captures each game the command line names, or every game with a
 * screenshot, each on a page of its own, and writes the site's images of
 * it, saying which it wrote or kept and which games it skipped, and returns
 * the code to exit with: 1 if it skipped any.
 *
 * The thumbnail is cropped to the board, since the header would be an
 * illegible strip at its size.
 *
 * @param {DevToolsConnection} devtools
 * @param {ScreenshotRequest} request
 * @param {Printer} printer
 * @returns {Promise<number>}
 */
async function captureEach(
  devtools,
  { url, names, force },
  { print, printError },
) {
  const ids = names.length > 0 ? names : await everyGame();
  const skipped = [];
  let wrote = 0;
  let kept = 0;
  for (const id of ids) {
    const shot = await withPage(devtools, VIEWPORT, (page) =>
      capture(page, url, id),
    );
    if ("problem" in shot) {
      skipped.push(id);
      print(`${id}: skipped, ${shot.problem}`);
      continue;
    }
    const written = await writeSiteImages(
      shot.png,
      siteImagesFolder(ROOT, id),
      {
        thumbRegion: shot.region,
        // Contained rather than cropped, since a wide board runs edge to edge;
        // any strip left over goes below it, as more felt.
        resize: { fit: "contain", position: "top", background: shot.felt },
        force,
      },
    );
    for (const [file, image] of written) {
      print(`${id}: ${describeImage(file, image)}`);
      if (image.kept) kept++;
      else wrote++;
    }
  }

  print(
    `Captured ${ids.length - skipped.length} of ${ids.length}: wrote ${wrote} ${wrote === 1 ? "image" : "images"}, kept ${kept}.`,
  );
  if (skipped.length > 0) {
    printError(`Not captured: ${skipped.join(", ")}`);
    return 1;
  }
  return 0;
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "the Solitaire Collection",
  root: ROOT,
  port: 9000,
  about:
    "Captures each game's screenshot from the running dev server, or only " +
    "the games named, and writes the images the site shows of it.",
  nameLabel: "game id",
  capture: captureEach,
};

if (import.meta.main) process.exitCode = await runScreenshotScript(SCRIPT);
