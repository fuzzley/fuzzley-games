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
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { preview } from "vite";
import { withChrome } from "@fz/dev/chrome";
import { SHAPES, checkLayout } from "@fz/dev/layout";

const USAGE = `Usage: yarn check:layout [options]

Checks the build's layout in headless Chrome at each shape a game takes.

  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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

/**
 * Returns the options the command line sets.
 *
 * @returns {{chrome?: string} | undefined} Nothing when it asks only for
 *   help.
 */
function parseCommandLine() {
  const { values } = parseArgs({
    options: {
      chrome: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return undefined;
  }
  return { chrome: values.chrome };
}

async function main() {
  const options = parseCommandLine();
  if (!options) return;
  await access(join(ROOT, "dist/index.html")).catch(() => {
    throw new Error("Found no build to check; run yarn build first.");
  });

  const server = await preview({
    root: ROOT,
    logLevel: "silent",
    preview: { port: 0, strictPort: true },
  });
  try {
    const url = server.resolvedUrls?.local[0];
    if (!url) throw new Error("The preview server gave no address.");
    const problems = await withChrome(
      { chrome: options.chrome, name: "sudoku" },
      (devtools) =>
        checkLayout(devtools, {
          url,
          ready: '[role="gridcell"]',
          inspect: inspectBoard,
        }),
    );
    for (const { shape, problem } of problems) {
      console.error(`${shape}: ${problem}`);
    }
    if (problems.length > 0) {
      process.exitCode = 1;
      return;
    }
    const shapes = SHAPES.map((shape) => shape.name).join(", ");
    console.log(`Sudoku's layout holds at each shape: ${shapes}.`);
  } finally {
    await server.close();
  }
}

await main();
