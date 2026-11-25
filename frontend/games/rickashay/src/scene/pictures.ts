// The pictures the scene hands the shell, to show beside the canvas: each
// kind's whole brick, one frame of the atlas a kind, for the Ready card and
// the panels, and a floor bounce's spring, unlit and lit.

import type { WallFrames } from "@fz/brick-wall/scene/atlas";
import { cellArea } from "@fz/brick-wall/view/art";
import type { Pictured } from "@fz/phaser/scene";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { KIND_IDS, type KindId } from "../rules/catalog/kinds";
import { LEGEND, tintOf } from "../rules/levels/legend";
import { brickLayers, wallAtlasFrames } from "../view/art/atlas_frames";
import { FRAMES } from "../view/art/frames";
import type { WallPalette } from "../view/colors/palette";

/**
 * Each kind's whole brick, as the legend's first character for the kind
 * writes it in a wall's first cell, with the tint it takes there, the
 * first ink or a lock's 1 bolt, in the catalog's order, which the legend's
 * keys, digits first, don't keep.
 */
const WHOLE_BRICKS = Object.entries(LEGEND)
  .filter(
    ([, { kind }], at, all) =>
      all.findIndex(([, brick]) => brick.kind === kind) === at,
  )
  .map(([character, brick]) => ({ ...brick, tint: tintOf(character, 0) }))
  .sort((a, b) => KIND_IDS.indexOf(a.kind) - KIND_IDS.indexOf(b.kind));

/**
 * The frame each picture is, as `Pictures` takes them: each kind's, and a
 * floor bounce's spring, unlit and lit, the band's own frames, for This
 * shot beside the field.
 */
export const PICTURE_FRAMES: {
  readonly bricks: Partial<Readonly<Record<KindId, string>>>;
  readonly springs: { readonly off: string; readonly on: string };
} = {
  bricks: Object.fromEntries(KIND_IDS.map((kind) => [kind, `picture-${kind}`])),
  springs: { off: FRAMES.bounceOff, on: FRAMES.bounceOn },
};

/** Holds a picture of each frame {@link PICTURE_FRAMES} names, as a `data:` URL, in the same records. */
export type Pictures = Pictured<typeof PICTURE_FRAMES>;

/**
 * Returns the frames {@link PICTURE_FRAMES} names, drawn from the art's
 * frames at a scale: each kind's whole brick, its layers one over another
 * in a cell.
 *
 * It throws a `RangeError` for a layer the frames hold no frame of.
 */
export function pictureFrames(
  frames: readonly ArtFrame[],
  scale: ArtScale,
): readonly ArtFrame[] {
  const { width, height } = cellArea(scale);
  const commandsOf = (layer: string): ArtFrame["commands"] => {
    const frame = frames.find(({ name }) => name === layer);
    if (frame === undefined) {
      throw new RangeError(`The art draws no frame named ${layer}.`);
    }
    return frame.commands;
  };
  return WHOLE_BRICKS.map(({ kind, tint, hits, plates }) => {
    const layers = brickLayers({ kind, tint, hits, full: hits, plates });
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
 * draws them, then a picture of each kind of brick for the page.
 */
export const atlasWithPictures: WallFrames<WallPalette> = (palette, scale) => {
  const frames = wallAtlasFrames(palette, scale);
  return [...frames, ...pictureFrames(frames, scale)];
};
