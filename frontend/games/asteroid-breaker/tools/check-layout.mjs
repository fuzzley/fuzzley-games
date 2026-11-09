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
 * its long side is the longest a field grows to.
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

/** @import { BoardBox, PhaserBoard } from "@fz/dev/layout" */

/**
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser, its
 * shape as the board says it laid it out, and its card Ready's, as a wave
 * waits for its first move; and the deck beside it.
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
 * Has the deck show on every screen, as it does on a touch screen, which a
 * headless Chrome isn't. It runs in the page, so it uses nothing from this
 * module.
 */
function showDeck() {
  localStorage.setItem(
    "asteroid-breaker-settings",
    JSON.stringify({ version: 1, deck: "always" }),
  );
}

/**
 * Returns what is wrong with the field's shape, its unit and how it fills
 * its room, given where the field lies. It runs in the page, so it uses
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

process.exitCode = await runLayoutScript({
  game: "Asteroid Breaker",
  root: join(import.meta.dirname, ".."),
  check: (devtools, url) =>
    checkPhaserLayout(devtools, {
      url,
      ready: PHASER_CANVAS_READY,
      board: FIELD,
      inspect: inspectField,
      before: showDeck,
    }),
  holds: `at each shape and turn, the deck shown: ${PHASER_CHECKED_AT}`,
});
