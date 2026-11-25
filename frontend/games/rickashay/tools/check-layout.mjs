#!/usr/bin/env node
/**
 * Checks Rickashay's layout in a headless Chrome, which jsdom can't: the
 * build is served as `yarn preview` serves it and opened at each shape a
 * game is laid out for (`@fz/dev/layout`), and at the smallest phone, at
 * twice the pixels, and turned from upright to its side and back.
 *
 *   yarn build
 *   yarn check:layout
 *
 * At each shape the page must report no error and not scroll; the field, as
 * `@fz/dev/layout` inspects a board drawn with Phaser, must be drawn on its
 * canvas at the board's pixel ratio, keep its shape, 9 units across
 * (`--across`) by its depth, floor's band and lintel down (`--down`), and
 * lie in the window, where the placeholder drew it, to the pixel, and
 * inside the focus ring, its card on it; and the panels' places must both
 * be laid wherever the field's room (`data-room`) spares 184 CSS px each
 * side of it, and nowhere else, on the canvas and in the window, off the
 * field, each other and the bar, at least 172 CSS px across and down. The
 * field's unit must be at least 24 CSS px, and its unit, depth
 * (`data-depth`), floor's band (`--band`) and lintel (`--lintel`) the ones
 * its room asks for; it must lie in its room, filling the room's width
 * where it is deeper than 11 rows and its height where it is 11, within a
 * device pixel a cell; and, as the level waits for its first shot
 * (`data-outcome`), the wall must stand on the row the level opens on at
 * the field's depth (`data-wall`), after a turn of the window too, as the
 * rules begin a level with no round played again on a depth the field
 * takes.
 *
 * Beside those pages, it does it all again over a run kept as the game
 * keeps one, a round played, which each page takes up paused: the wall must
 * stand as many rows from the floor as the run kept it at every shape, and
 * through each turn, the field's depth whatever it is. The run's score is
 * five figures long, and on every page the bar must show the game's name
 * whole wherever it shows it.
 *
 * It does both again with Release with a button on, which adds Release to
 * the bar and steps its link home down. So the bar's controls, which
 * `@fz/dev/layout` holds inside the window on every page, are held there as
 * a shot is aimed, as the level waits, and as a flight in the air shows
 * them, as the run taken up paused does, with Release off and on.
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
import {
  LAYOUT_RUN,
  SAVED_GAME_KEY,
  loadScreenshotApi,
  storedRun,
} from "./stored_run.mjs";

/** @import { DevToolsConnection } from "@fz/dev/chrome" */
/** @import { BeforeLoad, BoardBox, LayoutCheck, LayoutProblem, LayoutScript, LayoutScriptOptions, PhaserBoard } from "@fz/dev/layout" */
/** @import { ScreenshotApi } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser, from
 * the lintel's top to the floor's band's bottom, its card Ready's as a
 * level waits for its first shot, or Paused's over a run taken up; and the
 * panels' places beside it, laid both, wherever the room spares them, or
 * neither.
 *
 * @type {PhaserBoard}
 */
const FIELD = {
  name: "field",
  element: "fz-wall-board",
  drawnAt: "data-field",
  across: "--across",
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
    // spare for the panels at the check's whole pixel ratios.
    spare: { room: "data-room", least: 12 + 172 },
  },
};

/**
 * Returns what is wrong with the field's unit and shape, where it lies in
 * its room and where the wall stands, given where the field lies: on the
 * row a level opens on as it waits for its first shot, or, where the page
 * took up the run the check keeps (`LAYOUT_RUN`), on the row the run kept
 * it on. It runs in the page, so it uses nothing from this module, and
 * reads the board's rectangles with `readRect()`, which is sent with it.
 *
 * First it says the game's name cut short in the bar, wherever the bar
 * shows it, which beside the run kept's five-figure score it mustn't be.
 *
 * @param {BoardBox} [field]
 * @returns {string[]}
 */
