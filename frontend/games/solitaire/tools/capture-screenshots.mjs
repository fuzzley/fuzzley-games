#!/usr/bin/env node
/**
 * Captures each game's rules-page screenshot from the running dev server.
 *
 *   yarn start
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
import { parseArgs } from "node:util";
import { withChrome, withPage } from "@fz/dev/chrome";
import sharp from "sharp";

/** @import { Page } from "@fz/dev/chrome" */

const USAGE = `Usage: yarn capture:screenshots [options] [game id ...]

Captures each game's rules-page screenshot from the running dev server, or
only the games named. Run yarn build:thumbs afterwards.

  --url <url>      The dev server (default: http://localhost:9000/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

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
 * Returns the games the command line names, or every game with a screenshot,
 * and the options it sets.
 *
 * @returns {Promise<{ids: string[], baseUrl: string, chrome?: string} | undefined>}
 *   Nothing when it asks only for help.
 */
async function parseCommandLine() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string", default: "http://localhost:9000/" },
      chrome: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return undefined;
  }
  const ids = positionals.length
    ? positionals
    : (await readdir(SCREENSHOT_DIR, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
  return { ids, baseUrl: values.url, chrome: values.chrome };
}

async function main() {
  const options = await parseCommandLine();
  if (!options) return;
  await fetch(options.baseUrl).catch(() => {
    throw new Error(
      `Nothing answers at ${options.baseUrl}; start the dev server with yarn start.`,
    );
  });

  const failed = await withChrome(
    { chrome: options.chrome, name: "fsolitaire" },
    async (devtools) => {
      const skipped = [];
      for (const id of options.ids) {
        const shot = await withPage(devtools, VIEWPORT, (page) =>
          capture(page, options.baseUrl, id),
        );
        if ("problem" in shot) {
          skipped.push(id);
          console.log(`${id}: skipped, ${shot.problem}`);
          continue;
        }
        const target = join(SCREENSHOT_DIR, id, TARGET);
        await mkdir(dirname(target), { recursive: true });
        await sharp(shot.png).png({ compressionLevel: 9 }).toFile(target);
        console.log(`${id}: ${TARGET}`);
      }
      return skipped;
    },
  );

  console.log(
    `Captured ${options.ids.length - failed.length} of ${options.ids.length}.`,
  );
  if (failed.length > 0) {
    console.error(`Not captured: ${failed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("Run yarn build:thumbs to make the images the site serves.");
  }
}

await main();
