import { recordOf } from "@fz/core/records";
import { eyesCommands, fuzzballCommands } from "@fz/phaser/fuzzball";
import { showsDetail } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
  circle,
  frameAround,
  lineWidth,
  polygon,
  ring,
  roundRect,
  widthOf,
  within,
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
} from "../../rules/tuning";
import type { BricksPalette } from "../colors/palette";
import { BRICK_ART, type BrickLook, brickFrame } from "./brick_art";
import { FUR, REACH } from "./fuzzball_art";
import { paddleFrames } from "./paddle_art";
import { streakArt } from "./streak_art";
import { SYMBOLS } from "./symbols";

/**
 * Describes a capsule as drawn: its size, its outline's width, and its
 * outline's, its body's, its lip's and its shine's colors.
 */
export interface CapsuleShape {
  readonly width: number;
  readonly height: number;
  readonly line: number;
  readonly outline: number;
  readonly body: number;
  readonly lip: number;
  readonly shine: number;
}

/**
 * Says how a capsule is drawn: its outline, its lip, its body and a good
 * one's shine, filling its frame, and the square its symbol takes.
 */
export interface CapsuleLook {
  readonly commands: readonly DrawCommand[];
  readonly symbol: Area;
}

/** Draws a capsule at a scale, and says where its symbol goes. */
export type DrawCapsule = (shape: CapsuleShape, scale: ArtScale) => CapsuleLook;

