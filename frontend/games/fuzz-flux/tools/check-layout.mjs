#!/usr/bin/env node
/**
 * Checks Fuzz Flux's layout in a headless Chrome, which jsdom can't: the
 * build is served as `yarn preview` serves it and opened at each shape a
 * game is laid out for (`@fz/dev/layout`), and at the smallest phone, at
 * twice the pixels, and turned from upright to its side and back.
 *
 *   yarn build
 *   yarn check:layout
 *
 * At each shape the page must report no error and not scroll, and every
 * control of the bar must lie in the window. The board, as `@fz/dev/layout`
 * inspects one drawn with Phaser, must be drawn on its canvas at the
 * board's pixel ratio, `--across` squares by `--down`, in the window, where
 * the placeholder drew it, to the pixel, with the grid over it; and the
 * panels both shown wherever its room (`data-room`) spares 184 CSS px each
 * side of it, and nowhere else, on the canvas and in the window, off the
 * board, each other and the bar, at least 172 CSS px across and down. A
 * square must be at least 40 CSS px wherever the board's room holds its
 * rows and columns at that, and elsewhere the largest the room allows;
 * each cell of the grid must lie on its square; each button shown must be at least 44 CSS px
 * across and down; each figure of the bar must show whole, in a
 * row where the bar lies across the window; and each panel must show all
 * it holds.
 *
 * It checks the page a new player opens, level 1 begun, and two levels in
 * play kept as the game keeps them, each taken up and ended by its last
 * move, made by the keys, then looked away from, as a player may, which
 * lands the move at once: Clean sweep, the first level on the game's
 * largest board, cleared, and Better together, the most goals, out of
 * moves. Over those its card must lie on the board.
 *
 * It prints what is wrong and fails, or says the layout holds.
 */
import { join } from "node:path";
import {
  PHASER_CANVAS_READY,
  PHASER_CHECKED_AT,
  checkPhaserLayout,
  readRect,
  runLayoutScript,
  whenAllSettle,
} from "@fz/dev/layout";
import { SAVED_GAME_KEY, loadScreenshotApi, storedRun } from "./stored_run.mjs";

/** @import { DevToolsConnection } from "@fz/dev/chrome" */
/** @import { BoardBox, LayoutCheck, LayoutProblem, LayoutScript, LayoutScriptOptions, PhaserBoard } from "@fz/dev/layout" */
/** @import { ScriptMove, ScriptRun } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * The board, as `@fz/dev/layout` inspects a board drawn with Phaser: the
 * grid over it as its ring, laid where the scene laid the board, and the
 * card at a level's end; and the panels beside it, shown both, wherever
 * the room spares them, or neither.
 *
 * @type {PhaserBoard}
 */
const BOARD = {
  name: "board",
  element: "app-board",
  drawnAt: "data-board",
  across: "--across",
  down: "--down",
  placeholder: ".placeholder .squares",
  ring: "app-board-grid",
  card: "app-level-card .card",
  deck: {
    drawnAt: "data-panels",
    zones: ["left", "right"],
    // `PANEL_WIDTH_CSS_PX.least`, in `@fz/phaser/layout`.
    least: 172,
    allOrNone: true,
    // `PANEL_GAP_CSS_PX` and `PANEL_WIDTH_CSS_PX.least`, which a side must
    // spare for the panels at the check's whole pixel ratios.
    spare: { room: "data-room", least: 12 + 172 },
  },
};

/**
 * The board as a level begins, which shows no card: the grid stands in for
 * one, held on the board as a card would be.
 *
 * @type {PhaserBoard}
 */
const BOARD_AS_LEVEL_BEGINS = { ...BOARD, card: "app-board-grid" };

/**
 * Says how a level in play is ended: the level kept a move short, the move
 * that ends it, and what it comes to.
 *
 * @typedef {object} Ending
 * @property {ScriptRun} run
 * @property {ScriptMove} last
 * @property {"cleared" | "over"} outcome
 */

/**
 * Clean sweep, level 18, the last of Bricks and bars and the first level
 * on the game's largest board, 8 squares across by 9 down, kept five
 * moves into its certificate on its deal 1, and cleared by the
 * certificate's last.
 *
 * @type {Ending}
 */
export const CLEARED = {
  run: {
    level: 18,
    deal: 1,
    moves: [
      [50, 51],
      [57, 65],
      [40, 41],
      [66, 67],
      [68, 69],
    ],
  },
  last: [44, 52],
  outcome: "cleared",
};

