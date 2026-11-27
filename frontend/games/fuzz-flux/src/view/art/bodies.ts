// The fuzzballs' bodies, each its kind's silhouette in its ink: its fur
// behind a disc 58% of its square across, seated so the whole of it looks
// centered; and a special's second fur behind that, the fuzzball drawn a
// little smaller and seated anew to make room for it, a rim of the
// square's color between them. Each frame is drawn about its square's
// middle, so the scene sets a body's frame at its square's middle and
// squashes and turns it about there. Its eyes are a frame of their own,
// `FRAMES.eyes`, which sit where `seatOf()` says its body does.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  centered,
  circle,
  scaledBy,
  shifted,
} from "@fz/phaser/shapes";
import { KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import type { BoardPalette } from "../colors/palette";
import { BODY, atLeastAPixel, inPixels } from "./design_square";
import { FRAMES, FURS, type Fur, LIFTS, type Lift } from "./frame_names";
import { AMBER } from "./kinds/amber";
import { BLUE } from "./kinds/blue";
import { GREEN } from "./kinds/green";
import type { KindArt } from "./kinds/kind_art";
import { PINK } from "./kinds/pink";
import { RED } from "./kinds/red";
import { VIOLET } from "./kinds/violet";
import { rimOf } from "./rim";
import { RIM, SPECIAL_ART } from "./specials";

/** Each kind's art, by its id, so a kind cataloged without art fails to compile. */
const KIND_ART = {
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

/** Describes where a fuzzball's body sits in its square, its middle in the design's units from its square's middle, and how large it is drawn there, 1 for a plain fuzzball. */
export interface Seat extends Point {
  readonly scale: number;
}

/** Returns where a fuzzball of a kind sits in its square in a fur, and how large it is drawn there. */
export function seatOf(kind: KindId, fur: Fur): Seat {
  const plain = KIND_ART[kind].seat;
  if (fur === "plain") return { ...plain, scale: 1 };
  const { seat, scale } = SPECIAL_ART[fur];
  return { ...seat(plain), scale };
}

/** Says what a body is drawn in: its kind's ink, its second fur's, and the square's, which its rim takes. */
export interface BodyInks {
  readonly ink: number;
  readonly secondFur: number;
  readonly square: number;
}

/** Returns what a kind's body is drawn in, in a palette. */
export function bodyInksOf(palette: BoardPalette, kind: KindId): BodyInks {
  return {
    ink: palette.kinds[kind],
    secondFur: palette.secondFurs[kind],
    square: palette.square,
  };
}

/**
 * Returns a fuzzball of a kind in a fur, its own fur at a lift, on the
 * design's square about its square's middle: a special's second fur first,
 * then its rim `rim` units wide, then its fur, then its body over it.
 */
export function bodyOf(
  kind: KindId,
  fur: Fur,
  lift: Lift,
  inks: BodyInks,
  rim: number,
): readonly DrawCommand[] {
  const seat = seatOf(kind, fur);
  const own = [
    ...KIND_ART[kind].fur(inks.ink, LIFTED[lift]),
    circle(ORIGIN, BODY, { color: inks.ink }),
  ].map((command) => scaledBy(command, seat.scale));
  const drawn =
    fur === "plain"
      ? own
      : [
          ...SPECIAL_ART[fur]
            .secondFur(inks.secondFur)
            .map((command) => scaledBy(command, seat.scale)),
          ...rimOf(own, rim, inks.square),
          ...own,
        ];
  return drawn.map((command) => shifted(command, seat));
}

/**
 * Returns each kind's body in each fur at each lift, in the order
 * `FRAME_NAMES` lists them, in a palette at a scale, a special's rim a CSS
 * pixel wide at least.
 */
export function bodyFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const rim = atLeastAPixel(RIM, scale);
  return KIND_IDS.flatMap((kind) => {
    const inks = bodyInksOf(palette, kind);
    return FURS.flatMap((fur) =>
      LIFTS.map((lift) =>
        centered(
          FRAMES.body(kind, fur, lift),
          inPixels(bodyOf(kind, fur, lift, inks, rim), scale),
        ),
      ),
    );
  });
}
