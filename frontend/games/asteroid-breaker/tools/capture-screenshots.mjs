#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Asteroid Breaker from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the field, to
 * `public/docs/screenshots/asteroid-breaker/`. Both show the same run, kept
 * as the game keeps one, laid out on the field the page's board shapes,
 * taken up paused on load and gone on with, firing, until its first stray
 * fuzzball drifts in from an edge: at Normal on wave 9, Crowd, played by the
 * autopilot until a second before. The palette is Casino night, dark as the
 * other arcade games' are in the catalog, and Brick Breaker beside it takes
 * the other dark one.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runnerImport } from "vite";
import { withChrome, withPage } from "@fz/dev/chrome";
import { SITE_IMAGES, writeSiteImages } from "@fz/dev/screenshots";
import { THEME_STORAGE_KEY } from "@fz/style/themes";

/** @import { DevToolsConnection, Page } from "@fz/dev/chrome" */

const USAGE = `Usage: yarn capture:screenshots [options]

Captures the screenshots the site shows of Asteroid Breaker from a running
server.

  --url <url>      The server (default: http://localhost:9005/)
  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = join(ROOT, "public/docs/screenshots/asteroid-breaker");

/** The page size the screenshot is taken at, in CSS pixels. */
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 2 };

/** The palette the screenshot is taken in. */
const THEME = "casino";

/** The page kept around the field in the thumbnail, in CSS pixels. */
const THUMB_MARGIN = 24;

/** Where the game keeps the run under way. */
const SAVED_GAME_KEY = "asteroid-breaker-game";

/** The version the game keeps the run under, beside it. */
const SAVED_GAME_VERSION = 1;

/** What the announcer says as a stray comes in, which the screenshot waits for. */
const STRAY_WORDS = "A stray fuzzball drifts in.";

/** How long the stray takes to come in off the edge once it is said, in milliseconds. */
const STRAY_SETTLE_MS = 500;

/**
 * The run shown, as `keptRun()` keeps it, but for its field's shape, which
 * the page gives: begun on Crowd at Normal, played until a second before
 * the wave's first stray comes.
 */
const RUN = {
  wave: 9,
  speed: "normal",
  seed: 9,
  strayInMs: 1000,
};

/**
 * A field's shape, in its units.
 *
 * @typedef {{width: number, height: number}} Torus
 */

/**
 * A run as storage keeps it, so far as the script reads it.
 *
 * @typedef {{score: number}} SavedRun
 */

/**
 * The run as the page is given it, and its score as the game writes points.
 *
 * @typedef {{saved: SavedRun, score: string}} ShownRun
 */

/**
 * What the script takes from the game's own code: the run kept by
 * `keptRun()`, points in words, and how long a ship is guarded once it
 * first moves, which blinks it.
 *
 * @typedef {object} Rules
 * @property {(torus: Torus) => SavedRun} keepRun
 * @property {(points: number) => string} formatPoints
 * @property {number} newShipGuardMs
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
 * The screenshot and what the page showed as it was taken, or why it could
 * not be.
 *
 * @typedef {{png: Buffer, page: PageState & {field: Region}} | {problem: string}} Shot
 */

/**
 * Returns what the script takes from the game's own code, loaded through
 * Vite.
 *
 * `@fz/core` isn't written for Node to strip its types, so it comes through
 * Vite as the rules do.
 *
 * @returns {Promise<Rules>}
 */
async function loadRules() {
  const load = async (/** @type {string} */ id) => {
    const { module } = await runnerImport(id, {
      configFile: false,
      root: ROOT,
      logLevel: "silent",
    });
    return /** @type {Record<string, unknown>} */ (module);
  };
  const [waves, kept, tuning, format] = await Promise.all([
    load(join(ROOT, "src/rules/waves/waves.ts")),
    load(join(ROOT, "src/testing/kept_run.ts")),
    load(join(ROOT, "src/rules/tuning.ts")),
    load("@fz/core/format"),
  ]);
  const keptRun =
    /** @type {(waves: unknown, run: typeof RUN & {torus: Torus}) => SavedRun} */ (
      kept["keptRun"]
    );
  const newShipGuardMs = tuning["NEW_SHIP_GUARD_MS"];
  if (typeof newShipGuardMs !== "number") {
    throw new Error("src/rules/tuning.ts exports no NEW_SHIP_GUARD_MS.");
  }
  return {
    keepRun: (torus) => keptRun(waves["WAVES"], { ...RUN, torus }),
    formatPoints: /** @type {(points: number) => string} */ (
      format["formatPoints"]
    ),
    newShipGuardMs,
  };
}

/**
 * Keeps the run, if any, and chooses the palette, before the game starts.
 * It runs in the page, so it uses nothing from this module.
 *
 * @param {string | null} run The run, as stored.
 * @param {string} gameKey Where the game keeps the run.
 * @param {string} theme
 * @param {string} themeKey Where the palette the player chose is kept.
 */
function preparePage(run, gameKey, theme, themeKey) {
  if (run !== null) localStorage.setItem(gameKey, run);
  localStorage.setItem(themeKey, theme);
}

/**
 * Waits for the scene to draw, then returns the field's shape as the board
 * laid it out. It runs in the page, so it uses nothing from this module.
 *
 * @returns {Promise<Torus | null>}
 */
async function readShape() {
  const ready = () =>
    document.querySelector("fz-phaser-canvas")?.getAttribute("data-state") ===
    "ready";
  for (let i = 0; i < 200 && !ready(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const board = document.querySelector("app-board");
  if (!ready() || !(board instanceof HTMLElement)) return null;
  const width = Number(board.style.getPropertyValue("--across"));
  const height = Number(board.style.getPropertyValue("--down"));
  return width > 0 && height > 0 ? { width, height } : null;
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
 * Goes on with the run taken up, by the card's Resume, holds Space down on
 * the board, so the ship's first move ends its wait and it fires, waits for
 * the stray to drift in and a while more, and returns what the board says
 * then. It runs in the page, so it uses nothing from this module.
 *
 * @param {string} strayWords What the announcer says as a stray comes in.
 * @param {number} afterMs How long to wait once the stray is said.
 * @returns {Promise<{outcome: string, strayed: boolean}>}
 */
async function goOn(strayWords, afterMs) {
  const resume = [...document.querySelectorAll("app-board .card button")].find(
    (button) => button.textContent?.trim() === "Resume",
  );
  if (resume instanceof HTMLButtonElement) resume.click();
  // Phaser reads a key's code from `keyCode`, which a made event leaves 0.
  const space = new KeyboardEvent("keydown", {
    key: " ",
    code: "Space",
    bubbles: true,
  });
  Object.defineProperty(space, "keyCode", { get: () => 32 });
  document.querySelector("app-board")?.dispatchEvent(space);
  const said = () =>
    [...document.querySelectorAll("[aria-live]")].some((region) =>
      region.textContent?.includes(strayWords),
    );
  for (let i = 0; i < 40 && !said(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const strayed = said();
  await new Promise((resolve) => setTimeout(resolve, afterMs));
  return {
    outcome:
      document.querySelector("app-board")?.getAttribute("data-outcome") ?? "",
    strayed,
  };
}

/**
 * Returns the part of the capture the thumbnail keeps: the field with a
 * margin around it, grown to the thumbnail's shape and kept on the page,
 * in the capture's pixels.
 *
 * @param {Region} field The field, in CSS pixels.
 * @returns {Region}
 */
function thumbRegion(field) {
  const { width: thumbWidth, height: thumbHeight } = SITE_IMAGES.thumb;
  const scale = VIEWPORT.deviceScaleFactor;
  const pageWidth = VIEWPORT.width * scale;
  const pageHeight = VIEWPORT.height * scale;
  // Rounded before it is kept on the page, so a pixel rounded up can't
  // carry it past the capture's edge.
  const width = Math.round(
    Math.min(
      Math.max(
        field.width + 2 * THUMB_MARGIN,
        ((field.height + 2 * THUMB_MARGIN) * thumbWidth) / thumbHeight,
      ) * scale,
      pageWidth,
    ),
  );
  const height = Math.round(
    Math.min((width * thumbHeight) / thumbWidth, pageHeight),
  );
  const centerX = (field.left + field.width / 2) * scale;
  const centerY = (field.top + field.height / 2) * scale;
  return {
    left: Math.min(
      Math.max(0, Math.round(centerX - width / 2)),
      pageWidth - width,
    ),
    top: Math.min(
      Math.max(0, Math.round(centerY - height / 2)),
      pageHeight - height,
    ),
    width,
    height,
  };
}

/**
 * Opens the game on a page of its own and returns the shape its board lays
 * the field out in, or null if it drew none.
 *
 * @param {Page} page
 * @param {string} url
 * @returns {Promise<Torus | null>}
 */
async function shapeOn(page, url) {
  await page.beforeLoad(
    preparePage,
    null,
    SAVED_GAME_KEY,
    THEME,
    THEME_STORAGE_KEY,
  );
  await page.navigate(url);
  return page.evaluate(readShape);
}

/**
 * Opens the run on a page of its own and returns the screenshot, or why it
 * could not be taken.
 *
 * @param {Page} page
 * @param {string} url
 * @param {ShownRun} run
 * @param {number} afterStrayMs How long to wait once the stray is said.
 * @returns {Promise<Shot>}
 */
async function capture(page, url, run, afterStrayMs) {
  await page.beforeLoad(
    preparePage,
    JSON.stringify({ version: SAVED_GAME_VERSION, ...run.saved }),
    SAVED_GAME_KEY,
    THEME,
    THEME_STORAGE_KEY,
  );
  await page.navigate(url);
  const shown = await page.evaluate(describePage);
  if (shown.state !== "ready") return { problem: "the field did not draw" };
  if (shown.outcome !== "paused") {
    return { problem: "the run was not taken up" };
  }
  if (shown.score !== run.score) {
    return { problem: `the score reads ${shown.score}` };
  }
  const { field } = shown;
  if (!field) return { problem: "the field is missing" };
  const goneOn = await page.evaluate(goOn, STRAY_WORDS, afterStrayMs);
  if (goneOn.outcome !== "playing") {
    return { problem: `the run didn't go on: ${goneOn.outcome}` };
  }
  if (!goneOn.strayed) return { problem: "no stray drifted in" };
  return { png: await page.screenshot(), page: { ...shown, field } };
}

