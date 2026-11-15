#!/usr/bin/env node
/**
 * Checks Asteroid Breaker's layout in a headless Chrome, which jsdom can't:
 * the build is served as `yarn preview` serves it and opened at each shape a
 * game is laid out for (`@fz/dev/layout`), and at the smallest phone, at
 * twice the pixels, and turned from upright to its side and back, with the
 * deck shown, as a touch screen shows it.
 *
 *   yarn build
 *   yarn check:layout
 *
 * At each shape the page must report no error and not scroll; the field, as
 * `@fz/dev/layout` inspects a board drawn with Phaser, must be drawn on its
 * canvas at the board's pixel ratio, keep its shape, `--across` units by
 * `--down`, and lie in the window, where the placeholder drew it, to the
 * pixel, and inside the focus ring, its card on it; the deck's stick zone
 * and its buttons' must each show, on the canvas and in the window, off the
 * field, each other and the bar, at least 112 CSS px across and down; and
 * the field's short side must be 40 units, each at least 6 CSS px, filling
 * the room the deck and the margin leave it both ways, or only one where
 * its long side is the longest a field grows to; and the sector's card over
 * a new run's first wave must leave the ship waiting in its middle in sight,
 * a unit and a half round it.
 *
 * Beside those pages, it opens the game at each shape again, at twice the
 * pixels, over a run kept on the last written wave, a volatile rock its
 * last, broken and its fuse lit, which each page takes up and goes on
 * with, so the rock goes off and clears the wave: the Cleared card must be
 * at its tallest, the trophy over the last sector's last wave, and lie on
 * the field, and the rest hold as above.
 * It prints what is wrong and fails, or says the layout holds.
 */
import { join } from "node:path";
import {
  PHASER_CANVAS_READY,
  PHASER_CHECKED_AT,
  SHAPES,
  SMALLEST,
  checkLayout,
  checkPhaserLayout,
  readRect,
  runLayoutScript,
  shapesAt,
  whenAllSettle,
} from "@fz/dev/layout";
import {
  CLEARING_RUN,
  SAVED_GAME_KEY,
  loadScreenshotApi,
  storedRun,
} from "./stored_run.mjs";

/** @import { DevToolsConnection } from "@fz/dev/chrome" */
/** @import { BeforeLoad, BoardBox, LayoutCheck, LayoutProblem, PhaserBoard } from "@fz/dev/layout" */
/** @import { ScreenshotApi } from "../src/testing/script_api.ts" */

/**
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser, its
 * shape as the board says it laid it out, and its card the one over a new
 * run's first wave, as it waits for its first move, or the Cleared card,
 * over the wave the run kept for it clears; and the deck beside it.
 *
 * @type {PhaserBoard}
 */
const FIELD = {
  name: "field",
  element: "app-board",
  drawnAt: "data-field",
  across: "--across",
  down: "--down",
  placeholder: ".placeholder .field",
  ring: ".ring",
  card: ".card",
  deck: { drawnAt: "data-deck", zones: ["stick", "buttons"], least: 112 },
};

/**
 * Where the game keeps its settings, and the settings the check plays
 * with: the deck shown on every screen, as on a touch screen, which a
 * headless Chrome isn't, and no haptics, whose buzz Chrome blocks, and
 * reports, in a page no one has tapped. The key and the version are copies
 * of `SETTINGS_KEY` and `SETTINGS_VERSION` in
 * `src/app/settings/settings.service.ts`, the shell's, which the scripts
 * can't import; the shell drops settings stored under another version.
 */
const SETTINGS = {
  key: "asteroid-breaker-settings",
  stored: JSON.stringify({ version: 1, deck: "always", haptics: false }),
};

/**
 * Keeps settings where the game keeps them, in the page before its own
 * scripts. It is sent as its source, so it uses nothing from this module.
 *
 * @param {string} key Where the game keeps its settings.
 * @param {string} stored The settings as storage keeps them.
 */
