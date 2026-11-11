#!/usr/bin/env node
/**
 * Checks Brick Fuzz Pop's layout in a headless Chrome, which jsdom can't: the
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
 * inside the focus ring, its card on it; and the panels, where they show,
 * must both show, on the canvas and in the window, off the field, each
 * other and the bar, at least 172 CSS px across and down. The field's unit
 * must be at least 24 CSS px, and its unit, depth (`data-depth`), floor's
 * band (`--band`) and lintel (`--lintel`) the ones its room (`data-room`)
 * asks for; it must lie in its room, filling the room's width where it is
 * deeper than 11 rows and its height where it is 11, within a device pixel
 * a cell; the panels must show wherever 184 CSS px are spare each side of
 * it, and nowhere else; and, as the level waits for its first shot
 * (`data-outcome`), the wall must stand on the row the level opens on at
 * the field's depth (`data-wall`), after a turn of the window too, as the
 * rules begin a level with no round played again on a depth the field
 * takes.
 *
 * Then it does it all again over a run kept as the game keeps one, a round
 * played, which each page takes up paused: the wall must stand as many
 * rows from the floor as the run kept it at every shape, and through each
 * turn, the field's depth whatever it is.
 * It prints what is wrong and fails, or says the layout holds.
 */
import { join } from "node:path";
import {
  PHASER_CANVAS_READY,
  PHASER_CHECKED_AT,
  checkPhaserLayout,
  readNamedRects,
  readRect,
  runLayoutScript,
} from "@fz/dev/layout";
import {
  LAYOUT_RUN,
  SAVED_GAME_KEY,
  loadScreenshotApi,
  storedRun,
} from "./stored_run.mjs";

/** @import { DevToolsConnection } from "@fz/dev/chrome" */
/** @import { BeforeLoad, BoardBox, LayoutCheck, LayoutProblem, PhaserBoard } from "@fz/dev/layout" */
/** @import { ScreenshotApi } from "../src/testing/script_api.ts" */

const ROOT = join(import.meta.dirname, "..");

/**
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser, from
 * the lintel's top to the floor's band's bottom, its card Ready's as a
 * level waits for its first shot, or Paused's over a run taken up; and the
 * panels beside it, shown both or neither.
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
  deck: {
    drawnAt: "data-panels",
    zones: ["left", "right"],
    // `PANEL_WIDTH_CSS_PX.least`, in src/view/field/field_metrics.ts.
    least: 172,
    allOrNone: true,
  },
};

/**
 * Returns what is wrong with the field's unit and shape, where it lies in
 * its room, the panels beside it and where the wall stands, given where the
 * field lies: on the row a level opens on as it waits for its first shot,
 * or, where the page took up the run the check keeps (`LAYOUT_RUN`), on
 * the row the run kept it on. It runs in the page, so it uses nothing from
 * this module, and reads the board's rectangles with `readRect()` and
 * `readNamedRects()`, which are sent with it.
 *
 * @param {BoardBox} [field]
 * @returns {string[]}
 */
