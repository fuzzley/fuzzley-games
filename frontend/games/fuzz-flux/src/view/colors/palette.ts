// The board's colors from the palette's roles, as the numbers Phaser takes.
// The board lies on the page, each square a well of the panel, a shade off
// it, dust a wash of the text over the square; and the frizzball wears the
// text, its eyes the page's color, so it turns with the palette as the
// house's own fuzzball does. The pieces' inks, the same in every palette of
// a mode, are inks.ts's, which the board's palette takes in.

import { colorNumber, mixColors } from "@fz/phaser/color";
import type { ColorMode, PaletteRole } from "@fz/style/themes";
import type { Dusty } from "../art/frame_names";
import { type PieceInks, pieceInks } from "./inks";

/** Describes the palette roles the board is drawn in, as the page sets them, in hex. */
export interface BoardRoles {
  readonly page: string;
  readonly panel: string;
  readonly text: string;
  readonly muted: string;
  readonly warning: string;
}

/** The page's role for each of the colors the board is drawn in, which the shell reads the roles by. */
export const BOARD_ROLES: Readonly<Record<keyof BoardRoles, PaletteRole>> = {
  page: "page",
  panel: "panel",
  text: "text",
  muted: "muted",
  warning: "warning",
};

/** Describes the frizzball's colors. */
export interface FrizzballColors {
  /** Its body and its rays. */
  readonly body: number;
  /** Its eyes: the page's color, white on a light palette, where they hold pupils, and dark on a dark one. */
  readonly eyes: number;
  /** The pupils its eyes hold where they are white, as on a light palette, or none where they are dark, as a fuzzball's are. */
  readonly pupils: number | undefined;
  /** The glints on its pupils, or on its eyes where they hold none. */
  readonly glint: number;
}

/** Describes the board's colors, as the numbers Phaser takes: those from the palette's roles, and its pieces' inks. */
export interface BoardPalette extends PieceInks {
  /** The page the board lies on, which shows round its squares and through its gaps. */
  readonly page: number;
  /** A square's well, a shade off the page: the panel. */
  readonly square: number;
  /**
   * A square's dust, by its layers: the text washed over the square, as
   * `DUST_WASHES` says, so each layer stands a shade further off the page,
   * paler on a dark palette and grayer on a light one, as the design's art
   * draws it.
   */
  readonly dust: Readonly<Record<Dusty, number>>;
  /** The specks that tell a dusty square from a clean one, more and larger on thick dust: the muted text. */
  readonly specks: number;
  /** The frizzball, a dark slate on a light palette and pale on a dark one, as the design's art draws it. */
  readonly frizzball: FrizzballColors;
  /** The sparks of static, and the frizzball's bolts: the warning color. */
  readonly spark: number;
  /** What lies over the pieces to be read, the hint's hand and a wave's mark: the text, each with a rim of the page's color. */
  readonly marks: number;
  /**
   * The effects' white, the light a ring, a streak and a flash give off
   * and a fuzzball's glow: the text, which shows on the board in every
   * palette, as the sketch draws its white in the frizzball's color.
   */
  readonly flare: number;
  /**
   * The trim of the sleepyhead's nightcap, the band along its brim and the
   * pompom at its tip: the text, white on a dark palette and dark on a
   * light one, as the design's art draws it.
   */
  readonly nightcapTrim: number;
  /** A line of wind a gust sends across the board: the muted text, as the sketch draws it. */
  readonly gust: number;
}

/**
 * How much of the text each layer of dust takes over the square, in each
 * mode: little in a light palette, whose kinds' inks keep 3:1 against thick
 * dust with little to spare, and more in a dark one.
 */
const DUST_WASHES: Readonly<
  Record<ColorMode, Readonly<Record<Dusty, number>>>
> = {
  light: { 1: 0.04, 2: 0.08 },
  dark: { 1: 0.07, 2: 0.12 },
};

/** How much of the muted text a light palette's frizzball takes in over the text, which alone would draw it near black. */
const FRIZZBALL_GRAYING = 0.5;

/**
 * Returns the frizzball's colors in a mode, from the page's color, the text
 * and the muted text, as the design's art draws it: on a light palette a
 * slate, its eyes white and holding pupils in the text, glinting white; on
 * a dark one the pale text, its eyes dark, glinting in the text.
 */
function frizzballColors(
  page: number,
  text: number,
  muted: number,
  mode: ColorMode,
): FrizzballColors {
  return mode === "light"
    ? {
        body: mixColors(muted, text, FRIZZBALL_GRAYING),
        eyes: page,
        pupils: text,
        glint: page,
      }
    : { body: text, eyes: page, pupils: undefined, glint: text };
}

/** Returns the board's colors in a palette's roles, with the washes and the inks of its mode. */
export function boardPalette(roles: BoardRoles, mode: ColorMode): BoardPalette {
  const page = colorNumber(roles.page);
  const square = colorNumber(roles.panel);
  const text = colorNumber(roles.text);
  const muted = colorNumber(roles.muted);
  const washes = DUST_WASHES[mode];
  return {
    page,
    square,
    dust: {
      1: mixColors(text, square, washes[1]),
      2: mixColors(text, square, washes[2]),
    },
    specks: muted,
    frizzball: frizzballColors(page, text, muted, mode),
    spark: colorNumber(roles.warning),
    marks: text,
    flare: text,
    nightcapTrim: text,
    gust: muted,
    ...pieceInks(mode),
  };
}