/** The names of the frames that aren't a brick's, a ball's, a capsule's, a tag's or the paddle's. */
export const FRAMES = {
  /** A laser's bolt, in the cannons' color. */
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

/**
 * The kit's capsule, after `capsule()` in
 * `docs/brick-breaker-uplift/art/scene.mjs`, 80 tall: how far its lip lies
 * below its body, a good one's and a bad one's; its shine, how far below the
 * body's top and how tall; how far a bad one's ends point; and how wide its
 * symbol is.
 */
const KIT_CAPSULE = {
  height: 80,
  drop: { good: 6, bad: 8 },
  shine: { below: 6, height: 7 },
  point: 22,
  symbol: 40,
} as const;

/**
 * How much of its face's height a capsule's symbol takes where a brick is
 * too small for its finest detail, and its shine is left out.
 */
const SYMBOL_SHARE = 0.85;

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

/**
 * How each tone of capsule is drawn, as the kit draws it: a good one a pill
 * with a shine along its top, a bad one pointed at each end, each on a lip
 * that shows below it, outlined, its symbol about its middle.
 */
export const CAPSULE_ART = {
  good: (shape, scale) => {
    const { width, height, line, outline, body, lip, shine } = shape;
    const drop = capsuleDrop(KIT_CAPSULE.drop.good, scale);
    const face = faceOf(shape, drop);
    const detail = showsDetail(scale, BRICK_WIDTH);
    const shineArea = {
      x: width / 4,
      y: line + kitLength(KIT_CAPSULE.shine.below, height),
      width: width / 2,
      height: kitLength(KIT_CAPSULE.shine.height, height),
    };
    return {
      commands: [
        roundRect({ x: 0, y: 0, width, height }, height / 2, {
          color: outline,
        }),
        roundRect({ ...face, y: face.y + drop }, face.height / 2, {
          color: lip,
        }),
        roundRect(face, face.height / 2, { color: body }),
        ...(detail
          ? [roundRect(shineArea, shineArea.height / 2, { color: shine })]
          : []),
      ],
      // Below its shine, it sits at the pill's middle rather than its face's.
      symbol: symbolSquare(
        shape,
        detail,
        face,
        detail ? height / 2 : face.y + face.height / 2,
      ),
    };
  },
  bad: (shape, scale) => {
    const { width, height, line, outline, body, lip } = shape;
    const drop = capsuleDrop(KIT_CAPSULE.drop.bad, scale);
    const point = kitLength(KIT_CAPSULE.point, height);
    const half = height / 2;
    // Where the outline's slanted edges lie a line's width in: where they
    // meet its middle, and where they meet its top and its foot.
    const tip = (line * Math.hypot(point, half)) / half;
    const corner = point + tip - (point * line) / half;
    const face = faceOf(shape, drop);
    // The face's ends point at a line's width in from the outline's upper
    // edges, its lip's from its lower ones, as the lip lies `drop` below.
    const facePoints = (by: number): readonly Point[] => {
      const top = face.y + by;
      const foot = top + face.height;
      const middle = (top + foot) / 2;
      const end = tip + (point * drop) / height;
      return [
        { x: corner, y: top },
        { x: width - corner, y: top },
        { x: width - end, y: middle },
        { x: width - corner, y: foot },
        { x: corner, y: foot },
        { x: end, y: middle },
      ];
    };
    return {
      commands: [
        polygon(
          [
            { x: point, y: 0 },
            { x: width - point, y: 0 },
            { x: width, y: half },
            { x: width - point, y: height },
            { x: point, y: height },
            { x: 0, y: half },
          ],
          { color: outline },
        ),
        polygon(facePoints(drop), { color: lip }),
        polygon(facePoints(0), { color: body }),
      ],
      symbol: symbolSquare(
        shape,
        showsDetail(scale, BRICK_WIDTH),
        face,
        face.y + face.height / 2,
      ),
    };
  },
} as const satisfies Readonly<Record<CapsuleTone, DrawCapsule>>;

/**
 * Returns how far a capsule's lip lies below its body, in whole device
 * pixels, a CSS pixel at least, so a bad one's gold shows at any size.
 */
function capsuleDrop(kit: number, scale: ArtScale): number {
  return widthOf((kit * CAPSULE_HEIGHT) / KIT_CAPSULE.height, scale);
}

/**
 * Returns the box a capsule's face fills: a line's width in from its
 * outline, and short of its foot by its lip, which shows below.
 */
function faceOf({ width, height, line }: CapsuleShape, drop: number): Area {
  return {
    x: line,
    y: line,
    width: width - 2 * line,
    height: height - 2 * line - drop,
  };
}

/** Returns a length of the kit's capsule on a capsule so many device pixels tall. */
function kitLength(length: number, height: number): number {
  return (length * height) / KIT_CAPSULE.height;
}

/**
 * Returns the square a capsule's symbol takes, about a point down its
 * middle: as wide as the kit's, half the capsule's height, or, where a brick
 * is too small for its finest detail, {@link SYMBOL_SHARE} of its face's
 * height, so it still reads.
 */
function symbolSquare(
  { width, height }: CapsuleShape,
  detail: boolean,
  face: Area,
  middle: number,
): Area {
  const side = detail
    ? kitLength(KIT_CAPSULE.symbol, height)
    : face.height * SYMBOL_SHARE;
  return {
    x: (width - side) / 2,
    y: middle - side / 2,
    width: side,
    height: side,
  };
}

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

/** Returns how a capsule of a tone is drawn in a palette at a scale: its size in whole device pixels, its outline's width and its colors. */
export function capsuleShape(
  tone: CapsuleTone,
  palette: BricksPalette,
  scale: ArtScale,
): CapsuleShape {
  return {
    width: Math.round(CAPSULE_WIDTH * scale.unit),
    height: Math.round(CAPSULE_HEIGHT * scale.unit),
    line: lineWidth(scale),
    outline: palette.outline,
    body: palette.capsules[tone],
    lip: palette.capsuleLips[tone],
    shine: palette.capsuleShine,
  };
}

/** Returns a capsule's frame: its tone's shape and color, outlined, with its symbol. */
function capsuleArt(
  id: CapsuleId,
  palette: BricksPalette,
  scale: ArtScale,
): ArtFrame {
  const { tone } = capsule(id);
  const shape = capsuleShape(tone, palette, scale);
  const { commands, symbol } = CAPSULE_ART[tone](shape, scale);
  return {
    name: CAPSULE_FRAMES[id],
    width: shape.width,
    height: shape.height,
    commands: [
      ...commands,
      ...SYMBOLS[id](symbol, { color: palette.mark, width: shape.line }),
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

/** Returns the frames of the balls' eyes, the bolts and the flourishes. */
function otherArt(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const line = lineWidth(scale);
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
      name: FRAMES.bolt,
      width: bolt.width,
      height: bolt.height,
      commands: [
        roundRect(bolt, bolt.width / 2, { color: palette.paddleInks.cannon }),
      ],
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
 * eyes, each capsule and its tag, the balls' eyes, the paddle's ends,
 * cannons and hooks, the bolt and the flourishes.
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
    ...paddleFrames(palette, scale),
    ...otherArt(palette, scale),
    ...streakArt(scale),
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
  cage: { kind: "cage", tint: 0, whole: 2, hits: 2, shown: true },
  plated: { kind: "plated", tint: 0, whole: 2, hits: 2, shown: true },
  key: { kind: "key", tint: 0, whole: 1, hits: 1, shown: true },
  gate: { kind: "gate", tint: 0, whole: 0, hits: 0, shown: true },
};

/** The frames How to play's pictures are taken from. */
export const PICTURE_FRAMES: Pictures = {
  bricks: recordOf(BRICK_KIND_IDS, (kind) => brickFrame(PICTURED_BRICKS[kind])),
  balls: FACED_BALL_FRAMES,
  capsules: CAPSULE_FRAMES,
};
