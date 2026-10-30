#!/usr/bin/env node
/**
 * Checks Snake's layout in a headless Chrome, which jsdom can't: the build
 * is served as `yarn preview` serves it and opened at each shape a game is
 * laid out for (`@fz/dev/layout`), and at the smallest phone, at twice the
 * pixels, and turned from upright to its side and back, once as a mouse
 * finds it and once with the on-screen arrows.
 *
 *   yarn build
 *   yarn check:layout
 *
 * At each shape the page must report no error and not scroll; the board, as
 * `@fz/dev/layout` inspects one drawn with Phaser, must be drawn on its
 * canvas at the board's pixel ratio, square, in the window, where the
 * placeholder drew it, to the pixel, and inside the focus ring, its card on
 * it; its squares must be at least 16 CSS px (12 on the smallest phone with
 * the arrows); and the arrows must lie in the window, clear of the board. It
 * prints what is wrong and fails, or says the layout holds.
 */
import { join } from "node:path";
import {
  SHAPES,
  SMALLEST,
  TURNS,
  checkLayout,
  checkTurns,
  runLayoutScript,
  shapesAt,
  turnsAt,
} from "@fz/dev/layout";

/** @import { BoardBox, PhaserBoard } from "@fz/dev/layout" */

/**
 * The shapes and the smallest phone, at twice the pixels, so the canvas's
 * backing size is tested.
 */
const SHAPES_2X = shapesAt(2, [...SHAPES, SMALLEST]);

/** The turns, at twice the pixels. */
const TURNS_2X = turnsAt(2, TURNS);

/** The selector the page matches once the scene has drawn. */
const READY = 'fz-phaser-canvas[data-state="ready"]';

/** The names of the shapes and turns the layout is checked at. */
const CHECKED = [...SHAPES, SMALLEST, ...TURNS]
  .map((shape) => shape.name)
  .join(", ");

/**
 * Stores settings that show the on-screen arrows with a mouse too. It runs
 * in the page before its scripts, so it uses nothing from this module.
 */
function wantArrows() {
  localStorage.setItem(
    "snake-settings",
    JSON.stringify({
      version: 1,
      speed: "normal",
      movement: "glide",
      arrows: "always",
      sound: true,
    }),
  );
}

/**
 * The board, as `@fz/dev/layout` inspects a board drawn with Phaser.
 *
 * @type {PhaserBoard}
 */
const BOARD = {
  name: "board",
  element: "app-board",
  drawnAt: "data-board",
  across: 17,
  down: 17,
  placeholder: ".squares",
  ring: ".ring",
  card: ".card",
};

/**
 * Returns what is wrong with the board's squares and the arrows, given where
 * the board lies. It runs in the page, so it uses nothing from this module.
 *
 * @param {BoardBox} [box]
 * @returns {string[]}
 */
function inspectSquaresAndArrows(box) {
  /** @type {string[]} */
  const problems = [];
  // Under 360 CSS px wide, the arrows under the board leave it no more.
  const smallest =
    innerWidth < 360 && document.querySelector(".arrow") ? 12 : 16;
  if (box && box.unit < smallest) {
    problems.push(
      `The board's squares are ${box.unit} CSS px, under ${smallest}.`,
    );
  }
  for (const arrow of document.querySelectorAll(".arrow")) {
    const rect = arrow.getBoundingClientRect();
    const name = arrow.getAttribute("aria-label");
    if (
      rect.left < 0 ||
      rect.top < 0 ||
      rect.right > innerWidth + 1 ||
      rect.bottom > innerHeight + 1
    ) {
      problems.push(`The ${name} arrow runs out of the window.`);
    }
    if (
      box &&
      rect.right > box.left &&
      rect.left < box.left + box.width &&
      rect.bottom > box.top &&
      rect.top < box.top + box.height
    ) {
      problems.push(`The ${name} arrow lies over the board.`);
    }
  }
  return problems;
}

process.exitCode = await runLayoutScript({
  game: "Snake",
  root: join(import.meta.dirname, ".."),
  check: async (devtools, url) => {
    const bare = {
      url,
      ready: READY,
      board: BOARD,
      inspect: inspectSquaresAndArrows,
    };
    const arrowed = { ...bare, before: wantArrows };
    const withoutArrows = [
      ...(await checkLayout(devtools, bare, SHAPES_2X)),
      ...(await checkTurns(devtools, bare, TURNS_2X)),
    ];
    const withArrows = [
      ...(await checkLayout(devtools, arrowed, SHAPES_2X)),
      ...(await checkTurns(devtools, arrowed, TURNS_2X)),
    ];
    return [
      ...withoutArrows,
      ...withArrows.map((found) => ({
        ...found,
        shape: `${found.shape}, with the arrows`,
      })),
    ];
  },
  holds: `at each shape and turn, with and without the arrows: ${CHECKED}`,
});
