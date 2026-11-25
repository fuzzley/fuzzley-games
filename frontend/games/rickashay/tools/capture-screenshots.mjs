#!/usr/bin/env node
/**
 * Captures the screenshots the site shows of Rickashay from a running
 * server.
 *
 *   yarn dev
 *   yarn capture:screenshots
 *
 * Writes `preview.webp`, the whole page, and `thumb.webp`, the field, to
 * `public/docs/screenshots/rickashay/`. Both show the same run, kept as the
 * game keeps one, taken up paused on load and gone on with: on level 9,
 * Gatehouse, the last of Warm-up, two rounds into its certificate on a
 * field 11 deep, the next shot, a hot one the second round's jump earned,
 * aimed by the keys at 111.75 degrees and let fly, and the page held 64
 * frames into its flight, the fuzzball climbing through the wall's top
 * course with a rally of 6 faint under the danger line, the shards of the
 * bricks it broke about it. The page runs on a clock of steady frames
 * from before its own scripts, and its `Math.random` from a seed, so the
 * flight stands at the same moment, and its shards in the same places,
 * every time it is held.
 * The palette is Midnight blue, dark as the other arcade games' are in the
 * catalog.
 */
import { join } from "node:path";
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

const ROOT = join(import.meta.dirname, "..");
const SCREENSHOT_DIR = siteImagesFolder(ROOT, "rickashay");

/** The dev server's port, as `vite.config.ts` gives it. */
const PORT = 9007;

/** The palette the screenshot is taken in. */
const THEME = "midnight";

/** The seed of the page's `Math.random`, which the shards burst by. */
const SEED = 9;

/**
 * The field, by its name, its element, and its element's attribute that says
 * where the scene drew it on the canvas.
 */
const FIELD = {
  name: "field",
  element: "fz-wall-board",
  drawnAt: "data-field",
};

/**
 * The run shown, as `keptRun()` keeps it: begun on Gatehouse, on a field 11
 * deep, as the page's board lays it out, and played two rounds into it by
 * the first two shots of its certificate there, the second of which jumps
 * the wall and earns the next shot hot.
 *
 * @type {ScriptRun}
 */
export const RUN = { level: 9, depth: 11, shots: [508, 276] };

/** The aim the next shot is let fly at, by its index: 111.75 degrees. */
export const AIM = 415;

/**
 * How many of the page's frames the shot flies before the page is held:
 * about a second at the clock's 16 ms a frame, a rally of 6 into a rally of
 * 13.
 */
export const FRAMES_IN_AIR = 64;

/**
 * How long each of the page's frames takes on the clock it runs on, in ms:
 * a whole number, so every frame's time is exact, and shorter than a 60th
 * of a second, which Phaser cuts a frame's time down to while the page is
 * out of focus.
 */
const FRAME_MS = 16;

/**
 * The aim straight up, 90 degrees, which a shot is aimed from as the page
 * loads: `STRAIGHT_UP` in `@fz/brick-wall/view/aim_settings`, which Node,
 * running this script, can't import, and which the spec holds it to.
 */
export const STRAIGHT_UP = 328;

/**
 * How many aims a press of an arrow turns, a degree, as
 * `@fz/brick-wall/view/aiming` turns them by `@fz/brick-wall/rules/aims`'
 * `AIMS_PER_DEGREE`; one with Shift turns one, a quarter.
 */
export const AIMS_A_PRESS = 4;

/**
 * A key pressed on the board, by its `code`, the `keyCode` Phaser reads, and
 * whether Shift is held.
 *
 * @typedef {{code: string, keyCode: number, shift: boolean}} KeyPress
 */

/**
 * Returns the keys a player would press to aim a shot from straight up:
 * the left arrow a degree more, or the right a degree less, then the rest
 * of the way a quarter of a degree at a press, with Shift.
 *
 * @param {number} aim The aim, by its index.
 * @returns {KeyPress[]}
 */
export function aimingKeys(aim) {
  const turn =
    aim > STRAIGHT_UP
      ? { code: "ArrowLeft", keyCode: 37 }
      : { code: "ArrowRight", keyCode: 39 };
  const aims = Math.abs(aim - STRAIGHT_UP);
  return [
    ...Array.from({ length: Math.floor(aims / AIMS_A_PRESS) }, () => ({
      ...turn,
      shift: false,
    })),
    ...Array.from({ length: aims % AIMS_A_PRESS }, () => ({
      ...turn,
      shift: true,
    })),
  ];
}

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
    aimed: api.aimWords(AIM),
  };
}

/**
 * The clock of steady frames a page runs on: the frames drawn so far, the
 * time `requestAnimationFrame` handed the last, what to call before the
 * next frame's callbacks, and the frame past which no callback runs.
 *
 * @typedef {object} SteadyClock
 * @property {number} frame
 * @property {number} drawn
 * @property {((frame: number) => void) | null} onFrame
 * @property {number} heldAfter
 */

/**
 * Runs the page on a clock of steady frames, in the page before its own
 * scripts: each frame of `requestAnimationFrame` is handed a time a frame
 * on from the last, and `performance.now()` reads the frame's time, so
 * Phaser plays each frame for the same time however fast Chrome draws. It
 * keeps the clock as `steadyClock` on the window, whose `onFrame` is called
 * once, before the next frame's callbacks, and past whose `heldAfter` no
 * callback runs again, the page left as that frame drew it. It is sent as
 * its source, so it uses nothing from this module.
 *
 * @param {number} frameMs
 */
