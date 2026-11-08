// What a screenshot script runs in the page, before the game starts and once
// it has drawn, each sent as its source, so each uses nothing from outside
// itself. Its spec runs them in jsdom.

import type { Region } from "sharp";
import type { PhaserBoard } from "./board_page.ts";

/** Says how a page is set up before the game starts, as a player might have left it. */
export interface PageSetup {
  /** The palette the player chose. */
  readonly theme?: string;
  /** Entries stored as they are, by key, such as a game under way and its stats. */
  readonly stored?: Readonly<Record<string, string>>;
  /**
   * Fields merged into the JSON stored under a key, where something is, by
   * key, such as the clock of a game that saves itself as it goes, which a
   * reload takes up.
   */
  readonly merged?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Seeds `Math.random`, so a game that deals from it deals the same every time. */
  readonly seed?: number;
}

/**
 * Sets a page up as a screenshot asks, before its own scripts run, the
 * palette stored under the key the games read it from. It runs in the page.
 */
export function preparePage(setup: PageSetup, themeKey: string): void {
  if (setup.seed !== undefined) {
    // Mulberry32, as the games' own random numbers are.
    let state = setup.seed;
    Math.random = () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
    };
  }
  if (setup.theme !== undefined) localStorage.setItem(themeKey, setup.theme);
  for (const [key, value] of Object.entries(setup.stored ?? {})) {
    localStorage.setItem(key, value);
  }
  for (const [key, fields] of Object.entries(setup.merged ?? {})) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;
    const kept = JSON.parse(saved) as Record<string, unknown>;
    localStorage.setItem(key, JSON.stringify({ ...kept, ...fields }));
  }
}

/** Says what the page of a game drawn with Phaser shows, as a screenshot checks it. */
export interface PhaserPageState {
  /** What its `<fz-phaser-canvas>` says of the scene, such as "ready". */
  readonly state: string;
  /** What the board says of the game, its `data-outcome`, such as "paused". */
  readonly outcome: string;
  /** What the game bar's score reads. */
  readonly score: string;
  /** Where the scene drew the board on the page, in CSS px; none without a canvas. */
  readonly board: Region | null;
}

/** Says how a description of a page drawn with Phaser waits before it looks. */
export interface PhaserPageWait {
  /**
   * How long it waits, in ms, 800 unless given: long enough for the
   * placeholder's fade, and for what a scene pops in as it starts, such as
   * Snake's apple.
   */
  readonly waitMs?: number;
}

/**
 * Returns what the page of a game drawn with Phaser shows, once its scene
 * has drawn or failed to, and a wait has passed: the canvas's state, the
 * board's outcome, the score, and where the scene drew the board, as its
 * element's `drawnAt` attribute says. It runs in the page.
 */
export async function describePhaserPage(
  board: Pick<PhaserBoard, "element" | "drawnAt">,
  { waitMs = 800 }: PhaserPageWait = {},
): Promise<PhaserPageState> {
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const element = document.querySelector(board.element);
  const canvas = document
    .querySelector("fz-phaser-canvas canvas")
    ?.getBoundingClientRect();
  const [x = 0, y = 0, width = 0, height = 0] = (
    element?.getAttribute(board.drawnAt) ?? ""
  )
    .split(" ")
    .map(Number);
  const score = [...document.querySelectorAll("dt")].find(
    (term) => term.textContent.trim() === "Score",
  );
  return {
    state:
      document.querySelector("fz-phaser-canvas")?.getAttribute("data-state") ??
      "",
    outcome: element?.getAttribute("data-outcome") ?? "",
    score: score?.nextElementSibling?.textContent.trim() ?? "",
    board: canvas
      ? { left: canvas.left + x, top: canvas.top + y, width, height }
      : null,
  };
}
