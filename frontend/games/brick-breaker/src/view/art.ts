import { BALL_KIND_IDS, type BallKindId } from "../rules/catalog/balls";
import { BRICK_KIND_IDS, type BrickKindId } from "../rules/catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  type CapsuleTone,
  capsule,
} from "../rules/catalog/capsules";
import {
  BALL_RADIUS,
  BOLT_LENGTH,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  CAPSULE_HEIGHT,
  CAPSULE_WIDTH,
  PADDLE_HEIGHT,
} from "../rules/tuning";
import { BRICK_ART, type BrickLook, brickFrame } from "./brick_art";
import type { BricksPalette } from "./palette";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  circle,
  frameAround,
  inset,
  lineWidth,
  middleSquare,
  polygon,
  rect,
  ring,
  roundRect,
  star,
  within,
} from "./shapes";
import { SYMBOLS } from "./symbols";

/** Draws what lies inside a ball's outline, in a circle at a point. */
export type DrawBall = (
  x: number,
  y: number,
  radius: number,
  palette: BricksPalette,
  scale: ArtScale,
) => readonly DrawCommand[];

/** Describes a capsule's shape as drawn: its size, its outline's width, and its outline's and its body's colors. */
export interface CapsuleShape {
  readonly width: number;
  readonly height: number;
  readonly line: number;
  readonly outline: number;
  readonly body: number;
}

/** Draws a capsule's outline and its body, filling its frame. */
export type DrawCapsule = (shape: CapsuleShape) => readonly DrawCommand[];

/** The names of the frames that aren't a brick's, a ball's, a capsule's or a tag's. */
export const FRAMES = {
  paddle: "paddle",
  /** A laser's cannon, over each end of the paddle. */
  cannon: "cannon",
  /** A catching paddle's rim, along its top, stretched to its width. */
  rim: "rim",
  bolt: "bolt",
  /** A broken brick's shard, white, so the scene tints it as the brick was. */
  shard: "shard",
  /** A fire ball's ember. */
  ember: "ember",
  /** A blast's ring, at its widest. */
  ring: "ring",
  /** The frame around each of the last bricks a level needs, once they glow. */
  glow: "glow",
} as const;

/** How wide a tag is, in field units. */
const TAG_SIZE = 0.8;

/** How wide a blast's ring is at its widest, in field units. */
const RING_SIZE = 4;

/** How big a shard is, in field units. */
const SHARD_SIZE = 0.35;

/** How big an ember is, in field units. */
const EMBER_SIZE = 0.2;

/** How wide a bolt is, in field units. */
const BOLT_WIDTH = 0.14;

/** How wide a cannon is, and how tall, in field units. */
const CANNON = { width: 0.3, height: 0.4 } as const;

/** How much of a capsule's height inside its outline its symbol takes. */
const SYMBOL_SHARE = 0.85;

/** How deep a bad capsule's notches are, as a share of its height. */
const NOTCH = 0.3;

// Made once, so finding a frame's name makes nothing. Object.fromEntries()
// types its keys as strings; these keys are the catalogs' ids.
const BALL_FRAMES = Object.fromEntries(
  BALL_KIND_IDS.map((kind) => [kind, `ball-${kind}`]),
) as Readonly<Record<BallKindId, string>>;
const CAPSULE_FRAMES = Object.fromEntries(
  CAPSULE_IDS.map((id) => [id, `capsule-${id}`]),
) as Readonly<Record<CapsuleId, string>>;
const TAG_FRAMES = Object.fromEntries(
  CAPSULE_IDS.map((id) => [id, `tag-${id}`]),
) as Readonly<Record<CapsuleId, string>>;

/** How each kind of ball is drawn inside its outline: in its color, with its one mark. */
export const BALL_ART = {
  normal: (x, y, radius, palette) => [
    circle(x, y, radius, palette.balls.normal),
  ],
  // A spark, which holds still; where motion is welcome, embers trail it too.
  fire: (x, y, radius, palette) => [
    circle(x, y, radius, palette.balls.fire),
    polygon(star(x, y, radius * 0.62, radius * 0.22, 4), palette.mark),
  ],
  blast: (x, y, radius, palette, scale) => [
    circle(x, y, radius, palette.balls.blast),
    ring(x, y, radius / 2, lineWidth(scale), palette.mark),
  ],
} as const satisfies Readonly<Record<BallKindId, DrawBall>>;

