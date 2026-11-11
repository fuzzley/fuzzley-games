// How each kind of brick is drawn, as the frames stacked in its cell and
// the color its shards take.

import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { BrickKindId } from "../../rules/catalog/bricks";
import type { Brick } from "../../rules/wall/wall";
import type { WallPalette } from "../colors/palette";
import type { FrameName } from "./frames";
import { BOMB_ART } from "./kinds/bomb";
import { PLAIN_ART } from "./kinds/brick";
import { CAGE_ART } from "./kinds/cage";
import { MOSS_ART } from "./kinds/moss";
import { SHELL_ART } from "./kinds/shell";
import { STEEL_ART } from "./kinds/steel";
import { TOUGH_ART } from "./kinds/tough";
import { WOOL_ART } from "./kinds/wool";
import { zapperArt } from "./kinds/zapper";

/** Describes what a brick's art reads of it: its kind, its tint, its hits left and whole, and its plates. */
export type BrickLook = Pick<
  Brick,
  "kind" | "tint" | "hits" | "full" | "plates"
>;

/** Describes what a kind's art reads of a brick of the kind: its look but its kind, which the art is drawing. */
export type KindLook = Omit<BrickLook, "kind">;

/** Says how a kind of brick is drawn. */
export interface KindArt {
  /** Returns the frames a brick of the kind shows as it stands, stacked in its cell from the bottom up. */
  readonly layersOf: (brick: KindLook) => readonly FrameName[];
  /** Returns the color a brick of the kind is drawn in, which its shards take. */
  readonly colorOf: (brick: KindLook, palette: WallPalette) => number;
  /** Returns the frames the kind brings to the atlas, each the size of a cell. */
  readonly frames: (
    palette: WallPalette,
    scale: ArtScale,
  ) => readonly ArtFrame[];
}

/** How each kind of brick is drawn, so a kind cataloged without art fails to compile. */
export const BRICK_ART = {
  brick: PLAIN_ART,
  tough: TOUGH_ART,
  steel: STEEL_ART,
  rowZapper: zapperArt("rowZapper"),
  columnZapper: zapperArt("columnZapper"),
  bomb: BOMB_ART,
  crossZapper: zapperArt("crossZapper"),
  xZapper: zapperArt("xZapper"),
  wool: WOOL_ART,
  cage: CAGE_ART,
  shell: SHELL_ART,
  moss: MOSS_ART,
} as const satisfies Readonly<Record<BrickKindId, KindArt>>;

/**
 * Returns the frames a brick shows as it stands, stacked in its cell from
 * the bottom up.
 *
 * @throws {RangeError} for a brick no frame shows, such as one of a tint no
 *   tile has, or with more hits than a die shows.
 */
export function brickLayers(brick: BrickLook): readonly FrameName[] {
  return BRICK_ART[brick.kind].layersOf(brick);
}

/** Returns the color a brick is drawn in, which its shards take. */
export function brickColor(brick: BrickLook, palette: WallPalette): number {
  return BRICK_ART[brick.kind].colorOf(brick, palette);
}
