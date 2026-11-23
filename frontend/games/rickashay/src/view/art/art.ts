// How a kind of brick is drawn, a kind's art in a file of its own in
// kinds/: the frames a brick of the kind shows as it stands, stacked in its
// cell, and the frames the kind brings to the atlas. The color it is drawn
// in, which its shards take, is `../colors/brick_colors.ts`', which the
// shell reads without the art.

import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { Brick } from "../../rules/catalog/kinds";
import type { WallPalette } from "../colors/palette";
import type { FrameName } from "./frames";

/** Describes what a kind's art reads of a brick of the kind: its tint, its hits left of those it had whole, and its plates, the faces a ramp's short sides or a plated brick's plates lie along. */
export type KindLook = Pick<Brick, "tint" | "hits" | "full" | "plates">;

/** Says how a kind of brick is drawn. */
export interface KindArt {
  /**
   * Returns the frames a brick of the kind shows as it stands, stacked in
   * its cell from the bottom up, each list made once, so finding a brick's
   * makes nothing.
   *
   * @throws {RangeError} for a look no frame shows.
   */
  readonly layersOf: (brick: KindLook) => readonly FrameName[];
  /** Returns the frames the kind brings to the atlas, drawn in a palette at a scale, each the size of a cell. */
  readonly frames: (
    palette: WallPalette,
    scale: ArtScale,
  ) => readonly ArtFrame[];
}
