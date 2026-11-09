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
 * (`--finger-room`), past the canvas's inset (`--fz-canvas-inset-bottom`).
 * It prints what is wrong and fails, or says the layout holds.
 */
import { join } from "node:path";
import {
  PHASER_CANVAS_READY,
  PHASER_CHECKED_AT,
  checkPhaserLayout,
  runLayoutScript,
} from "@fz/dev/layout";

/** @import { BoardBox, PhaserBoard } from "@fz/dev/layout" */

/**
 * The field, as `@fz/dev/layout` inspects a board drawn with Phaser; its card
 * is Ready's, as the ball waits on the paddle.
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
};

/**
 * Returns what is wrong with the field's unit and the room under it, given
 * where the field lies. It runs in the page, so it uses nothing from this
 * module.
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
  return problems;
}

process.exitCode = await runLayoutScript({
  game: "Brick Breaker",
  root: join(import.meta.dirname, ".."),
  check: (devtools, url) =>
    checkPhaserLayout(devtools, {
      url,
      ready: PHASER_CANVAS_READY,
      board: FIELD,
      inspect: inspectField,
    }),
  holds: `at each shape and turn: ${PHASER_CHECKED_AT}`,
});
