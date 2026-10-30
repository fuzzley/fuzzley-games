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
 * At each shape the page must report no error and not scroll; the canvas
 * must be drawn, at its size in CSS pixels times the pixel ratio; the field
 * must keep its shape, 26 units by 30, a unit at least 10 CSS px (9 in a
 * window under 360 CSS px tall), in the window, where the placeholder drew
 * it, to the pixel, and inside the focus ring; and its card must lie on it.
 * It prints what is wrong and fails, or says the layout holds.
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

/** The smallest phone, held upright. */
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
 * Returns what is wrong with the field, its canvas, its placeholder, its
 * focus ring and its card. It runs in the page, so it uses nothing from this
 * module.
 *
 * @returns {string[]}
 */
function inspectField() {
  /** @type {string[]} */
  const problems = [];
  const across = 26;
  const down = 30;
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

  const laidOut = (board.getAttribute("data-field") ?? "")
    .split(" ")
    .map(Number);
  const [x = NaN, y = NaN, width = NaN, height = NaN] = laidOut;
  if (laidOut.length !== 4 || laidOut.some((n) => !Number.isFinite(n))) {
    return [
      ...problems,
      "The board doesn't say where the field lies (data-field).",
    ];
  }
  const left = box.left + x;
  const top = box.top + y;
  const unit = width / across;
  if (Math.abs(height - unit * down) > 0.5) {
    problems.push(
      `The field is ${width} by ${height} CSS px, not ${across} units by ${down}.`,
    );
  }
  // A phone on its side under 360 CSS px tall can't give the field's 30
  // units of height 10 px each, after the room around it: 568 × 320 gives 9.5.
  const smallest = innerHeight < 360 ? 9 : 10;
  if (unit < smallest) {
    problems.push(`The field's unit is ${unit} CSS px, under ${smallest}.`);
  }
  if (
    left < 0 ||
    top < 0 ||
    left + width > innerWidth + 1 ||
    top + height > innerHeight + 1
  ) {
    problems.push("The field runs out of the window.");
  }

  // The placeholder's field, inside its wall, where the scene's lies, but
  // for the half pixel the scene may round to at the pixel ratio.
  const drawn = document.querySelector("app-board .placeholder .field");
  if (drawn) {
    const wall = parseFloat(getComputedStyle(drawn).borderLeftWidth);
    const rect = drawn.getBoundingClientRect();
    const off = Math.max(
      Math.abs(rect.left + wall - left),
      Math.abs(rect.top + wall - top),
      Math.abs(rect.width - 2 * wall - width),
      Math.abs(rect.height - 2 * wall - height),
    );
    if (off > 1) {
      problems.push(
        `The placeholder drew the field ${off.toFixed(1)} CSS px from where the scene did.`,
      );
    }
  } else {
    problems.push("The placeholder's field is missing.");
  }

  // The Ready card, as the ball waits on the paddle.
  const card = document
    .querySelector("app-board .card")
    ?.getBoundingClientRect();
  if (!card) {
    problems.push("The card over the field is missing.");
  } else if (
    card.left < left - 1 ||
    card.top < top - 1 ||
    card.right > left + width + 1 ||
    card.bottom > top + height + 1
  ) {
    problems.push("The card over the field runs off it.");
  }

  const ring = document
    .querySelector("app-board .ring")
    ?.getBoundingClientRect();
  if (
    !ring ||
    Math.max(
      Math.abs(ring.left - left),
      Math.abs(ring.top - top),
      Math.abs(ring.width - width),
      Math.abs(ring.height - height),
    ) > 0.5
  ) {
    problems.push("The focus ring doesn't lie around the field.");
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
      { chrome: options.chrome, name: "brick-breaker" },
      async (devtools) => {
        const ready = 'fz-phaser-canvas[data-state="ready"]';
        const shaped = await checkLayout(
          devtools,
          { url, ready, inspect: inspectField },
          SHAPES_2X,
        );
        const turned = await checkTurns(
          devtools,
          { url, ready, inspect: inspectField },
          TURNS_2X,
        );
        return [...shaped, ...turned];
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
      `Brick Breaker's layout holds at each shape and turn: ${shapes}.`,
    );
  } finally {
    await server.close();
  }
}

await main();