export function inspectField(field) {
  /** @type {string[]} */
  const problems = [];
  const title = document.querySelector("fz-game-bar .title");
  if (
    title &&
    !title.classList.contains("fz-visually-hidden") &&
    title.scrollWidth > title.clientWidth
  ) {
    problems.push(
      `The bar cuts the game's name short: ${title.clientWidth} of its ${title.scrollWidth} CSS px show.`,
    );
  }
  const board = document.querySelector("fz-wall-board");
  if (!field || !board) return problems;
  // `COLUMNS`, `LEAST_DEPTH` and `MOST_DEPTH`, in @fz/brick-wall/rules/field;
  // and `FLOOR_BAND` and `LINTEL`, in @fz/brick-wall/view/field_metrics.
  const columns = 9;
  const fewestRows = 11;
  const mostRows = 22;
  const band = { least: 0.6, most: 1.1 };
  const lintel = { least: 0.5, most: 1 };
  // The plan's floor for a unit, which a small phone on its side meets
  // exactly.
  const leastUnit = 24;

  if (field.unit < leastUnit) {
    problems.push(
      `The field's unit is ${field.unit} CSS px, under ${leastUnit}.`,
    );
  }

  const style = getComputedStyle(board);
  const ratio = parseFloat(style.getPropertyValue("--pixel-ratio"));
  const drawn = readRect(board.getAttribute("data-field"));
  // The board's own inspection says where the ratio is missing, and hands
  // no field where `data-field` is.
  if (!drawn || !Number.isFinite(ratio)) {
    return problems;
  }
  const room = readRect(board.getAttribute("data-room"));
  // The panels' inspection says where it is missing.
  if (!room) return problems;

  /**
   * Returns a size rounded down to a whole number, a hair under one
   * counting as it, as the field's metrics round.
   *
   * @param {number} size
   * @returns {number}
   */
  function whole(size) {
    return Math.floor(size + 1e-6);
  }

  // The shape the room asks for, in device pixels, worked out as
  // `fieldShape()` works it out between rounds.
  const roomWidth = Math.round(room.width * ratio);
  const roomHeight = Math.round(room.height * ratio);
  const thinnest = band.least + lintel.least;
  const unit = Math.max(
    1,
    whole(Math.min(roomWidth / columns, roomHeight / (fewestRows + thinnest))),
  );
  const depth = Math.min(
    mostRows,
    Math.max(fewestRows, whole(roomHeight / unit - thinnest)),
  );
  const spare = Math.max(0, roomHeight / unit - depth - thinnest);
  const toBand = Math.min(spare, band.most - band.least);
  const toLintel = Math.min(spare - toBand, lintel.most - lintel.least);
  const asked = depth + thinnest + toBand + toLintel;
  const drawnUnit = field.unit * ratio;
  if (Math.abs(drawnUnit - unit) > 0.01) {
    problems.push(
      `The field's unit is ${drawnUnit} device px, where its room, ${roomWidth} × ${roomHeight}, asks for ${unit}.`,
    );
  }
  const laidDepth = Number(board.getAttribute("data-depth"));
  if (laidDepth !== depth) {
    problems.push(
      `The field is ${String(board.getAttribute("data-depth"))} rows deep, where its room asks for ${depth}.`,
    );
  }
  // The band rounded down to whole device pixels and the lintel up, as
  // `bandPixels()` and `lintelPixels()` round them.
  const bandPx = whole((band.least + toBand) * unit);
  const lintelPx = Math.ceil((lintel.least + toLintel) * unit - 1e-6);
  const drawnBand = parseFloat(style.getPropertyValue("--band")) * ratio;
  const drawnLintel = parseFloat(style.getPropertyValue("--lintel")) * ratio;
  if (!Number.isFinite(drawnBand)) {
    problems.push("fz-wall-board gives no --band.");
  } else if (Math.abs(drawnBand - bandPx) > 0.01) {
    problems.push(
      `The floor's band is ${drawnBand} device px, where the field's room asks for ${bandPx}.`,
    );
  }
  if (!Number.isFinite(drawnLintel)) {
    problems.push("fz-wall-board gives no --lintel.");
  } else if (Math.abs(drawnLintel - lintelPx) > 0.01) {
    problems.push(
      `The lintel is ${drawnLintel} device px, where the field's room asks for ${lintelPx}.`,
    );
  }

  // The field's metrics let a field overrun its room by a CSS pixel only
  // while a round flies, as a resize of a pixel keeps its unit; between
  // rounds the field takes its room's shape, and lies in the room.
  if (
    drawn.x < room.x - 0.01 ||
    drawn.y < room.y - 0.01 ||
    drawn.x + drawn.width > room.x + room.width + 0.01 ||
    drawn.y + drawn.height > room.y + room.height + 0.01
  ) {
    problems.push("The field runs out of its room.");
  }
  // The plan's bound for filling the room, a device pixel a cell: under 9
  // left across, and under one for each unit down. With the unit, the depth,
  // the band and the lintel each held above, it restates them, as the plan
  // words it.
  const leftAcross = roomWidth - Math.round(drawn.width * ratio);
  const leftDown = roomHeight - Math.round(drawn.height * ratio);
  if (depth > fewestRows && leftAcross >= columns) {
    problems.push(
      `The field, ${depth} rows deep, leaves ${leftAcross} device px of its room's width.`,
    );
  } else if (depth === fewestRows && leftDown >= Math.ceil(asked)) {
    problems.push(
      `The field, ${depth} rows deep, leaves ${leftDown} device px of its room's height.`,
    );
  }

  // The settings the check kept, read back from the bar, so a pass with
  // Release with a button on can't check the bar without it, as it would
  // where the shell dropped settings kept at a version it no longer reads.
  const keptRelease = Reflect.get(window, "keptReleaseByButton");
  const bar = document.querySelector("app-bar");
  if (
    typeof keptRelease === "boolean" &&
    bar &&
    bar.classList.contains("release-by-button") !== keptRelease
  ) {
    problems.push(
      keptRelease
        ? "The bar doesn't have Release with a button on, as the check kept it."
        : "The bar has Release with a button on, which the check didn't keep.",
    );
  }

  const outcome = board.getAttribute("data-outcome");
  const wall = board.getAttribute("data-wall");
  // The row the run kept stands its wall on, where the page took one up,
  // or null for a level waiting for its first shot, as `keepRun()` or
  // `keepingNone()` says.
  const keptRow = Reflect.get(window, "keptWallRow");
  if (keptRow === undefined) {
    problems.push("Nothing said which run the page shows.");
    return problems;
  }
  if (typeof keptRow === "number") {
    if (outcome !== "paused") {
      problems.push(
        `The run kept isn't taken up paused: it is ${String(outcome)}.`,
      );
    } else if (Number(wall) !== keptRow) {
      problems.push(
        `The wall stands on row ${String(wall)}, where the run kept it on ${keptRow}.`,
      );
    }
    return problems;
  }
  // `thirdsOf()`'s `opensOn`, in @fz/brick-wall/rules/wall, at the depth
  // the board laid the field out in: two jumps under the ceiling.
  const opensOn = laidDepth - 2 * Math.floor((laidDepth - 1) / 3);
  if (outcome !== "ready") {
    problems.push(
      `The level doesn't wait for its first shot: it is ${String(outcome)}.`,
    );
  } else if (Number(wall) !== opensOn) {
    problems.push(
      `The wall stands on row ${String(wall)}, where a level ${laidDepth} rows deep opens on ${opensOn}.`,
    );
  }
  return problems;
}