export function steadyFrames(frameMs) {
  const nextFrame = window.requestAnimationFrame.bind(window);
  /** @type {SteadyClock} */
  const clock = {
    frame: 0,
    drawn: -1,
    onFrame: null,
    heldAfter: Number.POSITIVE_INFINITY,
  };
  window.requestAnimationFrame = (callback) =>
    nextFrame((drawn) => {
      // Every callback of a frame is handed the same time.
      if (drawn !== clock.drawn) {
        clock.drawn = drawn;
        clock.frame++;
        const onFrame = clock.onFrame;
        clock.onFrame = null;
        onFrame?.(clock.frame);
      }
      if (clock.frame <= clock.heldAfter) callback(clock.frame * frameMs);
    });
  performance.now = () => clock.frame * frameMs;
  Reflect.set(window, "steadyClock", clock);
}

/**
 * Goes on with the run taken up, by the card's Resume, aims the next shot
 * by the keys handed once it is under way, waits for the game to say the
 * aim, lets the shot fly at Space on the next frame, holds the page a
 * number of frames into its flight, and returns what the board says then:
 * the run's stage, the field's depth, whether a card still shows over the
 * field, whether the aim was said before the shot flew, whether the flight
 * is in the air, as the bar's Skip says, and whether the page was held. An
 * aim not said lets nothing fly. It runs in the page, on
 * {@link steadyFrames}' clock, so it uses nothing from this module.
 *
 * @param {readonly KeyPress[]} keys
 * @param {string} aimed What the game says once the keys have aimed.
 * @param {number} framesInAir
 * @returns {Promise<{outcome: string, depth: number, card: boolean, said: boolean, flying: boolean, held: boolean}>}
 */
async function goOn(keys, aimed, framesInAir) {
  const board = document.querySelector("fz-wall-board");
  /** @type {SteadyClock} */
  const clock = Reflect.get(window, "steadyClock");
  /**
   * Waits, up to ten seconds, for something to hold.
   *
   * @param {() => boolean} holds
   */
  const until = async (holds) => {
    for (let i = 0; i < 200 && !holds(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };
  /**
   * Presses a key on the board, Phaser's keyboard target, and lets it go.
   *
   * @param {KeyPress} press
   */
  const press = ({ code, keyCode, shift }) => {
    for (const type of ["keydown", "keyup"]) {
      const event = new KeyboardEvent(type, {
        key: code,
        code,
        shiftKey: shift,
        bubbles: true,
      });
      // Phaser reads a key's code from `keyCode`, which a made event leaves 0.
      Object.defineProperty(event, "keyCode", { get: () => keyCode });
      board?.dispatchEvent(event);
    }
  };
  const resume = [
    ...document.querySelectorAll("fz-wall-board .card button"),
  ].find((button) => button.textContent.trim() === "Resume");
  if (resume instanceof HTMLButtonElement) resume.click();
  await until(() => board?.getAttribute("data-outcome") === "playing");
  for (const key of keys) press(key);
  const said = () =>
    [...document.querySelectorAll("[aria-live]")].some((region) =>
      region.textContent.includes(aimed),
    );
  await until(said);
  // As the aim was said, since what the flight comes to is said over it.
  const saidAim = said();
  if (saidAim) {
    // Let fly as a frame begins, before Phaser reads the keys in it.
    clock.onFrame = (frame) => {
      press({ code: "Space", keyCode: 32, shift: false });
      clock.heldAfter = frame + framesInAir;
    };
    await until(() => clock.frame > clock.heldAfter);
    // Long enough for the bar to show what the frame held left it at.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const skip = document.querySelector('fz-game-bar button[title="Skip"]');
  return {
    outcome: board?.getAttribute("data-outcome") ?? "",
    depth: Number(board?.getAttribute("data-depth")),
    card: document.querySelector("fz-wall-board .card") !== null,
    said: saidAim,
    flying: skip !== null && !skip.hasAttribute("aria-disabled"),
    held: clock.frame > clock.heldAfter,
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
  await page.beforeLoad(steadyFrames, FRAME_MS);
  await setUpPage(page, {
    theme: THEME,
    stored: { [SAVED_GAME_KEY]: run.stored },
    seed: SEED,
  });
  await page.navigate(url);
  const field = await takenUpBoard(page, FIELD, run.score);
  if ("problem" in field) return field;
  const goneOn = await page.evaluate(
    goOn,
    aimingKeys(AIM),
    run.aimed,
    FRAMES_IN_AIR,
  );
  if (goneOn.outcome !== "playing") {
    return { problem: `the run didn't go on: it is ${goneOn.outcome}` };
  }
  if (goneOn.card) return { problem: "a card still shows over the field" };
  if (!goneOn.said) return { problem: `the game didn't say "${run.aimed}"` };
  if (!goneOn.held) {
    return { problem: `the page didn't draw ${String(FRAMES_IN_AIR)} frames` };
  }
  if (!goneOn.flying) return { problem: "no flight is in the air" };
  if (goneOn.depth !== RUN.depth) {
    return {
      problem: `the field is ${String(goneOn.depth)} rows deep, not the ${String(RUN.depth)} the run was played on`,
    };
  }
  return {
    png: await page.screenshot(),
    thumbRegion: thumbRegionAround(field, SCREENSHOT_VIEWPORT),
    says: `Took up the run with a score of ${run.score}, and went on with it, let fly at ${run.aimed} and held ${String(FRAMES_IN_AIR)} frames into its flight.`,
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
    game: "Rickaashay",
    root: ROOT,
    port: PORT,
    capture: async (devtools, { url, force }, printer) => {
      const run = shownRun(await load());
      const shot = await withPage(devtools, SCREENSHOT_VIEWPORT, (page) =>
        capture(page, url, run),
      );
      return keepShot(shot, SCREENSHOT_DIR, printer, { force });
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
