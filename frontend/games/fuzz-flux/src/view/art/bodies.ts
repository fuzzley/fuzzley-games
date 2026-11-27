// The fuzzballs' bodies, each its kind's silhouette in its ink: its fur
// behind a disc 58% of its square across, seated so the whole of it looks
// centered, each frame drawn about its square's middle, so the scene sets a
// body's frame at its square's middle and squashes and turns it about
// there. Its eyes are a frame of their own, `FRAMES.eyes`.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  centered,
  circle,
  shifted,
} from "@fz/phaser/shapes";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import type { BoardPalette } from "../colors/palette";
import { BODY, inPixels } from "./design_square";
import { FRAMES, LIFTS, type Lift } from "./frame_names";
import { AMBER } from "./kinds/amber";
import { BLUE } from "./kinds/blue";
import { GREEN } from "./kinds/green";
import type { KindArt } from "./kinds/kind_art";
import { PINK } from "./kinds/pink";
import { RED } from "./kinds/red";
import { VIOLET } from "./kinds/violet";

/** Each kind's art, by its id, so a kind cataloged without art fails to compile. */
export const KIND_ART = {
  blue: BLUE,
  red: RED,
  amber: AMBER,
  green: GREEN,
  violet: VIOLET,
  pink: PINK,
} as const satisfies Readonly<Record<KindId, KindArt>>;

/** How far a body's fur stands at each lift, from 0 at rest to 1 on end. */
const LIFTED = { rest: 0, "on-end": 1 } as const satisfies Readonly<
  Record<Lift, number>
>;

/**
 * Returns a plain fuzzball of a kind on the design's square, about its
 * square's middle, in an ink: its fur at a lift, and its body over it.
 */
export function plainBody(
  kind: KindId,
  ink: number,
  lift: Lift,
): readonly DrawCommand[] {
  const { seat, fur } = KIND_ART[kind];
  return [...fur(ink, LIFTED[lift]), circle(ORIGIN, BODY, { color: ink })].map(
    (command) => shifted(command, seat),
  );
}

/** Returns each kind's plain body in its ink at each lift, at a scale, in the order `FRAME_NAMES` lists them. */
export function bodyFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return KIND_IDS.flatMap((kind) =>
    LIFTS.map((lift) =>
      centered(
        FRAMES.body(kind, "plain", lift),
        inPixels(plainBody(kind, palette.kinds[kind], lift), scale),
      ),
    ),
  );
}
