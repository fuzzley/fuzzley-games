import { colorNumber, mixColors } from "@fz/phaser/color";
import type { BallKindId } from "../rules/catalog/balls";
import type { BrickKindId } from "../rules/catalog/bricks";
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

/** The brick kinds drawn in a color of their own, rather than a tint. */
export type UntintedKind = Extract<BrickKindId, "steel" | "blast" | "gift">;

/** The field's colors, as the numbers Phaser takes. */
export interface BricksPalette {
  /** The field under everything: the `panel` role, as Snake's board is, not `--fz-field`. */
  readonly field: number;
  /**
   * The outline around every ball and capsule, so it stands out from any
   * brick it crosses: the field's color, which every brick keeps 3:1 from.
   */
  readonly outline: number;
  /**
   * The marks a brick's kind and state are told apart by, and a capsule's
   * symbol: the field's color, which every brick and capsule keeps 3:1 from.
   */
  readonly mark: number;
  /** The wall around the field: text at {@link WALL_WASH}. */
  readonly wall: number;
  readonly paddle: number;
  readonly balls: Readonly<Record<BallKindId, number>>;
  readonly capsules: Readonly<Record<CapsuleTone, number>>;
  /** Steel in text at {@link STEEL_WASH}, a blast brick in the danger color and a gift in the accent. */
  readonly bricks: Readonly<Record<UntintedKind, number>>;
  /** The colors a brick takes by its tint, 0 to 7: the inks of the palette's mode. */
  readonly tints: readonly number[];
  /** The deeper colors a tough brick takes by its tint: each toward the text by {@link TOUGH_DEEPEN}. */
  readonly toughTints: readonly number[];
}

/** How much of the text the wall takes. */
export const WALL_WASH = 0.2;

/** How much of the text a steel brick takes, enough for 3:1 against the field in every palette. */
export const STEEL_WASH = 0.55;

/** How much of the text a tough brick's tint takes, deepening it away from the field. */
export const TOUGH_DEEPEN = 0.25;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function bricksPalette(
  roles: PaletteRoles,
  mode: PaletteMode,
): BricksPalette {
  const panel = colorNumber(roles.panel);
  const text = colorNumber(roles.text);
  const accent = colorNumber(roles.accent);
  const danger = colorNumber(roles.danger);
  const tints = mode === "light" ? LIGHT_INKS : DARK_INKS;
  return {
    field: panel,
    outline: panel,
    mark: panel,
    wall: mixColors(text, panel, WALL_WASH),
    paddle: accent,
    balls: { normal: text, fire: colorNumber(roles.warning), blast: danger },
    capsules: { good: accent, bad: danger },
    bricks: {
      steel: mixColors(text, panel, STEEL_WASH),
      blast: danger,
      gift: accent,
    },
    tints,
    toughTints: tints.map((tint) => mixColors(text, tint, TOUGH_DEEPEN)),
  };
}