function keepSettings(key, stored) {
  localStorage.setItem(key, stored);
}

/**
 * What runs in the page before its own scripts as a new run's first wave
 * waits: {@link keepSettings}, handed the settings the check plays with.
 *
 * @type {BeforeLoad<Parameters<typeof keepSettings>>}
 */
const SETTING_UP = {
  run: keepSettings,
  args: [SETTINGS.key, SETTINGS.stored],
};

/** The shapes the Cleared card is checked at: every shape, at twice the pixels. */
const CLEARED_AT = shapesAt(2, [...SHAPES, SMALLEST]);

/** What the page matches once the Cleared card shows. */
const CLEARED_CARD = "app-board .card.cleared";

/**
 * How long a page has to show the Cleared card once it goes on with the
 * run: the fuse's beat and the shards' flight, as Chrome drawing WebGL in
 * software, as CI's does, draws the roomy window at twice the pixels a few
 * frames a second, fewer with other pages drawing beside it.
 */
const CLEARED_TIMEOUT_MS = 60_000;

/**
 * Keeps a run where the game keeps one and the settings the check plays
 * with, and goes on with the run, by its Paused card's Resume, once the
 * page has taken it up and drawn its field, in the page before its own
 * scripts. It is sent as its source, so it uses nothing from this module.
 *
 * @param {string} runKey Where the game keeps the run.
 * @param {string} run The run as storage keeps it.
 * @param {string} settingsKey Where the game keeps its settings.
 * @param {string} settings The settings as storage keeps them.
 * @param {string} drawn What the page matches once it has drawn the field.
 */
function keepRunAndGoOn(runKey, run, settingsKey, settings, drawn) {
  localStorage.setItem(runKey, run);
  localStorage.setItem(settingsKey, settings);
  const goOn = () => {
    const outcome = document
      .querySelector("app-board")
      ?.getAttribute("data-outcome");
    if (outcome === "cleared") return;
    const resume = [
      ...document.querySelectorAll("app-board .card button"),
    ].find((button) => button.textContent?.trim() === "Resume");
    if (document.querySelector(drawn) && resume instanceof HTMLElement) {
      resume.click();
    }
    requestAnimationFrame(goOn);
  };
  requestAnimationFrame(goOn);
}

/**
 * Returns what runs in the page before its own scripts:
 * {@link keepRunAndGoOn}, handed where the game keeps a run,
 * {@link CLEARING_RUN} as storage keeps it, the settings the check plays
 * with, and what the page matches once it has drawn the field.
 *
 * @param {ScreenshotApi} api
 * @returns {BeforeLoad<Parameters<typeof keepRunAndGoOn>>}
 */
function clearing(api) {
  return {
    run: keepRunAndGoOn,
    args: [
      SAVED_GAME_KEY,
      storedRun(api, api.clearingRun(CLEARING_RUN)),
      SETTINGS.key,
      SETTINGS.stored,
      PHASER_CANVAS_READY,
    ],
  };
}

/**
 * Returns what is wrong with the field's shape, its unit and how it fills
 * its room, given where the field lies, and with the cards over it: the
 * sector's lying over the ship waiting in its middle, or the Cleared card
 * lacking its trophy. It runs in the page, so it uses
 * nothing from this module, and reads the field's and the room's rectangles
 * with `readRect()`, which is sent with it.
 *
 * @param {BoardBox} [field]
 * @returns {string[]}
 */