/**
 * Better together, level 6, of the most goals, 3, kept 10 of its 11 moves
 * into a casual player's game on its deal 15, and run out of moves by the
 * 11th with every goal open, 10 or more left of each, so the Out of moves
 * card shows all three, as wide as it gets.
 *
 * @type {Ending}
 */
export const OUT_OF_MOVES = {
  run: {
    level: 6,
    deal: 15,
    moves: [
      [24, 31],
      [38, 45],
      [5, 6],
      [16, 17],
      [3, 10],
      [32, 33],
      [33, 34],
      [11, 12],
      [10, 17],
      [14, 15],
    ],
  },
  last: [19, 20],
  outcome: "over",
};

/**
 * Returns what is wrong with the page beside what `@fz/dev/layout` checks
 * of every game, given where the board lies: the level shown not the one
 * the check kept, or not standing as it should; a square under 40 CSS px,
 * or under the largest the board's room allows where it can't hold the
 * board at that; a cell of the grid off its square; a button
 * shown under 44 CSS px across or down; a figure of the bar cut off
 * by it, or out of the row the bar's figures stand in across the window;
 * and a panel that cuts off what it holds. It runs in the page, so it uses
 * nothing from this module, and reads the board's room with `readRect()`,
 * which is sent with it.
 *
 * @param {BoardBox} [box]
 * @returns {string[]}
 */
export function inspectPage(box) {
  /** @type {string[]} */
  const problems = [];
  const leastSquare = 40;
  const leastButton = 44;

  /**
   * Returns whether a rectangle lies inside another, to half a pixel.
   *
   * @param {DOMRect} inner
   * @param {DOMRect} outer
   * @returns {boolean}
   */
  const inside = (inner, outer) =>
    inner.left >= outer.left - 0.5 &&
    inner.top >= outer.top - 0.5 &&
    inner.right <= outer.right + 0.5 &&
    inner.bottom <= outer.bottom + 0.5;

  // The level kept, or level 1 where none was, as a new player begins, in
  // play, or ended as the check ended it.
  const board = document.querySelector("app-board");
  /** @type {unknown} */
  const keptLevel = Reflect.get(window, "keptLevel");
  /** @type {unknown} */
  const keptOutcome = Reflect.get(window, "keptOutcome");
  if (keptLevel === undefined) {
    problems.push("Nothing said which level the page shows.");
  } else if (board) {
    const level = keptLevel ?? 1;
    const shown = board.getAttribute("data-level");
    if (shown !== String(level)) {
      problems.push(
        keptLevel === null
          ? `The page shows level ${String(shown)}, where a new player begins on 1.`
          : `The page shows level ${String(shown)}, where it took up ${String(level)}.`,
      );
    }
    const outcome = keptOutcome ?? "playing";
    const stands = board.getAttribute("data-outcome");
    if (stands !== outcome) {
      problems.push(
        `The level is ${String(stands)}, where the check left it ${String(outcome)}.`,
      );
    }
  }

  const style = board && getComputedStyle(board);
  const across = style ? parseFloat(style.getPropertyValue("--across")) : NaN;
  const down = style ? parseFloat(style.getPropertyValue("--down")) : NaN;
  const ratio = style
    ? parseFloat(style.getPropertyValue("--pixel-ratio"))
    : NaN;
  const room = board && readRect(board.getAttribute("data-room"));

  // The design's 40 CSS px is for a phone 320 px wide held upright: a room
  // too small for the board at that, as a small phone on its side is for 9
  // rows, asks the largest square it allows, as `boardMetrics()` fills it.
  const filling =
    room && [across, down, ratio].every(Number.isFinite)
      ? Math.floor(
          Math.min(
            Math.round(room.width * ratio) / across,
            Math.round(room.height * ratio) / down,
          ),
        ) / ratio
      : Infinity;
  if (box && box.unit < Math.min(leastSquare, filling) - 0.01) {
    problems.push(
      filling < leastSquare
        ? `A square is ${box.unit} CSS px, under ${filling}, the largest its room allows a board ${across} by ${down} squares.`
        : `A square is ${box.unit} CSS px, under ${leastSquare}.`,
    );
  }

  // Each cell of the grid on its square, by its index on the board and the
  // board's width.
  if (box && Number.isFinite(across)) {
    for (const cell of document.querySelectorAll("app-board [role=gridcell]")) {
      const index = Number(cell.getAttribute("data-index"));
      const at = cell.getBoundingClientRect();
      const left = box.left + (index % across) * box.unit;
      const top = box.top + Math.floor(index / across) * box.unit;
      if (
        Math.max(
          Math.abs(at.left - left),
          Math.abs(at.top - top),
          Math.abs(at.width - box.unit),
          Math.abs(at.height - box.unit),
        ) > 0.5
      ) {
        problems.push(`The grid's cell ${index} lies off its square.`);
      }
    }
  }

  for (const button of document.querySelectorAll("button")) {
    const at = button.getBoundingClientRect();
    // A button out of sight, as in a closed dialog or menu, takes no room.
    if (at.width === 0 || at.height === 0) continue;
    if (at.width < leastButton - 0.5 || at.height < leastButton - 0.5) {
      // Named as a screen reader names it: its label, its words, its tooltip.
      const label =
        button.getAttribute("aria-label") ??
        (button.textContent.trim() || (button.getAttribute("title") ?? ""));
      problems.push(
        `The ${label} button is ${at.width} by ${at.height} CSS px, under ${leastButton} across or down.`,
      );
    }
  }

  // The bar's figures, each whole inside the bar's status, which cuts off
  // what overflows it, and the bar; in a row where the bar lies across the
  // window.
  const bar = document
    .querySelector("fz-game-bar .bar")
    ?.getBoundingClientRect();
  const status = document
    .querySelector("fz-game-bar .status")
    ?.getBoundingClientRect();
  const figures = [...document.querySelectorAll("app-bar .figure")];
  if (bar && status) {
    for (const figure of figures) {
      if (
        !inside(figure.getBoundingClientRect(), status) ||
        !inside(figure.getBoundingClientRect(), bar)
      ) {
        problems.push(
          `The bar cuts off its ${figure.className.replace("figure ", "")} figure.`,
        );
      }
    }
  }
  const rail =
    document.querySelector("fz-game-bar")?.getAttribute("data-placement") ===
    "end";
  const [first] = figures;
  if (first && !rail) {
    const row = first.getBoundingClientRect();
    if (
      figures.some((figure) => {
        const at = figure.getBoundingClientRect();
        return at.top >= row.bottom || at.bottom <= row.top;
      })
    ) {
      problems.push("The bar's figures stand in more than one row.");
    }
  }

  for (const panel of document.querySelectorAll("app-board .panel")) {
    if (
      panel.scrollHeight > panel.clientHeight + 1 ||
      panel.scrollWidth > panel.clientWidth + 1
    ) {
      problems.push(
        `A panel shows ${panel.clientWidth} by ${panel.clientHeight} CSS px of the ${panel.scrollWidth} by ${panel.scrollHeight} it holds.`,
      );
    }
  }
  return problems;
}