/**
 * Returns the shape the page lays the field out in, then the run kept on
 * it, captured, or why it could not be.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @returns {Promise<Shot>}
 */
async function shapeAndCapture(devtools, url) {
  // Each on a page of its own, so the first page, going away, keeps no run
  // over the one the second takes up.
  const torus = await withPage(devtools, VIEWPORT, (page) =>
    shapeOn(page, url),
  );
  if (!torus) return { problem: "the board laid no field out" };
  const rules = await loadRules();
  const saved = rules.keepRun(torus);
  const run = { saved, score: rules.formatPoints(saved.score) };
  // The ship's guard, which blinks it, began as it first moved, the run's
  // lead on the stray before the stray came.
  const afterStrayMs =
    Math.max(0, rules.newShipGuardMs - RUN.strayInMs) + STRAY_SETTLE_MS;
  return withPage(devtools, VIEWPORT, (page) =>
    capture(page, url, run, afterStrayMs),
  );
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
      url: { type: "string", default: "http://localhost:9005/" },
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
    { chrome: options.chrome, name: "asteroid-breaker" },
    (devtools) => shapeAndCapture(devtools, options.url),
  );
  if ("problem" in shot) {
    console.error(`Not captured: ${shot.problem}.`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Took up the run with a score of ${shot.page.score}, and went on with it as a stray drifted in.`,
  );
  const sizes = await writeSiteImages(shot.png, SCREENSHOT_DIR, {
    thumbRegion: thumbRegion(shot.page.field),
  });
  for (const [file, bytes] of sizes) {
    console.log(`${file}: ${Math.round(bytes / 1024)} KB`);
  }
}

await main();