/** How each tone of capsule is shaped: a good one with rounded ends, a bad one with notched ends. */
export const CAPSULE_ART = {
  good: ({ width, height, line, outline, body }) => {
    const whole = { x: 0, y: 0, width, height };
    return [
      roundRect(whole, height / 2, outline),
      roundRect(inset(whole, line), height / 2 - line, body),
    ];
  },
  bad: ({ width, height, line, outline, body }) => {
    const notch = height * NOTCH;
    const half = height / 2;
    // How far across a notch's slanted edges move to lie a line's width in.
    const across = (line * Math.hypot(notch, half)) / half;
    const corner = across + (notch * line) / half;
    const shape = (
      by: number,
      toCorner: number,
      toNotch: number,
    ): readonly Point[] => [
      { x: toCorner, y: by },
      { x: width - toCorner, y: by },
      { x: width - toNotch, y: half },
      { x: width - toCorner, y: height - by },
      { x: toCorner, y: height - by },
      { x: toNotch, y: half },
    ];
    return [
      polygon(shape(0, 0, notch), outline),
      polygon(shape(line, corner, notch + across), body),
    ];
  },
} as const satisfies Readonly<Record<CapsuleTone, DrawCapsule>>;

/** Returns the name of a kind of ball's frame. */
export function ballFrame(kind: BallKindId): string {
  return BALL_FRAMES[kind];
}

/** Returns the name of a capsule's frame, as it falls. */
export function capsuleFrame(id: CapsuleId): string {
  return CAPSULE_FRAMES[id];
}

/** Returns the name of a capsule's tag, under the paddle while its effect lasts. */
export function tagFrame(id: CapsuleId): string {
  return TAG_FRAMES[id];
}

/** Returns a kind of ball's frame, outlined in the palette's outline. */
function ballArt(
  kind: BallKindId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const side = Math.max(3, Math.round(2 * BALL_RADIUS * scale.unit));
  const middle = side / 2;
  return {
    name: BALL_FRAMES[kind],
    width: side,
    height: side,
    commands: [
      circle(middle, middle, middle, palette.outline),
      ...BALL_ART[kind](
        middle,
        middle,
        middle - lineWidth(scale),
        palette,
        scale,
      ),
    ],
  };
}

/** Returns a capsule's frame: its tone's shape and color, outlined, with its symbol. */
function capsuleArt(
  id: CapsuleId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const width = Math.round(CAPSULE_WIDTH * scale.unit);
  const height = Math.round(CAPSULE_HEIGHT * scale.unit);
  const line = lineWidth(scale);
  const { tone } = capsule(id);
  const side = (height - 2 * line) * SYMBOL_SHARE;
  const square = middleSquare({ x: 0, y: 0, width, height }, side);
  return {
    name: CAPSULE_FRAMES[id],
    width,
    height,
    commands: [
      ...CAPSULE_ART[tone]({
        width,
        height,
        line,
        outline: palette.outline,
        body: palette.capsules[tone],
      }),
      ...SYMBOLS[id](square, palette.mark, line),
    ],
  };
}

/** Returns a capsule's tag: its symbol alone, in its tone's color. */
function tagArt(
  id: CapsuleId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const side = Math.round(TAG_SIZE * scale.unit);
  return {
    name: TAG_FRAMES[id],
    width: side,
    height: side,
    commands: SYMBOLS[id](
      { x: 0, y: 0, width: side, height: side },
      palette.capsules[capsule(id).tone],
      lineWidth(scale),
    ),
  };
}

