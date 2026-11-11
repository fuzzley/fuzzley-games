#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Brick Fuzz Pop from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the field, to
 * `public/docs/screenshots/brick-fuzz-pop/`. Both show the same run, kept as
 * the game keeps one, taken up paused on load and gone on with: on level 9,
 * Gatehouse, the last of Warm-up, two rounds in on a field 11 deep, the
 * next shot aimed by the keys, its guide turning off a steel brick. The
 * palette is Midnight blue, dark as the other arcade games' are in the
 * catalog.
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
import { CONSOLE } from "@fz/dev/script";
import { SAVED_GAME_KEY, loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** @import { Page } from "@fz/dev/chrome" */
/** @import { Missed, ScreenshotScript, Shot } from "@fz/dev/screenshots" */
/** @import { ScriptIo } from "@fz/dev/script" */
/** @import { ScreenshotApi, ScriptRun } from "../src/testing/script_api.ts" */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "brick-fuzz-pop");

/** The palette the screenshot is taken in. */
const THEME = "midnight";

/**
 * The field, by its name, its element, and its element's attribute that says
 * where the scene drew it on the canvas.
 */
const FIELD = { name: "field", element: "app-board", drawnAt: "data-field" };

/**
 * The run shown, as `keptRun()` keeps it: begun on Gatehouse, on a field 11
 * deep, as the page's board lays it out, and played two rounds into it by
 * the first two shots of its certificate there.
 *
 * @type {ScriptRun}
 */
export const RUN = {
  level: 9,
  depth: 11,
  shots: [
    [288, 3],
    [452, 0],
  ],
};

/**
 * How the next shot is aimed once the run goes on, by the keys a player
 * would press from straight up, 90 degrees: the aim in degrees, a press of
 * the right arrow a degree, and the charge, a press of the up arrow a
 * notch.
 */
export const AIMING = { degrees: 55, charge: 3 };

/**
 * The run as storage keeps it, which the page is given, its score as the
 * game writes points, and what the game says once the keys have aimed the
 * next shot.
 *
 * @typedef {{stored: string, score: string, aimed: string}} ShownRun
 */

/**
 * Returns the run shown: kept as the game keeps it, stamped with the version
 * the shell keeps it under, its score as the game writes it, and the words
 * the aim is said in.
 *
 * @param {ScreenshotApi} api
 * @returns {ShownRun}
 */
export function shownRun(api) {
  const { saved, stored } = storedRun(api, RUN);
  return {
    stored,
    score: api.formatPoints(saved.score),
    aimed: api.shotWords(AIMING.degrees, AIMING.charge),
  };
}

/**
 * Goes on with the run taken up, by the card's Resume, aims the next shot
 * by the arrow keys once it is under way, waits for the game to say the
 * aim, and returns what the board says then: the run's stage, the field's
 * depth, whether a card still shows over the field and whether the aim was
 * said. It runs in the page, so it uses nothing from this module.
 *
 * @param {{degrees: number, charge: number}} aiming
 * @param {string} aimed What the game says once the keys have aimed.
 * @returns {Promise<{outcome: string, depth: number, card: boolean, said: boolean}>}
 */
async function goOn(aiming, aimed) {
  const board = document.querySelector("app-board");
  /**
   * Waits, up to two seconds, for something to hold.
   *
   * @param {() => boolean} holds
   */
  const until = async (holds) => {
    for (let i = 0; i < 40 && !holds(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };
  /**
   * Presses a key on the board, Phaser's keyboard target, and lets it go.
   *
   * @param {string} code
   * @param {number} keyCode
   */
  const press = (code, keyCode) => {
    for (const type of ["keydown", "keyup"]) {
      const event = new KeyboardEvent(type, { key: code, code, bubbles: true });
      // Phaser reads a key's code from `keyCode`, which a made event leaves 0.
      Object.defineProperty(event, "keyCode", { get: () => keyCode });
      board?.dispatchEvent(event);
    }
  };
  const resume = [...document.querySelectorAll("app-board .card button")].find(
    (button) => button.textContent?.trim() === "Resume",
  );
  if (resume instanceof HTMLButtonElement) resume.click();
  await until(() => board?.getAttribute("data-outcome") === "playing");
  for (let turn = aiming.degrees; turn < 90; turn++) press("ArrowRight", 39);
  for (let notch = 0; notch < aiming.charge; notch++) press("ArrowUp", 38);
  const said = () =>
    [...document.querySelectorAll("[aria-live]")].some((region) =>
      region.textContent?.includes(aimed),
    );
  await until(said);
  // Long enough for the guide and the meter to draw.
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    outcome: board?.getAttribute("data-outcome") ?? "",
    depth: Number(board?.getAttribute("data-depth")),
    card: document.querySelector("app-board .card") !== null,
    said: said(),
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
  const goneOn = await page.evaluate(goOn, AIMING, run.aimed);
  if (goneOn.outcome !== "playing") {
    return { problem: `the run didn't go on: it is ${goneOn.outcome}` };
  }
  if (goneOn.card) return { problem: "a card still shows over the field" };
  if (!goneOn.said) return { problem: `the game didn't say "${run.aimed}"` };
  if (goneOn.depth !== RUN.depth) {
    return {
      problem: `the field is ${String(goneOn.depth)} rows deep, not the ${String(RUN.depth)} the run was played on`,
    };
  }
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(field, SCREENSHOT_VIEWPORT),
    says: `Took up the run with a score of ${run.score}, and went on with it, aimed at ${run.aimed}.`,
  };
}

/**
 * Returns the script, which loads what it takes from the game with `load`.
 *
 * @param {() => Promise<ScreenshotApi>} load
 * @returns {ScreenshotScript}
 */
function scriptLoading(load) {
  return {
    game: "Brick Fuzz Pop",
    root: ROOT,
    port: 9006,
    capture: async (devtools, { url }, printer) => {
      const run = shownRun(await load());
      const shot = await withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
        capture(page, url, run),
      );
      return keepShot(shot, SCREENSHOT_DIR, printer);
    },
  };
}

/**
 * Captures the screenshots a command line asks for, or prints its usage,
 * and returns the code to exit with: 0, 1 if nothing answers at the server
 * or the run couldn't be captured, or 2 for a command line it can't read,
 * before Chrome starts.
 *
 * @param {readonly string[]} args
 * @param {ScriptIo<ScreenshotApi>} [io]
 * @returns {Promise<number>}
 */
export function run(
  args,
  {
    load = loadScreenshotApi,
    print = CONSOLE.print,
    printError = CONSOLE.printError,
  } = {},
) {
  return runScreenshotScript(scriptLoading(load), { args, print, printError });
}

if (import.meta.main) process.exitCode = await run(process.argv.slice(2));
