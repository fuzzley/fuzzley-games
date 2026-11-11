import { recordOf } from "@fz/core/records";
import type { Pictured } from "@fz/phaser/scene";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import {
  BRICK_KIND_IDS,
  type BrickKindId,
  brickKind,
} from "../rules/catalog/bricks";
import { LEGEND } from "../rules/levels/legend";
import { type BrickLook, brickLayers } from "../view/art/art";
import type { FrameName } from "../view/art/frames";
import { cellOf } from "../view/art/symbols";

/**
 * Returns a whole brick of a kind, in the first tint, plated as the
 * legend's first character for the kind plates it, as How to play pictures
 * the kind: a plated brick as a `v`, toward the floor.
 */
function wholeBrickOf(kind: BrickKindId): BrickLook {
  const { hits } = brickKind(kind);
  const full = hits === "never" ? 0 : hits;
  const plates =
    Object.values(LEGEND).find((brick) => brick.kind === kind)?.plates ?? 0;
  return { kind, tint: 0, hits: full, full, plates };
}

/** The frames each kind's picture is drawn from: a whole brick's, from the bottom of its stack up. */
export const PICTURE_LAYERS: Readonly<
  Record<BrickKindId, readonly FrameName[]>
> = recordOf(BRICK_KIND_IDS, (kind) => brickLayers(wholeBrickOf(kind)));

/**
 * The frames How to play and the panels picture each kind of brick by, one
 * a kind, as `HelpPictures` takes them: the scene's own, each a whole brick
 * drawn in one frame.
 */
export const PICTURE_FRAMES: {
  readonly bricks: Readonly<Record<BrickKindId, string>>;
} = { bricks: recordOf(BRICK_KIND_IDS, (kind) => `picture-${kind}`) };

/** Holds a picture of each frame {@link PICTURE_FRAMES} names, as a `data:` URL, in the same records. */
export type Pictures = Pictured<typeof PICTURE_FRAMES>;

/**
 * Returns the frames {@link PICTURE_FRAMES} names, drawn from the art's
 * frames at a scale: each kind's layers, a cell each, one over another in
 * a cell.
 */
export function pictureFrames(
  frames: readonly ArtFrame[],
  scale: ArtScale,
): readonly ArtFrame[] {
  const { width, height } = cellOf(scale);
  return BRICK_KIND_IDS.map((kind) => ({
    name: PICTURE_FRAMES.bricks[kind],
    width,
    height,
    commands: PICTURE_LAYERS[kind].flatMap((layer) =>
      frames
        .filter((frame) => frame.name === layer)
        .flatMap((frame) => frame.commands),
    ),
  }));
}