/**
 * Says, in the page before its own scripts, that it shows the level a new
 * player begins on, in play, as no level was kept. It is sent as its
 * source, so it uses nothing from this module.
 */
export function keepingNone() {
  Reflect.set(window, "keptLevel", null);
  Reflect.set(window, "keptOutcome", null);
}

/**
 * Keeps a level in play where the game keeps one, and says which level and
 * how it ends for the inspection to read, in the page before its own
 * scripts; then, once the board is drawn, as `drawn` matches its canvas,
 * makes its last move by the keys,
 * as a player would, on the grid's cell the move picks up: Space picks it
 * up and an arrow swaps it toward its neighbor. Once the rules have played
 * the move, it moves the focus out of the room, as a player looking away
 * does, which lands the move at once, its card shown. It is sent as its
 * source, so it uses nothing from this module.
 *
 * @param {string} key Where the game keeps the level in play.
 * @param {string} stored The level in play as storage keeps it.
 * @param {number} level Its number.
 * @param {ScriptMove} last The move that ends it.
 * @param {string} outcome What the move ends it as.
 * @param {string} drawn `PHASER_CANVAS_READY`, which this can't import.
 */
export function keepEndingRun(key, stored, level, last, outcome, drawn) {
  localStorage.setItem(key, stored);
  Reflect.set(window, "keptLevel", level);
  Reflect.set(window, "keptOutcome", outcome);
  const [from, to] = last;
  /**
   * Presses a key on an element and lets it go.
   *
   * @param {Element} on
   * @param {string} code
   * @param {number} keyCode
   */
  const press = (on, code, keyCode) => {
    for (const type of ["keydown", "keyup"]) {
      const event = new KeyboardEvent(type, {
        key: code === "Space" ? " " : code,
        code,
        bubbles: true,
      });
      // Phaser reads a key's code from `keyCode`, which a made event leaves 0.
      Object.defineProperty(event, "keyCode", { get: () => keyCode });
      on.dispatchEvent(event);
    }
  };
  /**
   * Returns the arrow from a square of a board to its neighbor, by its code
   * and its key code.
   *
   * @param {number} across The board's width, in squares.
   * @returns {[string, number]}
   */
  const arrow = (across) => {
    if (to === from + 1) return ["ArrowRight", 39];
    if (to === from - 1) return ["ArrowLeft", 37];
    return to === from + across ? ["ArrowDown", 40] : ["ArrowUp", 38];
  };
  const moved = () => {
    const board = document.querySelector("app-board");
    const cell = board?.querySelector(`[role=gridcell][data-index="${from}"]`);
    if (
      !board ||
      !(cell instanceof HTMLElement) ||
      !document.querySelector(drawn)
    ) {
      setTimeout(moved, 50);
      return;
    }
    cell.focus();
    press(cell, "Space", 32);
    const across = parseFloat(
      getComputedStyle(board).getPropertyValue("--across"),
    );
    press(cell, ...arrow(across));
    const ended = () => {
      if (board.getAttribute("data-outcome") === "playing") {
        setTimeout(ended, 50);
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    ended();
  };
  moved();
}

/**
 * Returns the problems a pass found, each shape named for the pass.
 *
 * @param {LayoutProblem[]} problems
 * @param {string} pass
 * @returns {LayoutProblem[]}
 */
function namedFor(problems, pass) {
  return problems.map(({ shape, problem }) => ({
    shape: `${shape}, ${pass}`,
    problem,
  }));
}

/**
 * How long a page has to show a level's card: long enough for the frames
 * the move takes to land after it is looked away from, which CI's Chrome
 * draws in software a few a second.
 */
const CARD_TIMEOUT_MS = 60_000;

/**
 * Checks the layout at each shape and turn as a new player's level begins,
 * and beside them again over the two levels kept, each ended, and returns
 * what is wrong, each pass but the first's shapes named for it. It keeps
 * the levels first, so one that can't be kept fails the check before
 * Chrome opens a page.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @returns {Promise<LayoutProblem[]>}
 */
async function checkEach(devtools, url) {
  const api = await loadScreenshotApi();
  /**
   * Returns the check of a level kept and ended.
   *
   * @param {Ending} ending
   * @returns {LayoutCheck<Parameters<typeof keepEndingRun>>}
   */
  const ended = ({ run, last, outcome }) => ({
    url,
    ready: BOARD.card,
    readyTimeoutMs: CARD_TIMEOUT_MS,
    board: BOARD,
    inspect: inspectPage,
    before: {
      run: keepEndingRun,
      args: [
        SAVED_GAME_KEY,
        storedRun(api, run),
        run.level,
        last,
        outcome,
        PHASER_CANVAS_READY,
      ],
    },
  });
  const cleared = ended(CLEARED);
  const outOfMoves = ended(OUT_OF_MOVES);
  const [begun, endedCleared, endedOver] = await whenAllSettle([
    checkPhaserLayout(devtools, {
      url,
      ready: PHASER_CANVAS_READY,
      board: BOARD_AS_LEVEL_BEGINS,
      inspect: inspectPage,
      before: keepingNone,
    }),
    checkPhaserLayout(devtools, cleared),
    checkPhaserLayout(devtools, outOfMoves),
  ]);
  return [
    ...begun,
    ...namedFor(endedCleared, "Clean sweep cleared"),
    ...namedFor(endedOver, "Better together out of moves"),
  ];
}

/**
 * What checks the layout: the board, its grid, its panels, the bar and the
 * cards at each shape and turn, as a new player's level begins and over
 * two levels kept, each ended.
 *
 * @type {LayoutScript}
 */
const LAYOUT_SCRIPT = {
  game: "Fuzz Flux",
  root: ROOT,
  check: checkEach,
  holds: `at each shape and turn, as a level begins and as two levels kept end, cleared and out of moves: ${PHASER_CHECKED_AT}`,
};

/**
 * Checks the layout of the build in `dist/` as a command line asks, or
 * prints its usage, and returns the code to exit with: 0 where it holds, 1
 * where it doesn't, or 2 for a command line it can't read, before Chrome
 * starts. It throws where it can't check at all, as for no build.
 *
 * @param {readonly string[]} args
 * @param {Omit<LayoutScriptOptions, "args">} [options] What runs Chrome and
 *   where it prints, where a spec stands in for them.
 * @returns {Promise<number>}
 */
export function checkLayout(args, options = {}) {
  return runLayoutScript(LAYOUT_SCRIPT, { ...options, args });
}

if (import.meta.main) {
  process.exitCode = await checkLayout(process.argv.slice(2));
}
