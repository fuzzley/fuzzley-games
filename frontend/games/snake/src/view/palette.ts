import { clamp } from "@fz/core/math";
import { colorNumber, mixColors } from "@fz/phaser/color";

/** The palette roles the board is drawn in, as the page sets them, in hex. */
export interface PaletteRoles {
  readonly panel: string;
  readonly text: string;
  readonly accent: string;
  readonly danger: string;
}

/** The board's colors, as the numbers Phaser takes. */
export interface SnakePalette {
  /** Every other square, and the board under the checker. */
  readonly board: number;
  /** The other squares: a 3% wash of text, as `--fz-wash-1` is. */
  readonly checker: number;
  /** The wall around the board: text at 20%. */
  readonly wall: number;
  readonly snake: number;
  /** The head, a little darker or lighter than the body, toward the text. */
  readonly head: number;
  readonly eye: number;
  readonly apple: number;
  readonly leaf: number;
  /** The snake once it has crashed, faded toward the board. */
  readonly faded: number;
}

/** How much of the text the checker's wash takes, as `--fz-wash-1` does. */
export const CHECKER_WASH = 0.03;

/** How much of the text the wall takes. */
export const WALL_WASH = 0.2;

/** How much of the text the head takes over the accent. */
export const HEAD_MIX = 0.25;

/** How much of the snake's color a crashed snake keeps. */
export const FADED_KEEPS = 0.35;

/** Returns the board's colors in a palette's roles. */
export function snakePalette(roles: PaletteRoles): SnakePalette {
  const panel = colorNumber(roles.panel);
  const text = colorNumber(roles.text);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  return {
    board: panel,
    checker: mixColors(text, panel, CHECKER_WASH),
    wall: mixColors(text, panel, WALL_WASH),
    snake: accent,
    head: mixColors(text, accent, HEAD_MIX),
    eye: panel,
    apple: danger,
    leaf: accent,
    faded: mixColors(accent, panel, FADED_KEEPS),
  };
}

/**
 * Returns a color part of the way from what it was to what it fades to, as
 * a crashed snake fades from `snake` to `faded`.
 */
export function fadeTo(from: number, to: number, fade: number): number {
  return mixColors(to, from, clamp(fade, 0, 1));
}
