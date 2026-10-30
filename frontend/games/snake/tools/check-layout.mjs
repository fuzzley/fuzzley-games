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

process.exitCode = await runLayoutScript({
  game: "Snake",
  root: join(import.meta.dirname, ".."),
  check: async (devtools, url) => {
    const bare = { url, ready: READY, inspect: inspectBoard };
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
