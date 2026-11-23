// The color each kind of brick is drawn in, which its shards take, apart
// from the art that draws it, so the shell can show a brick's color without
// loading the art: its row's ink, steel, an ink of its own, or its pair's,
// as the design's "Look" draws each kind.

import { TINT, type TintName, inkAt } from "@fz/brick-wall/view/inks";
import type { Brick, KindId } from "../../rules/catalog/kinds";
import { PORTAL_MARKS } from "../../rules/levels/legend";
import type { WallPalette } from "./palette";

/** Describes what a brick's color reads of it: its kind and its tint. */
export type BrickColorLook = Pick<Brick, "kind" | "tint">;

/** Returns the color a brick of one kind is drawn in, by its tint. */
type KindColor = (tint: number, palette: WallPalette) => number;

/**
 * Each pair of portals' ink, by its mark in a level's picture, so a mark
 * the legend gains without an ink fails to compile: the first pair's rings
 * violet, the second's teal.
 */
const PORTAL_INKS = { "@": "violet", "&": "teal" } as const satisfies Readonly<
  Record<(typeof PORTAL_MARKS)[number], TintName>
>;

/**
 * Returns a plain or tough brick's or a gem's color: its row's ink, its
 * tint.
 *
 * @throws {RangeError} for a tint no tile has.
 */
function tinted(tint: number, palette: WallPalette): number {
  return inkAt(palette.tints, tint);
}

/** Returns a steel brick's, a ramp's or a hatch's color: steel, whatever its tint. */
function steeled(_: number, palette: WallPalette): number {
  return palette.steel;
}

/** Returns a kind's color that is one tile's ink by name, whatever its tint, as a lock's tint counts its bolts. */
function inked(name: TintName): KindColor {
  return (_, palette) => inkAt(palette.tints, TINT[name]);
}

/**
 * Returns a portal's color: its pair's ink, its tint the place of its
 * pair's mark among the legend's.
 *
 * @throws {RangeError} for a tint no pair has.
 */
function paired(tint: number, palette: WallPalette): number {
  const mark = PORTAL_MARKS[tint];
  if (mark === undefined) {
    throw new RangeError(`No pair of portals at ${String(tint)}`);
  }
  return inkAt(palette.tints, TINT[PORTAL_INKS[mark]]);
}

/** The color each kind of brick is drawn in, so a kind cataloged without one fails to compile. */
const BRICK_COLORS = {
  brick: tinted,
  tough: tinted,
  steel: steeled,
  ramp: steeled,
  hatch: steeled,
  spring: inked("pink"),
  gem: tinted,
  portal: paired,
  plated: inked("orange"),
  moss: inked("amber"),
  lock: inked("violet"),
} as const satisfies Readonly<Record<KindId, KindColor>>;

/**
 * Returns the color a brick is drawn in, which its shards take.
 *
 * @throws {RangeError} for a tint its kind's inks haven't.
 */
export function brickColor(
  { kind, tint }: BrickColorLook,
  palette: WallPalette,
): number {
  return BRICK_COLORS[kind](tint, palette);
}
