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
 * At each shape the page must report no error and not scroll; the canvas
 * must be drawn, at its size in CSS pixels times the pixel ratio; the board
 * must be square, its squares at least 16 CSS px (12 on the smallest phone
 * with the arrows), in the window, where the placeholder drew it, to the
 * pixel, and inside the focus ring; its card must lie on it; and the arrows
 * must lie in the window, clear of the board. It prints what is wrong and
 * fails, or says the layout holds.
 */
import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { preview } from "vite";
import { withChrome } from "@fz/dev/chrome";
import { SHAPES, TURNS, checkLayout, checkTurns } from "@fz/dev/layout";

const USAGE = `Usage: yarn check:layout [options]

Checks the build's layout in headless Chrome at each shape a game takes.

  --chrome <path>  The Chrome to run (default: $CHROME_PATH, or the usual
                   install location)
  -h, --help       Show this message`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The smallest phone, held upright, where the arrows under the board leave
 * it squares of only 12 CSS px or so, whatever their size.
 */
const SMALLEST = {
  name: "smallest phone portrait",
  viewport: { width: 320, height: 480, deviceScaleFactor: 1 },
};

/** The shapes, at twice the pixels, so the canvas's backing size is tested. */
const SHAPES_2X = [...SHAPES, SMALLEST].map((shape) => ({
  ...shape,
  viewport: { ...shape.viewport, deviceScaleFactor: 2 },
}));

/** The turns, at twice the pixels. */
const TURNS_2X = TURNS.map((turn) => ({
  ...turn,
  from: { ...turn.from, deviceScaleFactor: 2 },
  to: { ...turn.to, deviceScaleFactor: 2 },
}));

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
 * Returns what is wrong with the board, its canvas and the arrows. It runs
 * in the page, so it uses nothing from this module.
 *
 * @returns {string[]}
 */
function inspectBoard() {
  /** @type {string[]} */
  const problems = [];
  const squares = 17;
  const host = document.querySelector("fz-phaser-canvas");
  const canvas = document.querySelector("fz-phaser-canvas canvas");
  const board = document.querySelector("app-board");
  if (!host || !(canvas instanceof HTMLCanvasElement) || !board) {
    return ["The board or its canvas is missing."];
  }
  const state = host.getAttribute("data-state");
  if (state !== "ready") problems.push(`The canvas is ${state}, not ready.`);

  const box = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, 3);
  if (
    Math.abs(canvas.width - box.width * ratio) > 1 ||
    Math.abs(canvas.height - box.height * ratio) > 1
  ) {
    problems.push(
      `The canvas draws ${canvas.width} × ${canvas.height} pixels for ${box.width} × ${box.height} CSS px at ${ratio}×.`,
    );
  }

  const laidOut = (board.getAttribute("data-board") ?? "")
    .split(" ")
    .map(Number);
  const [x = NaN, y = NaN, width = NaN, height = NaN] = laidOut;
  if (laidOut.length !== 4 || laidOut.some((n) => !Number.isFinite(n))) {
    return [...problems, "The board doesn't say where it lies (data-board)."];
  }
  const left = box.left + x;
  const top = box.top + y;
  const square = width / squares;
  if (Math.abs(width - height) > 0.5) {
    problems.push(`The board is ${width} by ${height} CSS px, not square.`);
  }
  // Under 360 CSS px wide, the arrows under the board leave it no more.
  const smallest =
    innerWidth < 360 && document.querySelector(".arrow") ? 12 : 16;
  if (square < smallest) {
    problems.push(
      `The board's squares are ${square} CSS px, under ${smallest}.`,
    );
  }
  if (
    left < 0 ||
    top < 0 ||
    left + width > innerWidth + 1 ||
    top + height > innerHeight + 1
  ) {
    problems.push("The board runs out of the window.");
  }

  // The placeholder's squares, inside its wall, where the scene's lie, but
  // for the half pixel the scene may round to at the pixel ratio.
  const drawn = document.querySelector(".squares");
  if (drawn) {
    const wall = parseFloat(getComputedStyle(drawn).borderLeftWidth);
    const rect = drawn.getBoundingClientRect();
    const off = Math.max(
      Math.abs(rect.left + wall - left),
      Math.abs(rect.top + wall - top),
      Math.abs(rect.width - 2 * wall - width),
    );
    if (off > 1) {
      problems.push(
        `The placeholder drew the board ${off.toFixed(1)} CSS px from where the scene did.`,
      );
    }
  }

  const card = document.querySelector(".card")?.getBoundingClientRect();
  if (
    card &&
    (card.left < left - 1 ||
      card.top < top - 1 ||
      card.right > left + width + 1 ||
      card.bottom > top + height + 1)
  ) {
    problems.push("The card over the board runs off it.");
  }

  const ring = document.querySelector(".ring")?.getBoundingClientRect();
  if (
    !ring ||
    Math.max(
      Math.abs(ring.left - left),
      Math.abs(ring.top - top),
      Math.abs(ring.width - width),
    ) > 0.5
  ) {
    problems.push("The focus ring doesn't lie around the board.");
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
      rect.right > left &&
      rect.left < left + width &&
      rect.bottom > top &&
      rect.top < top + height
    ) {
      problems.push(`The ${name} arrow lies over the board.`);
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
      { chrome: options.chrome, name: "snake" },
      async (devtools) => {
        const ready = 'fz-phaser-canvas[data-state="ready"]';
        const plain = await checkLayout(
          devtools,
          { url, ready, inspect: inspectBoard },
          SHAPES_2X,
        );
        const withArrows = await checkLayout(
          devtools,
          { url, ready, inspect: inspectBoard, before: wantArrows },
          SHAPES_2X,
        );
        const turned = await checkTurns(
          devtools,
          { url, ready, inspect: inspectBoard },
          TURNS_2X,
        );
        const turnedWithArrows = await checkTurns(
          devtools,
          { url, ready, inspect: inspectBoard, before: wantArrows },
          TURNS_2X,
        );
        return [
          ...plain,
          ...turned,
          ...[...withArrows, ...turnedWithArrows].map((found) => ({
            ...found,
            shape: `${found.shape}, with the arrows`,
          })),
        ];
      },
    );
    for (const { shape, problem } of problems) {
      console.error(`${shape}: ${problem}`);
    }
    if (problems.length > 0) {
      process.exitCode = 1;
      return;
    }
    const shapes = [...SHAPES, SMALLEST, ...TURNS]
      .map((shape) => shape.name)
      .join(", ");
    console.log(
      `Snake's layout holds at each shape and turn, with and without the arrows: ${shapes}.`,
    );
  } finally {
    await server.close();
  }
}

await main();
