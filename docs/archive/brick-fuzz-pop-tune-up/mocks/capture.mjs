#!/usr/bin/env node
/**
 * Captures the game as it is, for the mocks to draw over, from a running
 * dev server.
 *
 *   yarn workspace brick-fuzz-pop dev
 *   node docs/archive/brick-fuzz-pop-tune-up/mocks/capture.mjs [--url <address>]
 *
 * It opens the game in a headless Chrome at each of `SHOTS`' windows, takes
 * up a run kept by the rules (Wool socks, a round in), goes on with it, aims
 * and charges by the keys, and writes a PNG of each to `shots/`, with
 * `shots.json`, which says where the field lies in each and where the
 * fuzzball waits, for `make-mocks.mjs` to place what it draws.
 *
 * A shot with a `bar` has the bar's two flight buttons changed in the page
 * before it is taken, to how the tune-up would have them, so the mock of
 * the bar is the game's own buttons in the game's own styles.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  SAVED_GAME_KEY,
  loadScreenshotApi,
  storedRun,
} from "../../../../frontend/games/brick-fuzz-pop/tools/stored_run.mjs";
import {
  withChrome,
  withPage,
} from "../../../../frontend/lib/dev/src/chrome.ts";
import {
  setUpPage,
  takenUpBoard,
} from "../../../../frontend/lib/dev/src/screenshots.ts";

/** @import { Page } from "../../../../frontend/lib/dev/src/chrome.ts" */

const MOCKS = dirname(fileURLToPath(import.meta.url));
const SHOTS_FOLDER = join(MOCKS, "shots");

/** The field, as the game's own screenshot script names it. */
const FIELD = { name: "field", element: "app-board", drawnAt: "data-field" };

/**
 * A window the game is captured at, the run it takes up there, laid out on
 * the depth the window's field takes, and the shot aimed by the keys.
 *
 * @typedef {object} Shot
 * @property {string} name The PNG's name.
 * @property {{width: number, height: number, deviceScaleFactor: number}} viewport
 * @property {string} theme The palette.
 * @property {number} depth The depth the window's field takes.
 * @property {ReadonlyArray<readonly [number, number]>} shots The rounds played before the capture.
 * @property {number} degrees The aim, in whole degrees from the floor on the right.
 * @property {number} charge The charge, in notches.
 * @property {BarEdit} [bar] How the bar's flight buttons are changed before the capture.
 */

/**
 * How the bar's two flight buttons are shown: as the game has them with a
 * flight in the air, or as the tune-up would have them, the speed's toggle
 * on or off and Drop, lit with a flight in the air.
 *
 * @typedef {object} BarEdit
 * @property {boolean} tuned Whether the buttons are the tune-up's: the speed's toggle, never dimmed, and Drop.
 * @property {boolean} fast Whether the speed's button shows pressed.
 * @property {boolean} flying Whether a flight is in the air, which lights the buttons a flight needs.
 */

/** The Drop icon's drawing, as the plan has it: Skip's turned a quarter, an arrowhead down onto a bar. */
const DROP_ICON =
  '<path d="M5.5 4.25h13l-6.5 11z"/><rect x="5.5" y="16.5" width="13" height="3.25" rx="1"/>';

/** The phone's window, which most shots share. */
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };

/** The phone's shot the bar's shots change the buttons of. */
const PHONE_BAR = {
  viewport: PHONE,
  theme: "midnight",
  depth: 17,
  shots: /** @type {const} */ ([[244, 3]]),
  degrees: 64,
  charge: 0,
};

/** @type {readonly Shot[]} */
const SHOTS = [
  {
    name: "phone-dark",
    viewport: PHONE,
    theme: "midnight",
    depth: 17,
    shots: [[244, 3]],
    degrees: 104,
    charge: 3,
  },
  {
    name: "phone-light",
    viewport: PHONE,
    theme: "classic",
    depth: 17,
    shots: [[244, 3]],
    degrees: 104,
    charge: 3,
  },
  {
    name: "phone-dark-steep",
    viewport: PHONE,
    theme: "midnight",
    depth: 17,
    shots: [[244, 3]],
    degrees: 96,
    charge: 5,
  },
  {
    name: "desktop-dark",
    viewport: { width: 1280, height: 800, deviceScaleFactor: 2 },
    theme: "midnight",
    depth: 11,
    shots: [[248, 4]],
    degrees: 64,
    charge: 3,
  },
  {
    name: "phone-light-steep",
    viewport: PHONE,
    theme: "classic",
    depth: 17,
    shots: [[244, 3]],
    degrees: 96,
    charge: 4,
  },
  {
    ...PHONE_BAR,
    name: "bar-today-flying",
    bar: { tuned: false, fast: false, flying: true },
  },
  {
    ...PHONE_BAR,
    name: "bar-tuned-waiting",
    bar: { tuned: true, fast: false, flying: false },
  },
  {
    ...PHONE_BAR,
    name: "bar-tuned-waiting-fast",
    bar: { tuned: true, fast: true, flying: false },
  },
  {
    ...PHONE_BAR,
    name: "bar-tuned-flying-fast",
    bar: { tuned: true, fast: true, flying: true },
  },
  {
    ...PHONE_BAR,
    name: "bar-tuned-flying-fast-light",
    theme: "classic",
    bar: { tuned: true, fast: true, flying: true },
  },
  {
    name: "bar-tuned-flying-fast-desktop",
    viewport: { width: 1280, height: 800, deviceScaleFactor: 2 },
    theme: "midnight",
    depth: 11,
    shots: [[248, 4]],
    degrees: 64,
    charge: 0,
    bar: { tuned: true, fast: true, flying: true },
  },
];

