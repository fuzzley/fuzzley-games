#!/usr/bin/env node
/**
 * Checks Brick Breaker's layout in a headless Chrome, which jsdom can't: the
 * build is served as `yarn preview` serves it and opened at each shape a
 * game is laid out for (`@fz/dev/layout`), and at the smallest phone, at
 * twice the pixels, and turned from upright to its side and back.
 *
 *   yarn build
 *   yarn check:layout
 *
 * At each shape the page must report no error and not scroll; the field, as
 * `@fz/dev/layout` inspects a board drawn with Phaser, must be drawn on its
 * canvas at the board's pixel ratio, keep its shape, 26 units by the height
 * the board gives it (`--down`), and lie in the window, where the
 * placeholder drew it, to the pixel, and inside the focus ring, its card on
 * it; its unit must be at least 10 CSS px (9 in a window under 360 CSS px
 * tall); and, as the ball waits to be served, a field taller than 30
 * units, and only one, must leave a finger's room under it
 * (`--finger-room`), past the canvas's inset (`--fz-canvas-inset-bottom`),
 * and the Ready card's foot lie no lower than `--card-foot` units below the
 * field's middle, clear of the ball;
 * and the panels must both show wherever its room (`data-room`) spares 186
 * CSS px each side of the field's cells, and nowhere else, on the canvas
 * and in the window, off the field, each other and the bar, at least 172
 * CSS px across and down, each holding the parts it shows, the level's
 * stars among them, whole, as a panel clips what runs past its foot.
 *
 * Beside those pages, it opens the game at each shape again, at twice the
 * pixels, over a run kept on Fuse with its fuse lit, which each page takes
 * up and goes on with, so the fuse burns and clears the level: the Cleared card, at its
 * tallest, its three stars just won and a line for double pay, must lie on
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
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser; its card
 * is Ready's, as the ball waits on the paddle, or Cleared's, over the level
 * the run kept for it clears; and the panels beside it, shown both, wherever
 * the room spares them, or neither.
 *
 * @type {PhaserBoard}
 */
const FIELD = {
  name: "field",
  element: "app-board",
  drawnAt: "data-field",
  across: 26,
  down: "--down",
  placeholder: ".placeholder .field",
  ring: ".ring",
  card: ".card",
  deck: {
    drawnAt: "data-panels",
    zones: ["left", "right"],
    // `PANEL_WIDTH_CSS_PX.least`, in `@fz/phaser/layout`.
    least: 172,
    allOrNone: true,
    // `PANEL_GAP_CSS_PX` and `PANEL_WIDTH_CSS_PX.least`, which a side must
    // spare for the panels at the check's whole pixel ratios, past the
    // wall (`WALL_CSS_PX`), which the field's cells (`data-field`) leave
    // out and the panels keep their gap from.
    spare: { room: "data-room", least: 12 + 172 + 2 },
  },
};

/**
 * Returns what is wrong with the field's unit, the room under it, the
 * Ready card's foot, the Cleared card's line for double pay and the parts
 * the panels show, given where the field lies. It runs in the page, so it uses nothing from this module.
 *
 * @param {BoardBox} [field]
 * @returns {string[]}
 */