/**
 * Settings as the game keeps them: where, and as storage keeps them.
 *
 * @typedef {{key: string, stored: string}} KeptSettings
 */

/**
 * The settings the check's other passes keep, Release with a button on,
 * which adds Release to the bar and steps its link home down: where the
 * game keeps them, a copy of `SETTINGS_KEY` in
 * `src/app/settings/settings.service.ts`, the shell's, which the scripts'
 * entries can't import, and as storage keeps them, at `SETTINGS_VERSION`
 * there, every other setting its default.
 *
 * @type {KeptSettings}
 */
const RELEASE_BY_BUTTON = {
  key: "rickashay-settings",
  stored: JSON.stringify({ version: 1, releaseByButton: true }),
};

/**
 * Says, in the page before its own scripts, that it shows a level waiting
 * for its first shot, kept by no run, and keeps the settings handed, if
 * any, Release with a button on, saying so. It is sent as its source, so
 * it uses nothing from this module.
 *
 * @param {KeptSettings | null} settings
 */
export function keepingNone(settings) {
  if (settings) localStorage.setItem(settings.key, settings.stored);
  Reflect.set(window, "keptWallRow", null);
  Reflect.set(window, "keptReleaseByButton", settings !== null);
}

/**
 * Keeps a run where the game keeps one, and the settings handed, if any,
 * Release with a button on, and says the row its wall stands on and
 * whether it kept them for the inspection to read, in the page before its
 * own scripts. It is sent as its source, so it uses nothing from this
 * module.
 *
 * @param {string} key Where the game keeps the run.
 * @param {string} stored The run as storage keeps it.
 * @param {number} row The row its wall stands on.
 * @param {KeptSettings | null} settings
 */