function inspectField(field) {
  /** @type {string[]} */
  const problems = [];
  const board = document.querySelector("app-board");
  if (!field || !board) return problems;
  const style = getComputedStyle(board);
  const across = parseFloat(style.getPropertyValue("--across"));
  const down = parseFloat(style.getPropertyValue("--down"));
  // `FIELD_SHORT_SIDE` and `FIELD_LONGEST_SIDE`, in src/rules/tuning.ts.
  const short = 40;
  const longest = 88;
  if (Math.min(across, down) !== short) {
    problems.push(
      `The field's short side is ${Math.min(across, down)} units, not ${short}.`,
    );
  }
  if (field.unit < 6) {
    problems.push(`The field's unit is ${field.unit} CSS px, under 6.`);
  }
  // The ship waits in the field's middle, its nose half `SHIP_LENGTH` (in
  // src/rules/tuning.ts), 1.2 units, from it, which the sector's card must
  // leave in sight, with room to spare.
  const sector = board.querySelector(".card.sector")?.getBoundingClientRect();
  const reach = 1.5 * field.unit;
  const middleX = field.left + field.width / 2;
  const middleY = field.top + field.height / 2;
  if (
    sector &&
    sector.right > middleX - reach &&
    sector.left < middleX + reach &&
    sector.bottom > middleY - reach &&
    sector.top < middleY + reach
  ) {
    problems.push(
      "The sector's card lies over the ship waiting in its middle.",
    );
  }
  // The Cleared card is checked at its tallest, the trophy over it, though
  // a short field hides it.
  const cleared = board.querySelector(".card.cleared");
  if (cleared && !cleared.querySelector(".card-icon")) {
    problems.push(
      "The Cleared card has no trophy, so it isn't at its tallest.",
    );
  }
  const drawn = readRect(board.getAttribute("data-field"));
  const room = readRect(board.getAttribute("data-room"));
  // The board's own inspection says where the field doesn't say where it
  // lies, and hands no box.
  if (!drawn) return problems;
  if (!room) {
    problems.push("app-board doesn't say where the field's room lies.");
    return problems;
  }
  const { x, y, width, height } = drawn;
  const { x: roomX, y: roomY, width: roomWidth, height: roomHeight } = room;
  // A CSS pixel each way for the field's rounding to whole device pixels.
  const leftAcross = roomWidth - width;
  const leftDown = roomHeight - height;
  if (
    x < roomX - 1 ||
    y < roomY - 1 ||
    leftAcross < -1 ||
    leftDown < -1 ||
    x + width > roomX + roomWidth + 1 ||
    y + height > roomY + roomHeight + 1
  ) {
    problems.push("The field runs out of its room.");
  } else if (
    (Math.max(across, down) === longest
      ? Math.min(leftAcross, leftDown)
      : Math.max(leftAcross, leftDown)) > 1
  ) {
    problems.push(
      `The field leaves ${leftAcross} by ${leftDown} CSS px of its room.`,
    );
  }
  return problems;
}

/**
 * Checks the layout at each shape and turn as a new run's first wave waits,
 * and beside them at each shape over a wave cleared, and returns what is
 * wrong, the second pass's shapes named for the Cleared card. It keeps the
 * run first, so a run that can't be kept fails the check before Chrome
 * opens a page.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @returns {Promise<LayoutProblem[]>}
 */
async function checkBoth(devtools, url) {
  const before = clearing(await loadScreenshotApi());
  /** @type {LayoutCheck} */
  const check = {
    url,
    ready: PHASER_CANVAS_READY,
    board: FIELD,
    inspect: inspectField,
  };
  const [waiting, cleared] = await whenAllSettle([
    checkPhaserLayout(devtools, { ...check, before: SETTING_UP }),
    checkLayout(
      devtools,
      {
        ...check,
        ready: CLEARED_CARD,
        readyTimeoutMs: CLEARED_TIMEOUT_MS,
        before,
      },
      CLEARED_AT,
    ),
  ]);
  return [
    ...waiting,
    ...cleared.map(({ shape, problem }) => ({
      shape: `${shape}, the Cleared card`,
      problem,
    })),
  ];
}

process.exitCode = await runLayoutScript({
  game: "Asteroid Breaker",
  root: join(import.meta.dirname, ".."),
  check: checkBoth,
  holds: `at each shape and turn, the deck shown: ${PHASER_CHECKED_AT}; and the Cleared card at each shape`,
});
