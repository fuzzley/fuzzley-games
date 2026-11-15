import {
  FUZZBALL_INKS,
  colorNumber,
  cssHex,
  mixColors,
} from "@fz/phaser/color";
import { FUZZBALL } from "@fz/style/fuzzball";
import type { ColorMode } from "@fz/style/themes";
import { recordOf } from "@fz/core/records";
import { ROCK_KIND_IDS, type RockKindId } from "../../rules/catalog/rocks";
import type { Pilot } from "../../rules/ship/pilots";
import type { RockLight } from "../art/rocks/light";
import type { RockGlow } from "../art/rocks/rock_shape";
import { DARK_ROCK_INKS, LIGHT_ROCK_INKS } from "./inks";
import { ROCK_LIGHTS } from "./rock_light";
import { type Tones, mixTone, tonesOf } from "./tones";

/** The palette roles the field is drawn in, as the page sets them, in hex. */
export interface PaletteRoles {
  readonly page: string;
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
  /** Whether the palette is light, its field white, or dark, which the places are mixed by. */
  readonly mode: ColorMode;
  /** The page around the field, which a dark palette's places sink the field toward: the palette's page. */
  readonly page: number;
  /** The field under everything: the palette's field. */
  readonly field: number;
  /** The frame around the field, the tags' rings, and the deck's buttons' rings at rest and its stick's edge: the field's line. */
  readonly line: number;
  /** The deck's symbols at rest, and its stick, faint, where it waits and where its thrust ring is unlit: the field's muted text. */
  readonly muted: number;
  /**
   * The outline around every rock, the ship, a pickup and the comet, so
   * overlapping things read apart: the field's color, which each keeps 3:1
   * from.
   */
  readonly outline: number;
  /**
   * The marks a rock's state is told by, the cracks of the hits it holds:
   * the field's color, which every face of every rock keeps 3:1 from,
   * however the light falls on it. A kind is told by its outline and its
   * ink; its own marks, a stone's dents, a volatile rock's glowing seams
   * and the rest, are drawn in its {@link rockTones}, and are its look.
   */
  readonly mark: number;
  /** The ship, a pickup, the stick's knob, a button pressed, a lost ship's burst, and the rings of a spent Shield and a lost ship: the accent. */
  readonly accent: number;
  /** A pressed button's symbol: the color the palette sets on its accent. */
  readonly onAccent: number;
  /** The ship's flame, its exhaust, a held hit's spark and a blast's ring: the warning color. */
  readonly flame: number;
  /** The shots, the clearest thing on the field, and the points scored: the field's text. */
  readonly shot: number;
  /** The comet and its warning: the danger color. */
  readonly comet: number;
  /** A stray's bubble: the field's text at {@link BUBBLE_WASH}. */
  readonly bubble: number;
  /** A stray's bubble's rim, which tells it from a rock: the field's text at {@link BUBBLE_RIM}. */
  readonly rim: number;
  /** The stick's base and the buttons at rest, a little apart from the field: the field's text at {@link DECK_WASH}. */
  readonly deck: number;
  /** The glint on a stray's bubble, in a pilot's eyes and on a rock, and the light of a held hit's flash: white. */
  readonly glint: number;
  /** Each kind of rock's ink, its body's but a crystal's, which is its gem's, set in a stone's body: the inks of the palette's mode. */
  readonly rocks: Readonly<Record<RockKindId, number>>;
  /** The glow at a volatile rock's middle. */
  readonly core: number;
  /**
   * Each kind of rock's four tones, mixed from its ink with white and the
   * field or its text (`tonesOf()`), which its marks are drawn in: a
   * crystal's are its gem's.
   */
  readonly rockTones: Readonly<Record<RockKindId, Tones>>;
  /**
   * The light far off to the upper left the rocks are lit by, through their
   * normal maps: high in a light palette and low in a dark one
   * (`ROCK_LIGHTS`).
   */
  readonly rockLight: RockLight;
  /** Each pilot's ink, by its color: the {@link FUZZBALL_INKS} of the palette's mode. */
  readonly pilots: readonly number[];
  /** A pilot's eyes, as the fuzzball has them. */
  readonly eyes: number;
  /**
   * How strongly every halo shows, over its own strength: whole on a dark
   * field, and less on a white one, where a halo is a tint
   * ({@link HALO_STRENGTH}).
   */
  readonly haloStrength: number;
  /**
   * The color of each light a rock gives off, which its halo is tinted in:
   * a crystal's gems' in its ink, and a volatile rock's core's in its pale
   * gold, sunk toward the rock's own ink in a light palette
   * ({@link LIGHT_CORE_GLOW}).
   */
  readonly rockGlows: Readonly<Record<RockGlow["tone"], number>>;
}

/** How much of the field's text a stray's bubble takes over the field. */
export const BUBBLE_WASH = 0.06;

/**
 * How much of the field's text a stray's bubble's rim takes over the field,
 * the least that keeps it 3:1 against the field in every palette.
 */
export const BUBBLE_RIM = 0.5;

/** How much of the field's text the stick's base and the buttons at rest take over the field. */
export const DECK_WASH = 0.05;

/**
 * How strongly a halo shows in each mode, as the art kit has it: whole in a
 * dark palette, where it brightens what it lies on, and less in a light one,
 * whose white field it tints, as light added to white would show nothing.
 */
export const HALO_STRENGTH: Readonly<Record<ColorMode, number>> = {
  light: 0.62,
  dark: 1,
};

/**
 * How far a volatile rock's core's glow is mixed toward the rock's ink in a
 * light palette, as the kit mixes it, since a gold so pale would tint the
 * white field nothing.
 */
export const LIGHT_CORE_GLOW = 0.35;

/** Returns the field's colors in a palette's roles, with the inks of its mode. */
export function beltPalette(roles: PaletteRoles, mode: ColorMode): BeltPalette {
  const field = colorNumber(roles.field);
  const fieldText = colorNumber(roles.fieldText);
  const fieldMuted = colorNumber(roles.fieldMuted);
  const rocks = mode === "light" ? LIGHT_ROCK_INKS : DARK_ROCK_INKS;
  const ground = { mode, field, text: fieldText };
  return {
    mode,
    page: colorNumber(roles.page),
    field,
    line: colorNumber(roles.fieldLine),
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
    deck: mixColors(fieldText, field, DECK_WASH),
    glint: 0xffffff,
    rocks: rocks.kinds,
    core: rocks.core,
    rockTones: recordOf(ROCK_KIND_IDS, (kind) =>
      tonesOf(rocks.kinds[kind], ground),
    ),
    rockLight: ROCK_LIGHTS[mode],
    pilots: FUZZBALL_INKS[mode],
    eyes: colorNumber(FUZZBALL.ink),
    haloStrength: HALO_STRENGTH[mode],
    rockGlows: {
      gem: rocks.kinds.crystal,
      core:
        mode === "light"
          ? mixTone(rocks.core, rocks.kinds.volatile, LIGHT_CORE_GLOW)
          : rocks.core,
    },
  };
}

/**
 * Returns a pilot's ink in a palette's mode, by its color, in CSS hex, as
 * the shell's bar and cards draw it.
 *
 * @throws {RangeError} for a color no pilot has.
 */
export function pilotInk(pilot: Pilot, mode: ColorMode): string {
  const ink = FUZZBALL_INKS[mode][pilot];
  if (ink === undefined) {
    throw new RangeError(`No pilot has color ${String(pilot)}`);
  }
  return cssHex(ink);
}