function inspectField(field) {
  /** @type {string[]} */
  const problems = [];
  const board = document.querySelector("app-board");
  if (!field || !board) return problems;
  // A phone on its side under 360 CSS px tall can't give the field's 30
  // units of height 10 px each, after the room around it: 568 × 320 gives 9.5.
  const smallest = innerHeight < 360 ? 9 : 10;
  if (field.unit < smallest) {
    problems.push(
      `The field's unit is ${field.unit} CSS px, under ${smallest}.`,
    );
  }
  const style = getComputedStyle(board);
  const down = parseFloat(style.getPropertyValue("--down"));
  const finger = parseFloat(style.getPropertyValue("--finger-room"));
  const inset = parseFloat(style.getPropertyValue("--fz-canvas-inset-bottom"));
  const under = board.getBoundingClientRect().bottom - field.top - field.height;
  const taller = down > 30;
  const fingered = finger > 0;
  if (taller !== fingered) {
    problems.push(
      `The field is ${down} units tall, with ${finger} CSS px for a finger under it.`,
    );
  } else if (under < inset + finger) {
    problems.push(
      `The field leaves ${under.toFixed(1)} CSS px under it, less than the canvas's inset, ${inset}, and a finger's room, ${finger}.`,
    );
  }
  // The Ready card rises where it is too tall for the gap over the paddle,
  // as one naming a new kind of brick may be, so its foot lies no lower
  // than `--card-foot` units below the field's middle, clear of the ball.
  const card = board.querySelector(".card.ready")?.getBoundingClientRect();
  const foot = parseFloat(style.getPropertyValue("--card-foot"));
  const lowest = field.top + (down / 2 + foot) * field.unit;
  if (card && card.bottom > lowest + 1) {
    problems.push(
      `The Ready card's foot lies ${(card.bottom - lowest).toFixed(1)} CSS px lower than it may, over the ball.`,
    );
  }
  // Over the run kept for it, the Cleared card shows its tallest, with a
  // line for double pay, which the field must hold.
  const cleared = board.querySelector(".card.cleared");
  if (cleared && !cleared.textContent?.includes("Double pay")) {
    problems.push("The Cleared card shows no line for double pay.");
  }
  // A panel clips what runs past its foot, so the parts it shows, a
  // compact one its first two, must fit it whole.
  for (const panel of board.querySelectorAll("app-bench, app-in-play")) {
    const over = panel.scrollHeight - panel.clientHeight;
    if (over > 1) {
      problems.push(
        `${panel.querySelector("h2")?.textContent ?? panel.localName} runs ${over} CSS px past its foot, clipped.`,
      );
    }
  }
  return problems;
}

/** The shapes the Cleared card is checked at: every shape, at twice the pixels. */
const CLEARED_AT = shapesAt(2, [...SHAPES, SMALLEST]);

/** What the page matches once the Cleared card shows. */
const CLEARED_CARD = "app-board .card.cleared";

/**
 * How long a page has to show the Cleared card: some 90 frames after it
 * goes on with the run, as Phaser counts each of a game's first 120 frames
 * as a 60th of a second at most, and any frame slower than a fifth of a
 * second as the last it counted, and Chrome drawing WebGL in software, as
 * CI's does, draws the roomy window at twice the pixels a few frames a
 * second, fewer with other pages drawing beside it.
 */
const CLEARED_TIMEOUT_MS = 60_000;

/**
 * Keeps a run where the game keeps one, and goes on with it, by its Paused
 * card's Resume, once the page has taken it up and drawn its field, in the
 * page before its own scripts. It is sent as its source, so it uses nothing
 * from this module.
 *
 * @param {string} key Where the game keeps the run.
 * @param {string} stored The run as storage keeps it.
 * @param {string} drawn What the page matches once it has drawn the field.
 */
function keepRunAndGoOn(key, stored, drawn) {
  localStorage.setItem(key, stored);
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
 * Returns what runs in the page before its own scripts: {@link keepRunAndGoOn},
 * handed where the game keeps a run, {@link CLEARING_RUN} as storage keeps
 * it, and what the page matches once it has drawn the field.
 *
 * @param {ScreenshotApi} api
 * @returns {BeforeLoad<Parameters<typeof keepRunAndGoOn>>}
 */
function clearing(api) {
  return {
    run: keepRunAndGoOn,
    args: [
      SAVED_GAME_KEY,
      storedRun(api, CLEARING_RUN).stored,
      PHASER_CANVAS_READY,
    ],
  };
}

/**
 * Checks the layout at each shape and turn as the ball waits to be served,
 * and beside them at each shape over a level cleared, and returns what is
 * wrong, the second pass's shapes named for the Cleared card. It keeps the run first,
 * so a run that can't be kept fails the check before Chrome opens a page.
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
    checkPhaserLayout(devtools, check),
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
  game: "Brick Breaker",
  root: join(import.meta.dirname, ".."),
  check: checkBoth,
  holds: `at each shape and turn: ${PHASER_CHECKED_AT}; and the Cleared card at each shape`,
});