/** Returns the frames of the paddle and what it carries, the bolts and the flourishes. */
function otherArt(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const line = lineWidth(scale);
  const paddleHeight = Math.round(PADDLE_HEIGHT * scale.unit);
  const ends = Math.ceil(paddleHeight / 2);
  const cannon = {
    x: 0,
    y: 0,
    width: Math.max(2 * line, Math.round(CANNON.width * scale.unit)),
    height: Math.max(2 * line, Math.round(CANNON.height * scale.unit)),
  };
  const bolt = {
    x: 0,
    y: 0,
    width: Math.max(2 * line, Math.round(BOLT_WIDTH * scale.unit)),
    height: Math.round(BOLT_LENGTH * scale.unit),
  };
  const shard = Math.max(2, Math.round(SHARD_SIZE * scale.unit));
  const ember = Math.max(2, Math.round(EMBER_SIZE * scale.unit));
  const blastRing = Math.round(RING_SIZE * scale.unit);
  const glow = {
    x: 0,
    y: 0,
    width: Math.round(BRICK_WIDTH * scale.unit) + 2 * line,
    height: Math.round(BRICK_HEIGHT * scale.unit) + 2 * line,
  };
  return [
    {
      name: FRAMES.paddle,
      width: 2 * ends + 2,
      height: paddleHeight,
      commands: [
        roundRect(
          { x: 0, y: 0, width: 2 * ends + 2, height: paddleHeight },
          paddleHeight / 2,
          palette.paddle,
        ),
      ],
      ends,
    },
    {
      name: FRAMES.cannon,
      width: cannon.width,
      height: cannon.height,
      commands: [
        roundRect(cannon, line, palette.paddle),
        rect(
          {
            x: (cannon.width - line) / 2,
            y: line,
            width: line,
            height: cannon.height - 2 * line,
          },
          palette.mark,
        ),
      ],
    },
    {
      name: FRAMES.rim,
      width: 2,
      height: line,
      commands: [rect({ x: 0, y: 0, width: 2, height: line }, palette.mark)],
    },
    {
      name: FRAMES.bolt,
      width: bolt.width,
      height: bolt.height,
      commands: [roundRect(bolt, bolt.width / 2, palette.paddle)],
    },
    {
      name: FRAMES.shard,
      width: shard,
      height: shard,
      commands: [
        polygon(
          within({ x: 0, y: 0, width: shard, height: shard }, [
            [0, 1],
            [1, 0.6],
            [0.35, 0],
          ]),
          0xffffff,
        ),
      ],
    },
    {
      name: FRAMES.ember,
      width: ember,
      height: ember,
      commands: [circle(ember / 2, ember / 2, ember / 2, palette.balls.fire)],
    },
    {
      name: FRAMES.ring,
      width: blastRing,
      height: blastRing,
      commands: [
        ring(
          blastRing / 2,
          blastRing / 2,
          blastRing / 2 - line,
          2 * line,
          palette.bricks.blast,
        ),
      ],
    },
    {
      name: FRAMES.glow,
      width: glow.width,
      height: glow.height,
      commands: frameAround(glow, 2 * line, palette.glow),
    },
  ];
}

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * brick kind in each tint and state, each ball, each capsule and its tag,
 * the paddle and what it carries, the bolt and the flourishes.
 */
export function atlasFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...BRICK_KIND_IDS.flatMap((kind) => BRICK_ART[kind].frames(palette, scale)),
    ...BALL_KIND_IDS.map((kind) => ballArt(kind, palette, scale)),
    ...CAPSULE_IDS.map((id) => capsuleArt(id, palette, scale)),
    ...CAPSULE_IDS.map((id) => tagArt(id, palette, scale)),
    ...otherArt(palette, scale),
  ];
}

/** Names a picture of each brick kind, ball kind and capsule, for How to play. */
export interface Pictures {
  readonly bricks: Readonly<Record<BrickKindId, string>>;
  readonly balls: Readonly<Record<BallKindId, string>>;
  readonly capsules: Readonly<Record<CapsuleId, string>>;
}

/** How How to play pictures each kind of brick: a tough one with a hit taken, and a ghost still hidden. */
const PICTURED_BRICKS: Readonly<Record<BrickKindId, BrickLook>> = {
  plain: { kind: "plain", tint: 0, whole: 1, hits: 1, shown: true },
  tough: { kind: "tough", tint: 5, whole: 3, hits: 2, shown: true },
  steel: { kind: "steel", tint: 0, whole: 0, hits: 0, shown: true },
  blast: { kind: "blast", tint: 0, whole: 1, hits: 1, shown: true },
  gift: { kind: "gift", tint: 0, whole: 1, hits: 1, shown: true },
  ghost: { kind: "ghost", tint: 6, whole: 2, hits: 2, shown: false },
  regrow: { kind: "regrow", tint: 3, whole: 1, hits: 1, shown: true },
};

/** The frames How to play's pictures are taken from. */
export const PICTURE_FRAMES: Pictures = {
  // Object.fromEntries() types its keys as strings; these are the kinds.
  bricks: Object.fromEntries(
    BRICK_KIND_IDS.map((kind) => [kind, brickFrame(PICTURED_BRICKS[kind])]),
  ) as Record<BrickKindId, string>,
  balls: BALL_FRAMES,
  capsules: CAPSULE_FRAMES,
};

/** Returns a set of pictures with each turned into another, such as a frame's name into the image baked of it. */
export function mapPictures(
  pictures: Pictures,
  map: (picture: string) => string,
): Pictures {
  return {
    bricks: mapRecord(pictures.bricks, map),
    balls: mapRecord(pictures.balls, map),
    capsules: mapRecord(pictures.capsules, map),
  };
}

/** Returns a record with each of its values turned into another. */
function mapRecord<K extends string>(
  record: Readonly<Record<K, string>>,
  map: (value: string) => string,
): Record<K, string> {
  // Object.fromEntries() types its keys as strings; these are the record's.
  return Object.fromEntries(
    Object.entries<string>(record).map(([key, value]) => [key, map(value)]),
  ) as Record<K, string>;
}
