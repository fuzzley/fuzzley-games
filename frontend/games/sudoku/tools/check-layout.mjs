#!/usr/bin/env node
/**
 * Checks Sudoku's layout in a headless Chrome, which jsdom can't: the build
 * is served as `yarn preview` serves it and opened at each shape a game is
 * laid out for (`@fz/dev/layout`).
 *
 *   yarn build
 *   yarn check:layout
 *
 * At each shape the page must report no error and not scroll, the board
 * must be square with its 81 squares the same size, and the board and the
 * pad must lie in the window. It prints what is wrong and fails, or says
 * the layout holds.
 */
import { join } from "node:path";
import { SHAPES, checkLayout, runLayoutScript } from "@fz/dev/layout";

/**
 * Returns what is wrong with the board and the pad: the board must be
 * square, its squares all one size, and both must lie in the window. It runs
 * in the page, so it uses nothing from this module.
 *
 * @returns {string[]}
 */
function inspectBoard() {
  /** @type {string[]} */
  const problems = [];
  /**
   * Returns whether two lengths are the same, to within a pixel's rounding.
   *
   * @param {number} a
   * @param {number} b
   * @returns {boolean}
   */
  const same = (a, b) => Math.abs(a - b) <= 1;
  const board = document.querySelector('[role="grid"]');
  const pad = document.querySelector("app-pad");
  if (!board || !pad) return ["The board or the pad is missing."];
  const side = board.getBoundingClientRect();
  if (!same(side.width, side.height)) {
    problems.push(
      `The board is ${side.width}px by ${side.height}px, not square.`,
    );
  }
  const squares = [...board.querySelectorAll('[role="gridcell"]')].map(
    (square) => square.getBoundingClientRect(),
  );
  const [first] = squares;
  if (squares.length !== 81 || !first) {
    problems.push(`The board has ${squares.length} squares, not 81.`);
  } else if (
    squares.some(
      ({ width, height }) =>
        !same(width, first.width) || !same(height, first.height),
    )
  ) {
    problems.push("The board's squares aren't all one size.");
  }
  for (const [name, part] of /** @type {const} */ ([
    ["board", side],
    ["pad", pad.getBoundingClientRect()],
  ])) {
    if (
      part.top < 0 ||
      part.left < 0 ||
      part.bottom > innerHeight + 1 ||
      part.right > innerWidth + 1
    ) {
      problems.push(`The ${name} runs out of the window.`);
    }
  }
  return problems;
}

process.exitCode = await runLayoutScript({
  game: "Sudoku",
  root: join(import.meta.dirname, ".."),
  check: (devtools, url) =>
    checkLayout(devtools, {
      url,
      ready: '[role="gridcell"]',
      inspect: inspectBoard,
    }),
  holds: `at each shape: ${SHAPES.map((shape) => shape.name).join(", ")}`,
});