function inspectField(field) {
  /** @type {string[]} */
  const problems = [];
  const board = document.querySelector("app-board");
  if (!field || !board) return problems;
  // `COLUMNS`, `LEAST_DEPTH` and `MOST_DEPTH`, in src/rules/tuning.ts; and
  // `FLOOR_BAND`, `LINTEL`, `PANEL_GAP_CSS_PX` and
  // `PANEL_WIDTH_CSS_PX.least`, in src/view/field/field_metrics.ts.
  const columns = 9;
  const fewestRows = 11;
  const mostRows = 22;
  const band = { least: 0.6, most: 1.1 };
  const lintel = { least: 0.5, most: 1 };
  const panelSpare = 12 + 172;
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
  // The board's own inspection says where these are missing.
  if (!drawn || !Number.isFinite(ratio)) {
    return problems;
  }
  const room = readRect(board.getAttribute("data-room"));
  if (!room) {
    problems.push(
      "app-board doesn't say where the field's room lies (data-room).",
    );
    return problems;
  }

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
    problems.push("app-board gives no --band.");
  } else if (Math.abs(drawnBand - bandPx) > 0.01) {
    problems.push(
      `The floor's band is ${drawnBand} device px, where the field's room asks for ${bandPx}.`,
    );
  }
  if (!Number.isFinite(drawnLintel)) {
    problems.push("app-board gives no --lintel.");
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

  // The narrower side, where the room spares an odd number of pixels.
  const side = Math.min(
    drawn.x - room.x,
    room.x + room.width - drawn.x - drawn.width,
  );
  const panels = readNamedRects(board.getAttribute("data-panels") ?? "");
  const roomForPanels = side >= panelSpare - 0.01;
  if (roomForPanels && panels.length === 0) {
    problems.push(
      `The panels don't show, with ${side} CSS px spare each side of the field.`,
    );
  } else if (!roomForPanels && panels.length > 0) {
    problems.push(
      `The panels show with ${side} CSS px spare a side of the field, under ${panelSpare}.`,
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
  // `thirdsOf()`'s `opensOn`, in src/rules/wall/wall.ts, at the depth the
  // board laid the field out in: two jumps under the ceiling.
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
 * Says, in the page before its own scripts, that it shows a level waiting
 * for its first shot, kept by no run. It is sent as its source, so it uses
 * nothing from this module.
 */
function keepingNone() {
  Reflect.set(window, "keptWallRow", null);
}

/**
 * Keeps a run where the game keeps one, and says the row its wall stands
 * on for the inspection to read, in the page before its own scripts. It
 * is sent as its source, so it uses nothing from this module.
 *
 * @param {string} key Where the game keeps the run.
 * @param {string} stored The run as storage keeps it.
 * @param {number} row The row its wall stands on.
 */
function keepRun(key, stored, row) {
  localStorage.setItem(key, stored);
  Reflect.set(window, "keptWallRow", row);
}

/**
 * Returns what runs in the page before its own scripts: {@link keepRun},
 * handed where the game keeps a run, {@link LAYOUT_RUN} as storage keeps
 * it, and the row its wall stands on.
 *
 * @param {ScreenshotApi} api
 * @returns {BeforeLoad<Parameters<typeof keepRun>>}
 */
function keepingRun(api) {
  const { saved, stored } = storedRun(api, LAYOUT_RUN);
  if (!saved.start) throw new Error("The run kept has no round played.");
  return {
    run: keepRun,
    args: [SAVED_GAME_KEY, stored, saved.start.lowestRow],
  };
}

/**
 * Checks the layout at each shape and turn as a level waits for its first
 * shot, then again over a run kept, taken up paused, and returns what is
 * wrong, the second pass's shapes named for it. It keeps the run first, so
 * a run that can't be kept fails the check before Chrome opens a page.
 *
 * @param {DevToolsConnection} devtools
 * @param {string} url
 * @returns {Promise<LayoutProblem[]>}
 */
async function checkBoth(devtools, url) {
  const keeping = keepingRun(await loadScreenshotApi());
  /** @type {LayoutCheck} */
  const check = {
    url,
    ready: PHASER_CANVAS_READY,
    board: FIELD,
    inspect: inspectField,
  };
  const waiting = await checkPhaserLayout(devtools, {
    ...check,
    before: keepingNone,
  });
  const takenUp = await checkPhaserLayout(devtools, {
    ...check,
    before: keeping,
  });
  return [
    ...waiting,
    ...takenUp.map(({ shape, problem }) => ({
      shape: `${shape}, a run taken up`,
      problem,
    })),
  ];
}

process.exitCode = await runLayoutScript({
  game: "Brick Fuzz Pop",
  root: ROOT,
  check: checkBoth,
  holds: `at each shape and turn, as a level waits for its first shot and over a run taken up: ${PHASER_CHECKED_AT}`,
});
