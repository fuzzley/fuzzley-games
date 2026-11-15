import type { Point } from "@fz/phaser/shapes";
import { FIELD_SHORT_SIDE } from "../../rules/tuning";
import type { Depth } from "../field/specks";
import type { Tint } from "./colors";
import type { Face } from "./globes";

// A place's marks, in field units from the field's top left corner, as plain
// data, which `paint.ts` paints for a palette at a scale. Turns are in
// radians.

/** Says when a mark brightens for a moment, as lightning does, in seconds of the field's steps. */
export interface Flicker {
  /** How long from one flicker to the next. */
  readonly every: number;
  /** How long after the field's first step the first comes. */
  readonly after: number;
}

/** Describes a soft shape: a tint that fades to nothing from its middle out to its edge. */
export interface Soft {
  readonly kind: "soft";
  readonly at: Point;
  readonly rx: number;
  readonly ry: number;
  readonly turn: number;
  readonly tint: Tint;
  /** How much of its limit it takes at its middle, from 0 to 1. */
  readonly strength: number;
  /** Whether it is a mote, smaller than a small rock, held to the small marks' limit. */
  readonly small?: boolean;
  /** The one mode of palette it shows in; both where it gives none. */
  readonly shows?: "dark" | "light";
  readonly flicker?: Flicker;
}

/** Describes a flat face of something hard, lit from the field's upper left. */
export interface Flat {
  readonly kind: "flat";
  readonly points: readonly Point[];
  /** How brightly the light falls on it, from 0.3 to a little over 1. */
  readonly light: number;
  readonly tint: Tint;
  /** Whether it is left out where a unit is too small for fine marks. */
  readonly fine?: boolean;
  /** Whether it is a filing, smaller than a small rock, held to the small marks' limit. */
  readonly small?: boolean;
}

/** Describes a thin line. */
export interface Line {
  readonly kind: "line";
  readonly points: readonly Point[];
  readonly width: number;
  readonly tint: Tint;
  /** How much of the lines' limit it takes, from 0 to 1. */
  readonly strength: number;
  /** Whether it is left out where a unit is too small for fine marks. */
  readonly fine?: boolean;
  readonly flicker?: Flicker;
}

/** Describes a star that belongs to a landmark, and stays with it. */
export interface Speck {
  readonly kind: "speck";
  readonly at: Point;
  readonly r: number;
  /** Which of the stars' three tones it takes. */
  readonly depth: Depth;
}

/** Describes a long hair of wind, fading at both ends. */
export interface Streak {
  readonly kind: "streak";
  readonly at: Point;
  readonly length: number;
  readonly width: number;
  readonly turn: number;
  readonly tint: Tint;
  /** How much of the lines' limit it takes, from 0 to 1. */
  readonly strength: number;
}

/** Describes a billow of cloud: its middle, its radii and its turn. */
export interface Billow {
  readonly at: Point;
  readonly rx: number;
  readonly ry: number;
  readonly turn: number;
}

/**
 * Describes billows of cloud, back to front, each hiding what lies behind it,
 * soft at its edge, with a rim of its tint that tells its shape.
 */
export interface Bank {
  readonly kind: "bank";
  readonly billows: readonly Billow[];
  /** Its rims' tint. */
  readonly tint: Tint;
  /** How far a billow's rim shows past its body. */
  readonly rim: number;
}

/** Describes one mark of a place. */
export type Mark = Soft | Flat | Line | Speck | Streak | Bank;

/** Describes the strip along each edge that darkens a dark field and tints a light one. */
export interface Vignette {
  /** How far in from the edge it fades to nothing. */
  readonly depth: number;
  /** Its tint in a light palette; a dark one's sinks toward the page. */
  readonly tint: Tint;
  /** How much of the wash's limit it takes at the edge, from 0 to 1. */
  readonly strength: number;
}

/** Describes what a place lays behind the play, but for the stars, which every place shares. */
export interface Scenery {
  /** The far wash. */
  readonly wash: readonly Soft[];
  /** The one landmark, back to front. */
  readonly landmark: readonly Mark[];
  /** The sector's air, back to front. */
  readonly air: readonly Mark[];
  readonly vignette: Vignette;
  /** The tint the stars take a little of. */
  readonly starTint: Tint;
}

/** Describes the field a place is laid out on, and what it is strewn from. */
export interface Site {
  readonly width: number;
  readonly height: number;
  /** Draws from the sector alone, so its landmark is the same every run. */
  readonly random: () => number;
  /** Draws from the run's seed, for what is strewn afresh each run. */
  readonly strewn: () => number;
}

/** The field's short side, which a place's landmark is sized by, whatever the field's shape. */
export const SHORT_SIDE = FIELD_SHORT_SIDE;

/**
 * Returns a soft shape of the wash, laid by shares of the field and sized by
 * its short side, stretched the way the field is long.
 *
 * @param reach Its radius, in short sides.
 */
export function washAt(
  { width, height }: Site,
  at: Point,
  reach: number,
  tint: Tint,
  strength: number,
): Soft {
  return {
    kind: "soft",
    at: { x: at.x * width, y: at.y * height },
    rx: reach * SHORT_SIDE * Math.sqrt(width / SHORT_SIDE),
    ry: reach * SHORT_SIDE * Math.sqrt(height / SHORT_SIDE),
    turn: 0,
    tint,
    strength,
  };
}

/**
 * Returns the two round pools of the wash a landmark stands out of, sized by
 * the field's short side, whatever its shape. A landmark is cut out of the
 * wash behind it: in a dark palette its shade is a dark shape against the
 * pool, and its lit side shows against the bare field; in a light one its
 * lit side is paper left dry in the pool, and its shade shows against the
 * bare paper. So the pool lies behind its shade in the one, and behind its
 * lit side in the other.
 *
 * @param shade The middle of the pool behind its shade.
 * @param lit The middle of the pool behind its lit side.
 * @param reach The pools' radius, in short sides.
 */
export function poolsAt(
  shade: Point,
  lit: Point,
  reach: number,
  tint: Tint,
  strength: number,
): readonly Soft[] {
  const pool = {
    kind: "soft",
    rx: reach * SHORT_SIDE,
    ry: reach * SHORT_SIDE,
    turn: 0,
    tint,
    strength,
  } as const;
  return [
    { ...pool, at: shade, shows: "dark" },
    { ...pool, at: lit, shows: "light" },
  ];
}

/**
 * Returns faces of a radius of 1 as a landmark's flats, about a middle, at a
 * radius, each fine or none.
 */
export function flatsOf(
  faces: readonly Face[],
  middle: Point,
  radius: number,
  tint: Tint,
  fine = false,
): readonly Flat[] {
  return faces.map(({ points, light }) => ({
    kind: "flat",
    points: points.map(({ x, y }) => ({
      x: middle.x + x * radius,
      y: middle.y + y * radius,
    })),
    light,
    tint,
    ...(fine ? { fine } : {}),
  }));
}