export function keepRun(key, stored, row, settings) {
  localStorage.setItem(key, stored);
  if (settings) localStorage.setItem(settings.key, settings.stored);
  Reflect.set(window, "keptWallRow", row);
  Reflect.set(window, "keptReleaseByButton", settings !== null);
}

/**
 * Returns what runs in the page before its own scripts: {@link keepRun},
 * handed where the game keeps a run, {@link LAYOUT_RUN} as storage keeps
 * it, the row its wall stands on, and the settings handed, if any.
 *
 * @param {ScreenshotApi} api
 * @param {KeptSettings | null} settings
 * @returns {BeforeLoad<Parameters<typeof keepRun>>}
 */
export function keepingRun(api, settings) {
  const { saved, stored } = storedRun(api, LAYOUT_RUN);
  if (!saved.start) throw new Error("The run kept has no round played.");
  return {
    run: keepRun,
    args: [SAVED_GAME_KEY, stored, saved.start.lowestRow, settings],
  };
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
 * Checks the layout at each shape and turn as a level waits for its first
 * shot, and beside them again over a run kept, taken up paused, each with
 * Release with a button off and on, and returns what is wrong, each pass
 * but the first's shapes named for it. It keeps the run first, so a run
 * that can't be kept fails the check before Chrome opens a page.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @returns {Promise<LayoutProblem[]>}
 */
async function checkBoth(devtools, url) {
  const api = await loadScreenshotApi();
  const keeping = keepingRun(api, null);
  const keepingWithRelease = keepingRun(api, RELEASE_BY_BUTTON);
  /** @type {LayoutCheck} */
  const check = {
    url,
    ready: PHASER_CANVAS_READY,
    board: FIELD,
    inspect: inspectField,
  };
  const [waiting, takenUp, waitingWithRelease, takenUpWithRelease] =
    await whenAllSettle([
      checkPhaserLayout(devtools, {
        ...check,
        before: { run: keepingNone, args: [null] },
      }),
      checkPhaserLayout(devtools, { ...check, before: keeping }),
      checkPhaserLayout(devtools, {
        ...check,
        before: { run: keepingNone, args: [RELEASE_BY_BUTTON] },
      }),
      checkPhaserLayout(devtools, { ...check, before: keepingWithRelease }),
    ]);
  return [
    ...waiting,
    ...namedFor(takenUp, "a run taken up"),
    ...namedFor(waitingWithRelease, "Release with a button on"),
    ...namedFor(takenUpWithRelease, "a run taken up, Release with a button on"),
  ];
}

/**
 * What checks the layout: the field and its panels' places at each shape
 * and turn, as a level waits for its first shot and over a run taken up,
 * with Release with a button off and on.
 *
 * @type {LayoutScript}
 */
const LAYOUT_SCRIPT = {
  game: "Rickashay",
  root: ROOT,
  check: checkBoth,
  holds: `at each shape and turn, as a level waits for its first shot and over a run taken up, with Release with a button off and on: ${PHASER_CHECKED_AT}`,
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
