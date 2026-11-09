import { recordOf } from "@fz/core/records";
import { eyesCommands, fuzzballCommands } from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
  circle,
  lineWidth,
  polygon,
  rect,
  ring,
  roundRect,
} from "@fz/phaser/shapes";
import { BALL_KIND_IDS, type BallKindId } from "../../rules/catalog/balls";
import { BRICK_KIND_IDS, type BrickKindId } from "../../rules/catalog/bricks";
import {
  CAPSULE_IDS,
  type CapsuleId,
  type CapsuleTone,
  capsule,
} from "../../rules/catalog/capsules";
import {
  BALL_RADIUS,
  BOLT_LENGTH,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  CAPSULE_HEIGHT,
  CAPSULE_WIDTH,
  PADDLE_HEIGHT,
} from "../../rules/tuning";
import type { BricksPalette } from "../colors/palette";
import { BRICK_ART, type BrickLook, brickFrame } from "./brick_art";
import { FUR, REACH } from "./fuzzball_art";
import { frameAround, inset, middleSquare, within } from "./shapes";
import { SYMBOLS } from "./symbols";

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
  /** Each of the paddle's round ends, a disc as tall as the paddle, its body between their middles. */
  paddle: "paddle",
  /** A laser's cannon, over each end of the paddle. */
  cannon: "cannon",
  bolt: "bolt",
  /** A broken brick's shard, white, so the scene tints it as the brick was. */
  shard: "shard",
  /** A ball's eyes, about its body's middle, which the scene turns the way it goes. */
  eyes: "ball-eyes",
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

// Made once, so finding a frame's name makes nothing.
const BALL_FRAMES: Readonly<Record<BallKindId, string>> = recordOf(
  BALL_KIND_IDS,
  (kind) => `ball-${kind}`,
);
const FACED_BALL_FRAMES: Readonly<Record<BallKindId, string>> = recordOf(
  BALL_KIND_IDS,
  (kind) => `ball-${kind}-faced`,
);
const CAPSULE_FRAMES: Readonly<Record<CapsuleId, string>> = recordOf(
  CAPSULE_IDS,
  (id) => `capsule-${id}`,
);
const TAG_FRAMES: Readonly<Record<CapsuleId, string>> = recordOf(
  CAPSULE_IDS,
  (id) => `tag-${id}`,
);

/** How each tone of capsule is shaped: a good one with rounded ends, a bad one with notched ends. */
export const CAPSULE_ART = {
  good: ({ width, height, line, outline, body }) => {
    const whole = { x: 0, y: 0, width, height };
    return [
      roundRect(whole, height / 2, { color: outline }),
      roundRect(inset(whole, line), height / 2 - line, { color: body }),
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
      polygon(shape(0, 0, notch), { color: outline }),
      polygon(shape(line, corner, notch + across), { color: body }),
    ];
  },
} as const satisfies Readonly<Record<CapsuleTone, DrawCapsule>>;

/** Returns the name of a kind of ball's frame as it flies: its body and fur, without its eyes. */
export function ballFrame(kind: BallKindId): string {
  return BALL_FRAMES[kind];
}

/** Returns the name of a kind of ball's frame with its eyes looking ahead, for a ball shown still. */
export function facedBallFrame(kind: BallKindId): string {
  return FACED_BALL_FRAMES[kind];
}

/**
 * Returns how many device pixels a unit of the fuzzball's grid is drawn at,
 * so a normal ball's fur, outlined, reaches the ball's edge.
 */
export function ballGrid(scale: ArtScale): number {
  return Math.max(0, BALL_RADIUS * scale.unit - lineWidth(scale)) / REACH;
}

/** Returns the name of a capsule's frame, as it falls. */
export function capsuleFrame(id: CapsuleId): string {
  return CAPSULE_FRAMES[id];
}

/** Returns the name of a capsule's tag, under the paddle while its effect lasts. */
export function tagFrame(id: CapsuleId): string {
  return TAG_FRAMES[id];
}

/**
 * Returns a kind of ball's frames: the fuzzball in its kind's fur and color,
 * outlined in the palette's outline, as it flies and with its eyes.
 */
function ballArt(
  kind: BallKindId,
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const by = ballGrid(scale);
  const body = fuzzballCommands(by, {
    color: palette.balls[kind],
    outline: { color: palette.outline, width: lineWidth(scale) },
    fur: FUR[kind],
  });
  return [
    centered(BALL_FRAMES[kind], body),
    centered(FACED_BALL_FRAMES[kind], [
      ...body,
      ...eyesCommands(by, { color: palette.mark }),
    ]),
  ];
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
      ...SYMBOLS[id](square, { color: palette.mark, width: line }),
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
      { color: palette.capsules[capsule(id).tone], width: lineWidth(scale) },
    ),
  };
}

/** Returns the frames of the balls' eyes, the paddle and what it carries, the bolts and the flourishes. */
function otherArt(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const line = lineWidth(scale);
  const paddle = Math.round(PADDLE_HEIGHT * scale.unit);
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
    centered(
      FRAMES.eyes,
      eyesCommands(ballGrid(scale), { color: palette.mark }),
    ),
    {
      name: FRAMES.paddle,
      width: paddle,
      height: paddle,
      commands: [
        circle({ x: paddle / 2, y: paddle / 2 }, paddle / 2, {
          color: palette.paddle,
        }),
      ],
    },
    {
      name: FRAMES.cannon,
      width: cannon.width,
      height: cannon.height,
      commands: [
        roundRect(cannon, line, { color: palette.paddle }),
        rect(
          {
            x: (cannon.width - line) / 2,
            y: line,
            width: line,
            height: cannon.height - 2 * line,
          },
          { color: palette.mark },
        ),
      ],
    },
    {
      name: FRAMES.bolt,
      width: bolt.width,
      height: bolt.height,
      commands: [roundRect(bolt, bolt.width / 2, { color: palette.paddle })],
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
          { color: 0xffffff },
        ),
      ],
    },
    {
      name: FRAMES.ember,
      width: ember,
      height: ember,
      commands: [
        circle({ x: ember / 2, y: ember / 2 }, ember / 2, {
          color: palette.balls.fire,
        }),
      ],
    },
    {
      name: FRAMES.ring,
      width: blastRing,
      height: blastRing,
      commands: [
        ring({ x: blastRing / 2, y: blastRing / 2 }, blastRing / 2 - line, {
          color: palette.bricks.blast,
          width: 2 * line,
        }),
      ],
    },
    {
      name: FRAMES.glow,
      width: glow.width,
      height: glow.height,
      commands: frameAround(glow, { color: palette.glow, width: 2 * line }),
    },
  ];
}

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * brick kind in each tint and state, each ball as it flies and with its
 * eyes, each capsule and its tag, the balls' eyes, the paddle and what it
 * carries, the bolt and the flourishes.
 */
export function atlasFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...BRICK_KIND_IDS.flatMap((kind) => BRICK_ART[kind].frames(palette, scale)),
    ...BALL_KIND_IDS.flatMap((kind) => ballArt(kind, palette, scale)),
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
  bricks: recordOf(BRICK_KIND_IDS, (kind) => brickFrame(PICTURED_BRICKS[kind])),
  balls: FACED_BALL_FRAMES,
  capsules: CAPSULE_FRAMES,
};
