#!/usr/bin/env node
/**
 * Captures Brick Breaker as it is, for the aimed serve's mocks to draw over,
 * from a running dev server.
 *
 *   cd frontend/games/brick-breaker && npx -y corepack yarn dev --port 9110 --strictPort
 *   node docs/archive/bug-reports-and-aimed-serve/mocks/capture.mjs [--url <address>]
 *
 * It opens the game in a headless Chrome at each of `SHOTS`' windows, takes
 * up the run the game's own preview shows (`RUN` in the game's
 * `tools/capture-screenshots.mjs`: Rocket, level 9, the ball waiting on the
 * paddle under the Ready card), goes on with it, changes the Ready card as
 * the shot asks, and writes a PNG of each to `shots/`, with `shots.json`,
 * which says where the field lies in each, the palette's colors and the
 * bricks standing, for `make-mocks.mjs` to place what it draws.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { RUN } from "../../../../frontend/games/brick-breaker/tools/capture-screenshots.mjs";
import {
  SAVED_GAME_KEY,
  loadScreenshotApi,
  storedRun,
} from "../../../../frontend/games/brick-breaker/tools/stored_run.mjs";
import {
  withChrome,
  withPage,
} from "../../../../frontend/lib/dev/src/chrome.ts";
import {
  SCREENSHOT_VIEWPORT,
  setUpPage,
  takenUpBoard,
} from "../../../../frontend/lib/dev/src/screenshots.ts";

/** @import { Page } from "../../../../frontend/lib/dev/src/chrome.ts" */

const MOCKS = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(MOCKS, "../../../../frontend");
const SHOTS_FOLDER = join(MOCKS, "shots");
const LEVELS = join(
  FRONTEND,
  "games/brick-breaker/src/rules/levels/basics.json",
);

/** The palette the preview is taken in. */
const THEME = "midnight";

/** The field, as the game's own screenshot script names it. */
const FIELD = { name: "field", element: "app-board", drawnAt: "data-field" };

/** How many bricks a row holds, as the rules have it. */
const COLUMNS = 13;

/**
 * How the Ready card is shown in a shot: as the game has it, with its words
 * changed to the two lines the design gives it, or hidden, as while the
 * player aims.
 *
 * @typedef {"words" | "hidden"} CardEdit
 */

/**
 * A window the game is captured at and how its Ready card is shown.
 *
 * @typedef {object} Shot
 * @property {string} name The PNG's name.
 * @property {{width: number, height: number, deviceScaleFactor: number}} viewport
 * @property {CardEdit} card
 */

/** @type {readonly Shot[]} */
const SHOTS = [
  { name: "desktop-ready", viewport: SCREENSHOT_VIEWPORT, card: "words" },
  { name: "desktop-aiming", viewport: SCREENSHOT_VIEWPORT, card: "hidden" },
  {
    name: "phone-aiming",
    viewport: { width: 390, height: 844, deviceScaleFactor: 3 },
    card: "hidden",
  },
];

/** The Ready card's launch words, as the design has them, line by line. */
const READY_LINES = ["Press Space or click to launch.", "Hold to aim."];

/**
 * What the page says of itself once the run goes on, for the mocks to draw
 * by.
 *
 * @typedef {object} Said
 * @property {string} outcome The board's `data-outcome`.
 * @property {string} card The Ready card's words, or "" where it is hidden.
 * @property {string} field The board's `data-field`: the field's left, top, width and height on the canvas, in CSS px.
 * @property {{left: number, top: number}} canvas Where the canvas lies on the page, in CSS px.
 * @property {number} across The field's width in units, the board's `--across`.
 * @property {number} down The field's height in units, the board's `--down`.
 * @property {number} pixelRatio The board's `--pixel-ratio`.
 * @property {string} text The palette's text color, `--fz-text`.
 * @property {string} page The page's background color.
 * @property {string} font The page's font family.
 */

/**
 * Goes on with the run taken up, by the card's Resume, shows the Ready card
 * as a shot asks, and returns what the page says of itself then. It runs in
 * the page, so it uses nothing from this module.
 *
 * @param {CardEdit} edit
 * @param {string[]} lines
 * @returns {Promise<Said>}
 */
async function goOn(edit, lines) {
  /**
   * @param {number} ms
   * @returns {Promise<unknown>}
   */
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const board = document.querySelector("app-board");
  const resume = [...document.querySelectorAll("app-board .card button")].find(
    (button) => button.textContent?.trim() === "Resume",
  );
  if (resume instanceof HTMLButtonElement) resume.click();
  await wait(400);
  const card = document.querySelector("app-board .card.ready");
  if (card instanceof HTMLElement && edit === "hidden") {
    card.style.visibility = "hidden";
  }
  if (card && edit === "words") {
    const words = [...card.querySelectorAll(":scope > p")].find((p) =>
      p.textContent?.includes("to launch"),
    );
    if (words) {
      words.textContent = lines[0] ?? "";
      for (const line of lines.slice(1).reverse()) {
        const next = /** @type {HTMLElement} */ (words.cloneNode(false));
        next.textContent = line;
        words.after(next);
      }
    }
  }
  // Long enough for the card's change, and the scene, to draw.
  await wait(600);
  const style = board ? getComputedStyle(board) : null;
  const root = getComputedStyle(document.documentElement);
  const canvas = document
    .querySelector("fz-phaser-canvas canvas")
    ?.getBoundingClientRect();
  return {
    outcome: board?.getAttribute("data-outcome") ?? "",
    card:
      card instanceof HTMLElement && card.style.visibility !== "hidden"
        ? [...card.querySelectorAll("p")]
            .map((line) => (line.textContent ?? "").trim())
            .join(" ")
        : "",
    field: board?.getAttribute("data-field") ?? "",
    canvas: { left: canvas?.left ?? NaN, top: canvas?.top ?? NaN },
    across: Number(style?.getPropertyValue("--across")),
    down: Number(style?.getPropertyValue("--down")),
    pixelRatio: Number(style?.getPropertyValue("--pixel-ratio")),
    text: root.getPropertyValue("--fz-text").trim(),
    page: getComputedStyle(document.body).backgroundColor,
    font: getComputedStyle(document.body).fontFamily,
  };
}

