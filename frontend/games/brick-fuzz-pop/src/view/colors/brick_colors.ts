// The color each kind of brick is drawn in, which its shards take, apart
// from the art that draws it, so the shell can show a brick's color without
// loading the art.

import type { BrickKindId } from "../../rules/catalog/bricks";
import type { Brick } from "../../rules/wall/wall";
import { itemAt } from "../items";
import { inkAt } from "./inks";
import type { InkedKind, WallPalette } from "./palette";

/** Describes what a brick's color reads of it: its kind and its tint. */
export type BrickColorLook = Pick<Brick, "kind" | "tint">;

/** Returns the color a brick of one kind is drawn in, by its tint. */
type KindColor = (tint: number, palette: WallPalette) => number;

/**
 * Returns a plain or tough brick's color: its tint's ink.
 *
 * @throws {RangeError} for a tint no tile has.
 */
function tinted(tint: number, palette: WallPalette): number {
  return inkAt(palette.tints, tint);
}

/**
 * Returns a portal's color: the body of its pair's inks, its tint the
 * pair's place.
 *
 * @throws {RangeError} for a tint no pair has.
 */
function paired(tint: number, palette: WallPalette): number {
  return itemAt(palette.portals, tint).body;
}

/** Returns a special kind's color: the body of its own inks, whatever its tint. */
function inked(kind: InkedKind): KindColor {
  return (_, palette) => palette.kinds[kind].body;
}

/** The color each kind of brick is drawn in, so a kind cataloged without one fails to compile. */
const BRICK_COLORS = {
  brick: tinted,
  tough: tinted,
  steel: inked("steel"),
  rowZapper: inked("rowZapper"),
  columnZapper: inked("columnZapper"),
  bomb: inked("bomb"),
  crossZapper: inked("crossZapper"),
  xZapper: inked("xZapper"),
  wool: inked("wool"),
  cage: inked("cage"),
  bumper: inked("bumper"),
  prism: inked("prism"),
  portal: paired,
  plated: inked("plated"),
  shell: inked("shell"),
  moss: inked("moss"),
} as const satisfies Readonly<Record<BrickKindId, KindColor>>;

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
