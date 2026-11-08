#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Brick Breaker from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the field, to
 * `public/docs/screenshots/brick-breaker/`. Both show the same run, kept as
 * the game keeps one, taken up paused on load and gone on with: at Normal on
 * level 9, Rocket, a bite out of its foot, three of its flames and a brick
 * of each fin broken, the ball waiting on the paddle under the card that
 * says how to launch it, which lies clear of the rocket as the Paused card
 * doesn't. The palette is Midnight blue, dark as the classics' are in the
 * catalog, and Snake beside it takes the other dark one.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { withPage } from "@fz/dev/chrome";
import {
  PHASER_CANVAS_SETTLED,
  describePhaserPage,
  keepShot,
  runScreenshotScript,
  setUpPage,
  settled,
  thumbRegionAround,
} from "@fz/dev/screenshots";
import { importThroughVite } from "@fz/dev/script";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/brick-breaker");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The palette the screenshot is taken in. */
const THEME = "midnight";

/** The page kept around the field in the thumbnail, in CSS pixels. */
const THUMB_MARGIN = 24;

/** Where the game keeps the run under way. */
const SAVED_GAME_KEY = "brick-breaker-game";

/** The version the game keeps the run under, beside it. */
const SAVED_GAME_VERSION = 1;

/**
 * The board's element, and its attribute that says where the scene drew the
 * field on the canvas.
 */
const BOARD = { element: "app-board", drawnAt: "data-field" };

/**
 * The run shown, as `keptRun()` keeps it: begun on Rocket at Normal, twenty
 * seconds in, its bricks as a ball breaking in from below leaves them.
 */
const RUN = {
  level: 9,
  speed: "normal",
  seed: 9,
  playedMs: 20_000,
  broken: [
    [12, 4],
    [12, 6],
    [11, 8],
    [10, 1],
    [10, 5],
    [10, 6],
    [9, 5],
    [9, 10],
  ],
  worn: [
    [11, 1],
    [10, 11],
  ],
};

/**
 * A run as storage keeps it, so far as the script reads it.
 *
 * @typedef {{score: number}} SavedRun
 */

/**
 * A run kept by the game's own rules, and its score as the game writes
 * points.
 *
 * @typedef {{saved: SavedRun, score: string}} KeptRun
 */

/**
 * Returns the run, kept by the game's own rules, loaded through Vite, with
 * its score as the game writes points.
 *
 * `@fz/core` isn't written for Node to strip its types, so it comes through
 * Vite as the rules do.
 *
 * @returns {Promise<KeptRun>}
 */
async function keepRun() {
  const [levels, kept, format] = await Promise.all([
    importThroughVite(join(ROOT, "src/rules/levels/levels.ts"), ROOT),
    importThroughVite(join(ROOT, "src/testing/kept_run.ts"), ROOT),
    importThroughVite("@fz/core/format", ROOT),
  ]);
  const keptRun =
    /** @type {(levels: unknown, run: typeof RUN) => SavedRun} */ (
      kept["keptRun"]
    );
  const formatPoints = /** @type {(points: number) => string} */ (
    format["formatPoints"]
  );
  const saved = keptRun(levels["LEVELS"], RUN);
  return { saved, score: formatPoints(saved.score) };
}

/**
 * Goes on with the run taken up, by the card's Resume, and returns what the
 * board says then. It runs in the page, so it uses nothing from this module.
 *
 * @returns {Promise<{outcome: string, card: string}>}
 */
async function goOn() {
  const resume = [...document.querySelectorAll("app-board .card button")].find(
    (button) => button.textContent?.trim() === "Resume",
  );
  if (resume instanceof HTMLButtonElement) resume.click();
  // Long enough for the card's change to draw.
  await new Promise((resolve) => setTimeout(resolve, 400));
  const card = document.querySelector("app-board .card")?.textContent ?? "";
  return {
    outcome:
      document.querySelector("app-board")?.getAttribute("data-outcome") ?? "",
    card: card.replace(/\s+/g, " ").trim(),
  };
}

/**
 * Opens the run on a page of its own and returns the screenshot, or why it
 * could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @param {KeptRun} run
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url, run) {
  await setUpPage(page, {
    theme: THEME,
    stored: {
      [SAVED_GAME_KEY]: JSON.stringify({
        version: SAVED_GAME_VERSION,
        ...run.saved,
      }),
    },
  });
  await page.navigate(url);
  await settled(page, PHASER_CANVAS_SETTLED);
  const shown = await page.evaluate(describePhaserPage, BOARD);
  if (shown.state !== "ready") return { problem: "the field did not draw" };
  if (shown.outcome !== "paused")
    return { problem: "the run was not taken up" };
  if (shown.score !== run.score) {
    return { problem: `the score reads ${shown.score}` };
  }
  const field = shown.board;
  if (!field) return { problem: "the field is missing" };
  const goneOn = await page.evaluate(goOn);
  if (goneOn.outcome !== "playing" || !goneOn.card.includes("to launch")) {
    return { problem: `the run didn't go on: ${goneOn.card}` };
  }
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(field, VIEWPORT, THUMB_MARGIN),
    says: `Took up the run with a score of ${shown.score}, and went on with it.`,
  };
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "Brick Breaker",
  root: ROOT,
  port: 9004,
  capture: async (devtools, { url }, printer) => {
    const run = await keepRun();
    const shot = await withPage(devtools, VIEWPORT, (page) =>
      capture(page, url, run),
    );
    return keepShot(shot, SCREENSHOT_DIR, printer);
  },
};

process.exitCode = await runScreenshotScript(SCRIPT);
