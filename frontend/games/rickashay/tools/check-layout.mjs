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
 * It prints what is wrong and fails, or says the layout holds.
 */
import { join } from "node:path";
import {
  PHASER_CANVAS_READY,
  PHASER_CHECKED_AT,
  checkPhaserLayout,
  readRect,
  runLayoutScript,
} from "@fz/dev/layout";

/** @import { BoardBox, LayoutScript, LayoutScriptOptions, PhaserBoard } from "@fz/dev/layout" */

const ROOT = join(import.meta.dirname, "..");

/**
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser, from
 * the lintel's top to the floor's band's bottom, its card Ready's as a
 * level waits for its first shot; and the panels' places beside it, laid
 * both, wherever the room spares them, or neither.
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
 * row a level opens on as it waits for its first shot. It runs in the page,
 * so it uses nothing from this module, and reads the board's rectangles
 * with `readRect()`, which is sent with it.
 *
 * @param {BoardBox} [field]
 * @returns {string[]}
 */
export function inspectField(field) {
  /** @type {string[]} */
  const problems = [];
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
  // The board's own inspection says where these are missing.
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

  const outcome = board.getAttribute("data-outcome");
  const wall = board.getAttribute("data-wall");
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
 * What checks the layout: the field and its panels' places at each shape
 * and turn, as a level waits for its first shot.
 *
 * @type {LayoutScript}
 */
const LAYOUT_SCRIPT = {
  game: "Rickashay",
  root: ROOT,
  check: (devtools, url) =>
    checkPhaserLayout(devtools, {
      url,
      ready: PHASER_CANVAS_READY,
      board: FIELD,
      inspect: inspectField,
    }),
  holds: `at each shape and turn, as a level waits for its first shot: ${PHASER_CHECKED_AT}`,
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