/**
 * Goes on with the run taken up, aims the next shot by the keys, changes
 * the bar's two flight buttons as an edit asks, and returns what the page
 * says of itself then. It runs in the page, so it uses nothing from this
 * module.
 *
 * @param {number} degrees
 * @param {number} charge
 * @param {BarEdit | null} edit
 * @param {string} dropIcon
 * @returns {Promise<{outcome: string, depth: number, field: string, bar: {x: number, y: number, width: number, height: number} | null, buttons: {title: string, x: number, y: number, width: number, height: number}[]}>}
 */
async function goOnAndAim(degrees, charge, edit, dropIcon) {
  const board = document.querySelector("app-board");
  /** @param {number} ms */
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  /**
   * @param {string} code
   * @param {number} keyCode
   */
  const press = (code, keyCode) => {
    for (const type of ["keydown", "keyup"]) {
      const event = new KeyboardEvent(type, { key: code, code, bubbles: true });
      Object.defineProperty(event, "keyCode", { get: () => keyCode });
      board?.dispatchEvent(event);
    }
  };
  const resume = [...document.querySelectorAll("app-board .card button")].find(
    (button) => button.textContent?.trim() === "Resume",
  );
  if (resume instanceof HTMLButtonElement) resume.click();
  for (let i = 0; i < 40; i++) {
    if (board?.getAttribute("data-outcome") === "playing") break;
    await wait(50);
  }
  const turns = Math.abs(90 - degrees);
  for (let i = 0; i < turns; i++) {
    if (degrees < 90) press("ArrowRight", 39);
    else press("ArrowLeft", 37);
  }
  for (let i = 0; i < charge; i++) press("ArrowUp", 38);
  if (edit) {
    const speed = document.querySelector('fz-game-bar [title="Fast-forward"]');
    const skip = document.querySelector('fz-game-bar [title="Skip"]');
    if (edit.tuned || edit.flying) speed?.removeAttribute("aria-disabled");
    speed?.setAttribute("aria-pressed", String(edit.fast));
    if (edit.flying) skip?.removeAttribute("aria-disabled");
    if (edit.tuned) {
      skip?.setAttribute("title", "Drop");
      const drawing = skip?.querySelector("svg");
      if (drawing) drawing.innerHTML = dropIcon;
    }
  }
  await wait(500);
  const bar = document.querySelector("fz-game-bar")?.getBoundingClientRect();
  return {
    outcome: board?.getAttribute("data-outcome") ?? "",
    depth: Number(board?.getAttribute("data-depth")),
    field: board?.getAttribute("data-field") ?? "",
    bar: bar
      ? { x: bar.x, y: bar.y, width: bar.width, height: bar.height }
      : null,
    buttons: [...document.querySelectorAll("fz-game-bar button")].map(
      (button) => {
        const box = button.getBoundingClientRect();
        return {
          title: button.getAttribute("title") ?? button.textContent ?? "",
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
      },
    ),
  };
}

/**
 * Captures one shot on a page of its own, and returns its PNG with what
 * the page said of itself.
 *
 * @param {Page} page
 * @param {string} url
 * @param {Shot} shot
 * @param {Awaited<ReturnType<typeof loadScreenshotApi>>} api
 * @returns {Promise<{png: Buffer, said: Awaited<ReturnType<typeof goOnAndAim>>, board: unknown, x: number}>}
 */
async function capture(page, url, shot, api) {
  const { saved, stored } = storedRun(api, {
    level: 14,
    depth: shot.depth,
    shots: shot.shots.map(([aim, charge]) => [aim, charge]),
  });
  await setUpPage(page, {
    theme: shot.theme,
    stored: { [SAVED_GAME_KEY]: stored },
  });
  await page.navigate(url);
  const board = await takenUpBoard(page, FIELD, api.formatPoints(saved.score));
  if ("problem" in board) throw new Error(`${shot.name}: ${board.problem}`);
  const said = await page.evaluate(
    goOnAndAim,
    shot.degrees,
    shot.charge,
    shot.bar ?? null,
    DROP_ICON,
  );
  if (said.outcome !== "playing" || said.depth !== shot.depth) {
    throw new Error(`${shot.name}: ${JSON.stringify(said)}`);
  }
  const start = /** @type {{start?: {x?: number}}} */ (saved).start;
  return { png: await page.screenshot(), said, board, x: start?.x ?? 4.5 };
}

const { values } = parseArgs({ options: { url: { type: "string" } } });
const url = values.url ?? "http://localhost:9006/";
const api = await loadScreenshotApi();
await mkdir(SHOTS_FOLDER, { recursive: true });
/** @type {Record<string, unknown>} */
const described = {};
await withChrome({ name: "bfp-tune-up" }, async (devtools) => {
  for (const shot of SHOTS) {
    const { png, said, board, x } = await withPage(
      devtools,
      shot.viewport,
      (page) => capture(page, url, shot, api),
    );
    await writeFile(join(SHOTS_FOLDER, `${shot.name}.png`), png);
    described[shot.name] = { ...shot, ...said, board, waitingX: x };
    console.log(
      `${shot.name}: field ${said.field}, ${String(said.depth)} deep`,
    );
  }
});
await writeFile(
  join(MOCKS, "shots.json"),
  `${JSON.stringify(described, null, 2)}\n`,
);
// Formatted as the repository checks every file under docs/.
execFileSync(
  resolve(MOCKS, "../../../../frontend/node_modules/.bin/prettier"),
  ["--write", join(MOCKS, "shots.json")],
  { stdio: "ignore" },
);
