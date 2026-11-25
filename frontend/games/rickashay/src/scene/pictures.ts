// The pictures the scene hands the shell, to show beside the canvas: each
// drawn kind's whole brick, one frame of the atlas a kind, for the Ready
// card and the panels, and a floor bounce's spring, unlit and lit.

import type { WallFrames } from "@fz/brick-wall/scene/atlas";
import type { Pictured } from "@fz/phaser/scene";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { KindId } from "../rules/catalog/kinds";
import { LEGEND } from "../rules/levels/legend";
import {
  DRAWN_KINDS,
  brickLayers,
  wallAtlasFrames,
} from "../view/art/atlas_frames";
import { cellOf } from "../view/art/cells";
import { FRAMES } from "../view/art/frames";
import type { WallPalette } from "../view/colors/palette";

/**
 * Each drawn kind's whole brick, as the legend's first character for the
 * kind writes it, in the catalog's order, which the legend's keys, digits
 * first, don't keep.
 */
const WHOLE_BRICKS = Object.values(LEGEND)
  .filter(
    ({ kind }, at, all) =>
      DRAWN_KINDS.includes(kind) &&
      all.findIndex((brick) => brick.kind === kind) === at,
  )
  .sort((a, b) => DRAWN_KINDS.indexOf(a.kind) - DRAWN_KINDS.indexOf(b.kind));

/**
 * The frame each picture is, as `Pictures` takes them: each drawn kind's,
 * none for a kind the art doesn't draw yet, and a floor bounce's spring,
 * unlit and lit, the band's own frames, for This shot beside the field.
 */
export const PICTURE_FRAMES: {
  readonly bricks: Partial<Readonly<Record<KindId, string>>>;
  readonly springs: { readonly off: string; readonly on: string };
} = {
  bricks: Object.fromEntries(
    DRAWN_KINDS.map((kind) => [kind, `picture-${kind}`]),
  ),
  springs: { off: FRAMES.bounceOff, on: FRAMES.bounceOn },
};

/** Holds a picture of each frame {@link PICTURE_FRAMES} names, as a `data:` URL, in the same records. */
export type Pictures = Pictured<typeof PICTURE_FRAMES>;

/**
 * Returns the frames {@link PICTURE_FRAMES} names, drawn from the art's
 * frames at a scale: each drawn kind's whole brick, in the first ink, its
 * layers one over another in a cell.
 *
 * It throws a `RangeError` for a layer the frames hold no frame of.
 */
export function pictureFrames(
  frames: readonly ArtFrame[],
  scale: ArtScale,
): readonly ArtFrame[] {
  const { width, height } = cellOf(scale);
  const commandsOf = (layer: string): ArtFrame["commands"] => {
    const frame = frames.find(({ name }) => name === layer);
    if (frame === undefined) {
      throw new RangeError(`The art draws no frame named ${layer}.`);
    }
    return frame.commands;
  };
  return WHOLE_BRICKS.map(({ kind, hits, plates }) => {
    const layers = brickLayers({ kind, tint: 0, hits, full: hits, plates });
    return {
      name: `picture-${kind}`,
      width,
      height,
      commands: layers.flatMap(commandsOf),
    };
  });
}

/**
 * Returns every frame the scene's atlas bakes: the field's, as the art
 * draws them, then a picture of each drawn kind of brick for the page.
 */
export const atlasWithPictures: WallFrames<WallPalette> = (palette, scale) => {
  const frames = wallAtlasFrames(palette, scale);
  return [...frames, ...pictureFrames(frames, scale)];
};
