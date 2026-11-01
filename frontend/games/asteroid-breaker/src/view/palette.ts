import { colorNumber, mixColors } from "@fz/phaser/color";
import { FUZZBALL } from "@fz/style/fuzzball";
import type { RockKindId } from "../rules/catalog/rocks";
import type { Pilot } from "../rules/pilots";
import {
  DARK_PILOT_INKS,
  DARK_ROCK_INKS,
  LIGHT_PILOT_INKS,
  LIGHT_ROCK_INKS,
} from "./inks";

/** Whether a palette is light or dark, as `@fz/style`'s themes say. */
export type PaletteMode = "light" | "dark";

/** The palette roles the field is drawn in, as the page sets them, in hex. */
export interface PaletteRoles {
  readonly field: string;
  readonly fieldLine: string;
  readonly fieldText: string;
  readonly fieldMuted: string;
  readonly accent: string;
  readonly onAccent: string;
  readonly danger: string;
  readonly warning: string;
}

/** The field's colors, as the numbers Phaser takes. */
export interface BeltPalette {
  /** The field under everything: the palette's field. */
  readonly field: number;
  /** The frame around the field, and the deck's rings at rest: the field's line. */
  readonly line: number;
  /** The specks on the field: its muted text at {@link SPECK_STRENGTH}. */
  readonly speck: number;
  /** The deck's symbols at rest: the field's muted text. */
  readonly muted: number;
  /**
   * The outline around every rock, the ship, a pickup and the comet, so
   * overlapping things read apart: the field's color, which each keeps 3:1
   * from.
   */
  readonly outline: number;
  /**
   * The marks a rock's kind and state are told apart by: the field's color,
   * which every rock's body keeps 3:1 from. A volatile rock's glowing core
   * is no mark, only its look, and its cracks stay on its body, as the core
   * of a light palette is too light for them.
   */
  readonly mark: number;
  /** The ship, a pickup, the stick's knob and a button pressed: the accent. */
  readonly accent: number;
  /** A pickup's symbol and a pressed button's: the color the palette sets on its accent. */
  readonly onAccent: number;
  /** The ship's flame: the warning color. */
  readonly flame: number;
  /** The shots, the clearest thing on the field: the field's text. */
  readonly shot: number;
  /** The comet and its warning: the danger color. */
  readonly comet: number;
  /** A stray's bubble: the field's text at {@link BUBBLE_WASH}. */
  readonly bubble: number;
  /** A stray's bubble's rim, which tells it from a rock: the field's text at {@link BUBBLE_RIM}. */
  readonly rim: number;
  /** The glint on a stray's bubble. */
  readonly glint: number;
  /** The body of each kind of rock: the inks of the palette's mode. */
  readonly rocks: Readonly<Record<RockKindId, number>>;
  /** The glow at a volatile rock's middle. */
  readonly core: number;
  /** Each pilot's ink, by its color: the inks of the palette's mode. */
  readonly pilots: readonly number[];
  /** A pilot's eyes, as the fuzzball has them. */
  readonly eyes: number;
}

/** How much of the field's muted text a speck takes over the field. */
export const SPECK_STRENGTH = 1 / 3;

/** How much of the field's text a stray's bubble takes over the field. */
export const BUBBLE_WASH = 0.06;

/**
 * How much of the field's text a stray's bubble's rim takes over the field,
 * the least that keeps it 3:1 against the field in every palette.
 */
export const BUBBLE_RIM = 0.5;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function beltPalette(
  roles: PaletteRoles,
  mode: PaletteMode,
): BeltPalette {
  const field = colorNumber(roles.field);
  const fieldText = colorNumber(roles.fieldText);
  const fieldMuted = colorNumber(roles.fieldMuted);
  const rocks = mode === "light" ? LIGHT_ROCK_INKS : DARK_ROCK_INKS;
  return {
    field,
    line: colorNumber(roles.fieldLine),
    speck: mixColors(fieldMuted, field, SPECK_STRENGTH),
    muted: fieldMuted,
    outline: field,
    mark: field,
    accent: colorNumber(roles.accent),
    onAccent: colorNumber(roles.onAccent),
    flame: colorNumber(roles.warning),
    shot: fieldText,
    comet: colorNumber(roles.danger),
    bubble: mixColors(fieldText, field, BUBBLE_WASH),
    rim: mixColors(fieldText, field, BUBBLE_RIM),
    glint: 0xffffff,
    rocks: rocks.kinds,
    core: rocks.core,
    pilots: pilotInks(mode).map(colorNumber),
    eyes: colorNumber(FUZZBALL.ink),
  };
}

/**
 * Returns a pilot's ink in a palette's mode, by its color, in CSS hex, as
 * the shell's bar and cards draw it.
 *
 * @throws {RangeError} for a color no pilot has.
 */
export function pilotInk(pilot: Pilot, mode: PaletteMode): string {
  const ink = pilotInks(mode)[pilot];
  if (ink === undefined) {
    throw new RangeError(`No pilot has color ${String(pilot)}`);
  }
  return ink;
}

/** Returns the pilots' inks of a palette's mode, by their color. */
function pilotInks(mode: PaletteMode): readonly string[] {
  return mode === "light" ? LIGHT_PILOT_INKS : DARK_PILOT_INKS;
}
