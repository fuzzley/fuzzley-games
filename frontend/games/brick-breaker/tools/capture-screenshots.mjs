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
 * doesn't. The palette is Classic felt.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";
import { withChrome, withPage } from "@fz/dev/chrome";
import { SITE_IMAGES, writeSiteImages } from "@fz/dev/screenshots";
import { THEME_STORAGE_KEY } from "@fz/style/themes";

/** @import { Page } from "@fz/dev/chrome" */

const USAGE = `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Brick Breaker from a running
server.

  --url <url>      The server (default: http://localhost:9004/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/brick-breaker");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The palette the screenshot is taken in. */
const THEME = "classic";

/** The page kept around the field in the thumbnail, in CSS pixels. */
const THUMB_MARGIN = 24;

/** Where the game keeps the run under way. */
const SAVED_GAME_KEY = "brick-breaker-game";

/** The version the game keeps the run under, beside it. */
const SAVED_GAME_VERSION = 1;

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
 * What the page shows once the run is taken up.
 *
 * @typedef {{state: string, outcome: string, score: string, field: Region | null}} PageState
 */

/**
 * A part of the page, in CSS pixels.
 *
 * @typedef {{left: number, top: number, width: number, height: number}} Region
 */

/**
 * Returns the run, kept by the game's own rules, loaded through Vite.
 *
 * @returns {Promise<SavedRun>}
 */
async function keepRun() {
  const load = async (/** @type {string} */ file) => {
    const { module } = await runnerImport(join(ROOT, file), {
      configFile: false,
      root: ROOT,
      logLevel: "silent",
    });
    return /** @type {Record<string, unknown>} */ (module);
  };
  const [levels, kept] = await Promise.all([
    load("src/rules/levels.ts"),
    load("src/testing/kept_run.ts"),
  ]);
  const keptRun =
    /** @type {(levels: unknown, run: typeof RUN) => SavedRun} */ (
      kept["keptRun"]
    );
  return keptRun(levels["LEVELS"], RUN);
}

/**
 * Keeps the run and chooses the palette, before the game starts. It runs in
 * the page, so it uses nothing from this module.
 *
 * @param {string} run The run, as stored.
 * @param {string} gameKey Where the game keeps the run.
 * @param {string} theme
 * @param {string} themeKey Where the palette the player chose is kept.
 */
function preparePage(run, gameKey, theme, themeKey) {
  localStorage.setItem(gameKey, run);
  localStorage.setItem(themeKey, theme);
}

/**
 * Waits for the scene to draw, then returns what the page shows. It runs in
 * the page, so it uses nothing from this module.
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
  // Long enough for the placeholder's fade.
  await new Promise((resolve) => setTimeout(resolve, 800));
  const board = document.querySelector("app-board");
  const canvas = document
    .querySelector("fz-phaser-canvas canvas")
    ?.getBoundingClientRect();
  const [x = 0, y = 0, width = 0, height = 0] = (
    board?.getAttribute("data-field") ?? ""
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
    field: canvas
      ? { left: canvas.left + x, top: canvas.top + y, width, height }
      : null,
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
 * Returns the part of the capture the thumbnail keeps: the field with a
 * margin around it, widened to the thumbnail's shape and kept on the page,
 * in the capture's pixels.
 *
 * @param {Region} field The field, in CSS pixels.
 * @returns {Region}
 */
function thumbRegion(field) {
  const { width: thumbWidth, height: thumbHeight } = SITE_IMAGES.thumb;
  const height = Math.min(field.height + 2 * THUMB_MARGIN, VIEWPORT.height);
  const width = Math.min((height * thumbWidth) / thumbHeight, VIEWPORT.width);
  const centerX = field.left + field.width / 2;
  const centerY = field.top + field.height / 2;
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
 * @param {SavedRun} run
 * @returns {Promise<{png: Buffer, page: PageState & {field: Region}} | {problem: string}>}
 */
async function capture(page, url, run) {
  await page.beforeLoad(
    preparePage,
    JSON.stringify({ version: SAVED_GAME_VERSION, ...run }),
    SAVED_GAME_KEY,
    THEME,
    THEME_STORAGE_KEY,
  );
  await page.navigate(url);
  const shown = await page.evaluate(describePage);
  if (shown.state !== "ready") return { problem: "the field did not draw" };
  if (shown.outcome !== "paused")
    return { problem: "the run was not taken up" };
  if (shown.score !== String(run.score)) {
    return { problem: `the score reads ${shown.score}` };
  }
  const { field } = shown;
  if (!field) return { problem: "the field is missing" };
  const goneOn = await page.evaluate(goOn);
  if (goneOn.outcome !== "playing" || !goneOn.card.includes("to launch")) {
    return { problem: `the run didn't go on: ${goneOn.card}` };
  }
  return { png: await page.screenshot(), page: { ...shown, field } };
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
      url: { type: "string", default: "http://localhost:9004/" },
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

  const run = await keepRun();
  const shot = await withChrome(
    { chrome: options.chrome, name: "brick-breaker" },
    (devtools) =>
      withPage(devtools, VIEWPORT, (page) => capture(page, options.url, run)),
  );
  if ("problem" in shot) {
    console.error(`Not captured: ${shot.problem}.`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Took up the run with a score of ${shot.page.score}, and went on with it.`,
  );
  const sizes = await writeSiteImages(shot.png, SCREENSHOT_DIR, {
    thumbRegion: thumbRegion(shot.page.field),
  });
  for (const [file, bytes] of sizes) {
    console.log(`${file}: ${Math.round(bytes / 1024)} KB`);
  }
}

await main();
