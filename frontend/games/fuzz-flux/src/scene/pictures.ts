// The pictures the scene hands the shell, to show beside the canvas, for
// the bar's goals and How to play: each kind's fuzzball, a fuzzball in
// each special's fur, the frizzball, the sleepyhead, a caged fuzzball and
// a burred one, each drawn whole as it rests on the board, its eyes where
// they sit; a square under each layer of dust; and a brick.

import { itemAt, recordOf } from "@fz/core/records";
import type { Pictured } from "@fz/phaser/scene";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  centered,
  scaledBy,
  shifted,
} from "@fz/phaser/shapes";
import { BRICK_LAYERS } from "../rules/catalog/elements";
import { KIND_IDS, type KindId } from "../rules/catalog/kinds";
import type { Fuzzball, Piece } from "../rules/catalog/pieces";
import { SPECIAL_IDS } from "../rules/catalog/specials";
import type { EyesSeat } from "../view/art/eyes";
import {
  DUSTY,
  type Dusty,
  FRAMES,
  type FrameName,
} from "../view/art/frame_names";
import { atlasFrames } from "../view/art/frames";
import {
  behindFrameOf,
  bodyFrameOf,
  bodyScaleOf,
  eyesFrameOf,
  eyesSeatOn,
  furOf,
  overFrameOf,
} from "../view/art/piece_frames";
import type { BoardPalette } from "../view/colors/palette";
import { restingFace } from "../view/timeline/looks";

/** Returns the name of a picture's frame in the atlas. */
function pictureOf<What extends string>(what: What): `picture-${What}` {
  return `picture-${what}`;
}

/** The frame of each picture of a square under a layer of dust, in the order of {@link DUSTY}. */
const DUST_PICTURES: readonly `picture-dust-${Dusty}`[] = DUSTY.map((layers) =>
  pictureOf(`dust-${layers}`),
);

/**
 * The frame each picture is, as `Pictures` takes them: each kind's
 * fuzzball, a fuzzball in each special's fur, the frizzball, the
 * sleepyhead, a caged fuzzball, a burred one, a square under each layer
 * of dust in turn, and a brick of 1 layer, its own frame, as the design
 * pictures the bricks' goal.
 */
export const PICTURE_FRAMES = {
  kinds: recordOf(KIND_IDS, pictureOf),
  specials: recordOf(SPECIAL_IDS, pictureOf),
  frizzball: pictureOf("frizzball"),
  sleepyhead: pictureOf("sleepyhead"),
  caged: pictureOf("caged"),
  burred: pictureOf("burred"),
  dust: DUST_PICTURES,
  brick: FRAMES.brick(itemAt(BRICK_LAYERS, 0)),
} as const;

/** Holds a picture of each frame {@link PICTURE_FRAMES} names, as a `data:` URL, in the same records. */
export type Pictures = Pictured<typeof PICTURE_FRAMES>;

/** Describes one of the atlas's frames a picture is drawn from, and where it sits on the picture's square. */
interface Seated {
  readonly frame: FrameName;
  readonly seat: EyesSeat;
}

/** Describes a picture drawn from the atlas's frames, back to front. */
interface Picture {
  readonly name: string;
  readonly images: readonly Seated[];
}

/** Where a frame sits that sits at its square's middle, as large as drawn. */
const AT_MIDDLE: EyesSeat = { x: 0, y: 0, scale: 1 };

/** The kind a picture of something worn on a fuzzball shows it on. */
const WORN_ON: KindId = KIND_IDS[0];

/** Returns a plain fuzzball of a kind, changed as given. */
function fuzzballOf(kind: KindId, change: Partial<Fuzzball> = {}): Fuzzball {
  return {
    what: "fuzzball",
    id: 0,
    kind,
    special: null,
    caged: false,
    burred: false,
    ...change,
  };
}

/** Returns a picture of a piece as it rests on the board: what it wears behind it, its body as large as it is drawn, its eyes where they sit in the face it rests with, and what it wears over them. */
function restingPiece(name: string, piece: Piece): Picture {
  const fur = furOf(piece);
  const eyes = eyesFrameOf(piece, restingFace(piece));
  const seated = (
    frame: FrameName | null,
    seat: EyesSeat = AT_MIDDLE,
  ): readonly Seated[] => (frame === null ? [] : [{ frame, seat }]);
  return {
    name,
    images: [
      ...seated(behindFrameOf(piece)),
      ...seated(bodyFrameOf(piece, fur, "rest"), {
        ...AT_MIDDLE,
        scale: bodyScaleOf(piece),
      }),
      ...(eyes === null ? [] : [{ frame: eyes, seat: eyesSeatOn(piece, fur) }]),
      ...seated(overFrameOf(piece)),
    ],
  };
}

/** Every picture drawn from the atlas's frames, each named as {@link PICTURE_FRAMES} names it. */
const PICTURES: readonly Picture[] = [
  ...KIND_IDS.map((kind) =>
    restingPiece(PICTURE_FRAMES.kinds[kind], fuzzballOf(kind)),
  ),
  ...SPECIAL_IDS.map((special) =>
    restingPiece(
      PICTURE_FRAMES.specials[special],
      fuzzballOf(WORN_ON, { special }),
    ),
  ),
  restingPiece(PICTURE_FRAMES.frizzball, { what: "frizzball", id: 0 }),
  restingPiece(PICTURE_FRAMES.sleepyhead, { what: "sleepyhead", id: 0 }),
  restingPiece(PICTURE_FRAMES.caged, fuzzballOf(WORN_ON, { caged: true })),
  restingPiece(PICTURE_FRAMES.burred, fuzzballOf(WORN_ON, { burred: true })),
  ...DUSTY.map((layers, at) => ({
    name: itemAt(DUST_PICTURES, at),
    images: [
      { frame: FRAMES.square, seat: AT_MIDDLE },
      { frame: FRAMES.dust(layers), seat: AT_MIDDLE },
    ],
  })),
];

/**
 * Returns the pictures drawn from the art's frames at a scale, each a frame
 * about its square's middle, so a piece drawn smaller pictures smaller.
 *
 * @throws {RangeError} for a picture drawn from a frame the art lacks.
 */
export function pictureFrames(
  frames: readonly ArtFrame[],
  scale: ArtScale,
): readonly ArtFrame[] {
  const byName = new Map(frames.map((frame) => [frame.name, frame]));
  return PICTURES.map(({ name, images }) =>
    centered(
      name,
      images.flatMap((image) => seatedCommands(byName, image, scale)),
    ),
  );
}

/** Returns a frame's drawing moved and scaled to where it sits on its square, about the square's middle. */
function seatedCommands(
  byName: ReadonlyMap<string, ArtFrame>,
  { frame, seat }: Seated,
  scale: ArtScale,
): readonly DrawCommand[] {
  const art = byName.get(frame);
  if (art === undefined) {
    throw new RangeError(`The art draws no frame named ${frame}.`);
  }
  const middle = { x: -art.width / 2, y: -art.height / 2 };
  const at = { x: seat.x * scale.unit, y: seat.y * scale.unit };
  return art.commands.map((command) =>
    shifted(scaledBy(shifted(command, middle), seat.scale), at),
  );
}

/** Returns every frame the scene's atlas bakes, in a palette at a scale: the art's, then the pictures drawn from them. */
export function atlasWithPictures(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const frames = atlasFrames(palette, scale);
  return [...frames, ...pictureFrames(frames, scale)];
}
