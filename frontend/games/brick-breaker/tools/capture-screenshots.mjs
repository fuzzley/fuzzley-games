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
  SCREENSHOT_VIEWPORT,
  keepShot,
  runScreenshotScript,
  setUpPage,
  siteImagesFolder,
  takenUpBoard,
  thumbRegionAround,
} from "@fz/dev/screenshots";
import { importThroughVite } from "@fz/dev/script";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */
/** @import { ScreenshotApi, ScreenshotRun } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "brick-breaker");

/** The palette the screenshot is taken in. */
const THEME = "midnight";

/**
 * Where the game keeps the run under way: a copy of `SAVED_GAME_KEY` in
 * `src/app/play/saved_game.service.ts`, the shell's, which the scripts'
 * entries, fenced as the rules are, can't import.
 */
const SAVED_GAME_KEY = "brick-breaker-game";

/**
 * The field, by its name, its element, and its element's attribute that says
 * where the scene drew it on the canvas.
 */
const FIELD = { name: "field", element: "app-board", drawnAt: "data-field" };

/**
 * The run shown, as `keptRun()` keeps it: begun on Rocket at Normal, twenty
 * seconds in, its bricks as a ball breaking in from below leaves them.
 *
 * @type {ScreenshotRun}
 */
export const RUN = {
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
 * The run as storage keeps it, which the page is given, and its score as the
 * game writes points.
 *
 * @typedef {{stored: string, score: string}} ShownRun
 */

/**
 * Returns what the script takes from the game's own code, `SCREENSHOT_API`
 * in `src/testing/screenshot_api.ts`, loaded through Vite.
 *
 * @returns {Promise<ScreenshotApi>}
 */
export async function loadScreenshotApi() {
  const module = await importThroughVite(
    join(ROOT, "src/testing/screenshot_api.ts"),
    ROOT,
  );
  return /** @type {ScreenshotApi} */ (module["SCREENSHOT_API"]);
}

/**
 * Returns the run shown: kept as the game keeps it, stamped with the version
 * the shell keeps it under, and its score as the game writes it.
 *
 * @param {ScreenshotApi} api
 * @returns {ShownRun}
 */
export function shownRun(api) {
  const saved = api.keptRun(RUN);
  return {
    stored: JSON.stringify({ version: api.savedGameVersion, ...saved }),
    score: api.formatPoints(saved.score),
  };
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
 * @param {ShownRun} run
 * @returns {Promise<Shot | Missed>}
 */
async function capture(page, url, run) {
  await setUpPage(page, {
    theme: THEME,
    stored: { [SAVED_GAME_KEY]: run.stored },
  });
  await page.navigate(url);
  const field = await takenUpBoard(page, FIELD, run.score);
  if ("problem" in field) return field;
  const goneOn = await page.evaluate(goOn);
  if (goneOn.outcome !== "playing" || !goneOn.card.includes("to launch")) {
    return { problem: `the run didn't go on: ${goneOn.card}` };
  }
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(field, SCREENSHOT_VIEWPORT),
    says: `Took up the run with a score of ${run.score}, and went on with it.`,
  };
}

/** @type {ScreenshotScript} */
const SCRIPT = {
  game: "Brick Breaker",
  root: ROOT,
  port: 9004,
  capture: async (devtools, { url }, printer) => {
    const run = shownRun(await loadScreenshotApi());
    const shot = await withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
      capture(page, url, run),
    );
    return keepShot(shot, SCREENSHOT_DIR, printer);
  },
};

if (import.meta.main) process.exitCode = await runScreenshotScript(SCRIPT);
