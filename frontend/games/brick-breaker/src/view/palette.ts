import { colorNumber, mixColors } from "@fz/phaser/color";
import type { BallKindId } from "../rules/catalog/balls";
import type { CapsuleTone } from "../rules/catalog/capsules";
import { DARK_INKS, LIGHT_INKS } from "./inks";

/** Whether a palette is light or dark, as `@fz/style`'s themes say. */
export type PaletteMode = "light" | "dark";

/** The palette roles the field is drawn in, as the page sets them, in hex. */
export interface PaletteRoles {
  readonly panel: string;
  readonly text: string;
  readonly accent: string;
  readonly danger: string;
  readonly warning: string;
}

/** The field's colors, as the numbers Phaser takes. */
export interface BricksPalette {
  /** The field under everything, and the outline around every ball. */
  readonly field: number;
  /** The wall around the field: text at 20%. */
  readonly wall: number;
  readonly paddle: number;
  readonly balls: Readonly<Record<BallKindId, number>>;
  readonly capsules: Readonly<Record<CapsuleTone, number>>;
  /** A steel brick: text at 55%. */
  readonly steel: number;
  readonly blast: number;
  readonly gift: number;
  /** The colors a brick takes by its tint, 0 to 7: the inks of the palette's mode. */
  readonly tints: readonly number[];
}

/** How much of the text the wall takes. */
export const WALL_WASH = 0.2;

/** How much of the text a steel brick takes, enough for 3:1 against the field in every palette. */
export const STEEL_WASH = 0.55;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function bricksPalette(
  roles: PaletteRoles,
  mode: PaletteMode,
): BricksPalette {
  const panel = colorNumber(roles.panel);
  const text = colorNumber(roles.text);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  return {
    field: panel,
    wall: mixColors(text, panel, WALL_WASH),
    paddle: accent,
    balls: { normal: text, fire: colorNumber(roles.warning), blast: danger },
    capsules: { good: accent, bad: danger },
    steel: mixColors(text, panel, STEEL_WASH),
    blast: danger,
    gift: accent,
    tints: mode === "light" ? LIGHT_INKS : DARK_INKS,
  };
}