/**
 * Captures one shot on a page of its own, and returns its PNG with what the
 * page said of itself.
 *
 * @param {Page} page
 * @param {string} url
 * @param {Shot} shot
 * @param {{stored: string, score: string}} run
 * @returns {Promise<{png: Buffer, said: Said}>}
 */
async function capture(page, url, shot, run) {
  await setUpPage(page, {
    theme: THEME,
    stored: { [SAVED_GAME_KEY]: run.stored },
  });
  await page.navigate(url);
  const board = await takenUpBoard(page, FIELD, run.score);
  if ("problem" in board) throw new Error(`${shot.name}: ${board.problem}`);
  const said = await page.evaluate(goOn, shot.card, READY_LINES);
  if (said.outcome !== "playing") {
    throw new Error(`${shot.name}: the run didn't go on: ${said.outcome}`);
  }
  if (shot.card === "words" && !said.card.includes(READY_LINES[1] ?? "")) {
    throw new Error(`${shot.name}: the card reads "${said.card}"`);
  }
  return { png: await page.screenshot(), said };
}

/**
 * Returns the bricks Rocket stands with in the run shown, each as its
 * column and row: its picture in `basics.json`, less those the run broke.
 *
 * @param {ReadonlyArray<readonly [number, number]>} broken Each as its row, then its column.
 * @returns {Promise<Array<[number, number]>>}
 */
async function standingBricks(broken) {
  /** @type {{levels: {name: string, bricks: string[]}[]}} */
  const set = JSON.parse(await readFile(LEVELS, "utf8"));
  const rocket = set.levels.find((level) => level.name === "Rocket");
  if (!rocket) throw new Error("basics.json has no level named Rocket.");
  const gone = new Set(broken.map(([row, column]) => `${column},${row}`));
  /** @type {Array<[number, number]>} */
  const bricks = [];
  for (const [row, line] of rocket.bricks.entries()) {
    for (const [column, character] of [...line].entries()) {
      if (character !== "." && !gone.has(`${column},${row}`)) {
        bricks.push([column, row]);
      }
    }
  }
  return bricks;
}

/**
 * Throws unless the bricks read from the level's picture are those the
 * game's own rules keep standing in the run.
 *
 * @param {Array<[number, number]>} bricks Each as its column and row.
 * @param {unknown} saved The run as the rules keep it.
 * @returns {void}
 */
function checkAgainstRules(bricks, saved) {
  const kept =
    /** @type {{levelId: string, field: {bricks: ({cell: number, broken: boolean} | null)[]}}} */ (
      saved
    );
  if (kept.levelId !== "rocket") {
    throw new Error(`The run is on ${kept.levelId}, not Rocket.`);
  }
  const ours = bricks.map(([column, row]) => row * COLUMNS + column).sort();
  const theirs = kept.field.bricks
    .flatMap((brick) => (brick && !brick.broken ? [brick.cell] : []))
    .sort();
  if (ours.join() !== theirs.join()) {
    throw new Error(
      `The bricks standing differ: ${ours.join()} against the rules' ${theirs.join()}.`,
    );
  }
}

const { values } = parseArgs({ options: { url: { type: "string" } } });
const url = values.url ?? "http://localhost:9110/";
const api = await loadScreenshotApi();
const { saved, stored } = storedRun(api, RUN);
const run = { stored, score: api.formatPoints(saved.score) };
const bricks = await standingBricks(RUN.broken);
checkAgainstRules(bricks, saved);
await mkdir(SHOTS_FOLDER, { recursive: true });
/** @type {Record<string, unknown>} */
const described = {};
await withChrome({ name: "bb-aimed-serve" }, async (devtools) => {
  for (const shot of SHOTS) {
    const { png, said } = await withPage(devtools, shot.viewport, (page) =>
      capture(page, url, shot, run),
    );
    await writeFile(join(SHOTS_FOLDER, `${shot.name}.png`), png);
    described[shot.name] = { ...shot, ...said };
    console.log(
      `${shot.name}: field ${said.field} at ${String(said.canvas.left)}, ${String(said.canvas.top)}, ${String(said.down)} deep`,
    );
  }
});
await writeFile(
  join(MOCKS, "shots.json"),
  `${JSON.stringify({ bricks, shots: described }, null, 2)}\n`,
);
// Formatted as the repository checks every file under docs/.
execFileSync(
  join(FRONTEND, "node_modules/.bin/prettier"),
  ["--write", join(MOCKS, "shots.json")],
  { stdio: "ignore" },
);
