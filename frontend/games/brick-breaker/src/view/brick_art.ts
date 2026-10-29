import type { Brick } from "../rules/bricks";
import { BRICK_KINDS, type BrickKindId } from "../rules/catalog/bricks";
import { TINTS } from "../rules/level";
import { BRICK_HEIGHT, BRICK_WIDTH } from "../rules/tuning";
import type { BricksPalette } from "./palette";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  circle,
  inset,
  lineWidth,
  middleSquare,
  polygon,
  polyline,
  rect,
  roundRect,
  star,
  within,
} from "./shapes";

/** Describes what a brick's frame shows of it. */
export type BrickLook = Pick<
  Brick,
  "kind" | "tint" | "whole" | "hits" | "shown"
>;

/** Says how a kind of brick is drawn. */
export interface BrickArt {
  /** Returns the name of the frame a brick of the kind shows, as it stands. */
  readonly frameOf: (brick: BrickLook) => string;
  /** Returns the color a brick of the kind is drawn in, which its shards take. */
  readonly colorOf: (brick: BrickLook, palette: BricksPalette) => number;
  /** Returns every frame a brick of the kind may show. */
  readonly frames: (
    palette: BricksPalette,
    scale: ArtScale,
  ) => readonly ArtFrame[];
}

/** How far in from its cell a brick is drawn, on each side, in field units. */
const BRICK_INSET = 0.05;

/** How round a brick's corners are, in field units. */
const BRICK_CORNER = 0.12;

/** How big a mark's dot (a pip or a rivet) is across its middle, in field units. */
const DOT = 0.09;

/** How far apart a tough brick's pips are, in field units. */
const PIP_SPACING = 0.32;

/** How long a ghost brick's dashes are, and the gaps between, in field units. */
const DASH = 0.25;

/**
 * Each crack a tough brick shows for a hit it took, a zigzag from its top
 * to its bottom, in shares of its body, placed clear of its pips.
 */
const CRACKS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0.1, 0],
    [0.17, 0.5],
    [0.12, 1],
  ],
  [
    [0.9, 0],
    [0.83, 0.5],
    [0.88, 1],
  ],
  [
    [0.3, 0],
    [0.36, 0.45],
    [0.31, 1],
  ],
];

/** Returns the names of the frames of a brick drawn in each tint. */
function tinted(kind: string): readonly string[] {
  return Array.from({ length: TINTS }, (_, tint) => `${kind}-${String(tint)}`);
}

const PLAIN_FRAMES = tinted("plain");
const GHOST_FRAMES = tinted("ghost");
const REGROW_FRAMES = tinted("regrow");

/** Describes how a tough brick stands: the hits it takes whole, and those it has left. */
interface ToughLook {
  readonly whole: number;
  readonly hits: number;
}

/** Every way a tough brick a level lays can stand, with a hit or more left. */
const TOUGH_LOOKS: readonly ToughLook[] = Array.from(
  { length: BRICK_KINDS.tough.mostHits - BRICK_KINDS.tough.hits + 1 },
  (_, i) => BRICK_KINDS.tough.hits + i,
).flatMap((whole) =>
  Array.from({ length: whole }, (_, i) => ({ whole, hits: i + 1 })),
);

/** Returns the number a tough brick's frames are kept under, for how it stands. */
function toughKey(whole: number, hits: number): number {
  return whole * (BRICK_KINDS.tough.mostHits + 1) + hits;
}

/** A tough brick's frames, in each tint, for each way it can stand, and for no other. */
const TOUGH_FRAMES: ReadonlyMap<number, readonly string[]> = new Map(
  TOUGH_LOOKS.map(({ whole, hits }) => [
    toughKey(whole, hits),
    tinted(`tough-${String(whole)}-${String(hits)}`),
  ]),
);

/** Returns the name at a place in a list of names, which holds one for every brick a level can lay. */
function nameAt(names: readonly string[] | undefined, at: number): string {
  const name = names?.[at];
  if (name === undefined) throw new Error(`No frame at ${String(at)}.`);
  return name;
}

/** Returns the color at a place in a palette's list of tints, which holds one for every tint a level can name. */
function tintAt(tints: readonly number[], at: number): number {
  const tint = tints[at];
  if (tint === undefined) throw new Error(`No tint ${String(at)}.`);
  return tint;
}

/** Returns a brick's frame, drawn in its body, which lies a little in from its cell. */
function drawBrick(
  name: string,
  scale: ArtScale,
  draw: (body: Area) => readonly DrawCommand[],
): ArtFrame {
  const width = BRICK_WIDTH * scale.unit;
  const height = BRICK_HEIGHT * scale.unit;
  const body = inset(
    { x: 0, y: 0, width, height },
    Math.max(1, Math.round(scale.unit * BRICK_INSET)),
  );
  return { name, width, height, commands: draw(body) };
}

/** Returns a brick's body filled in a color, its corners rounded. */
function filled(body: Area, scale: ArtScale, color: number): DrawCommand {
  return roundRect(body, Math.round(scale.unit * BRICK_CORNER), color);
}

/** Returns a tough brick's pips, one for each hit it has left, across its middle. */
function pips(
  body: Area,
  hits: number,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const spacing = scale.unit * PIP_SPACING;
  const middle = body.x + body.width / 2;
  return Array.from({ length: hits }, (_, i) =>
    circle(
      middle + (i - (hits - 1) / 2) * spacing,
      body.y + body.height / 2,
      Math.max(1, scale.unit * DOT),
      color,
    ),
  );
}

/** Returns a tough brick's cracks, one for each hit it took. */
function cracks(
  body: Area,
  taken: number,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const inner = inset(body, width);
  return CRACKS.slice(0, taken).map((crack) =>
    polyline(within(inner, crack), width, color),
  );
}

/** Returns a ghost brick's dashed outline, along the edges of its body. */
function dashes(
  body: Area,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const dash = Math.max(2, Math.round(scale.unit * DASH));
  const right = body.x + body.width;
  const bottom = body.y + body.height;
  const commands: DrawCommand[] = [];
  for (let x = body.x; x < right; x += 2 * dash) {
    const length = Math.min(dash, right - x);
    commands.push(rect({ x, y: body.y, width: length, height: width }, color));
    commands.push(
      rect({ x, y: bottom - width, width: length, height: width }, color),
    );
  }
  for (let y = body.y; y < bottom; y += 2 * dash) {
    const length = Math.min(dash, bottom - y);
    commands.push(rect({ x: body.x, y, width, height: length }, color));
    commands.push(rect({ x: right - width, y, width, height: length }, color));
  }
  return commands;
}

/** Returns a sprout, a stem and two leaves, in the middle of a brick's body. */
function sprout(
  body: Area,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const square = middleSquare(body, body.height * 0.8);
  return [
    polyline(
      within(square, [
        [0.5, 1],
        [0.5, 0.35],
      ]),
      lineWidth(scale),
      color,
    ),
    polygon(
      within(square, [
        [0.5, 0.55],
        [0.1, 0.3],
        [0.35, 0.15],
      ]),
      color,
    ),
    polygon(
      within(square, [
        [0.5, 0.45],
        [0.9, 0.15],
        [0.65, 0.05],
      ]),
      color,
    ),
  ];
}

/** Returns a steel brick's two rivets, one toward each end. */
function rivets(
  body: Area,
  scale: ArtScale,
  color: number,
): readonly DrawCommand[] {
  const radius = Math.max(1, scale.unit * DOT);
  const y = body.y + body.height / 2;
  const fromEnd = body.height / 2;
  return [
    circle(body.x + fromEnd, y, radius, color),
    circle(body.x + body.width - fromEnd, y, radius, color),
  ];
}

/** Returns a gift brick's mark: a capsule's outline in the middle of its body. */
function giftMark(
  body: Area,
  scale: ArtScale,
  color: number,
  bodyColor: number,
): readonly DrawCommand[] {
  const width = lineWidth(scale);
  const height = body.height * 0.6;
  const outer = {
    x: body.x + (body.width - 2 * height) / 2,
    y: body.y + (body.height - height) / 2,
    width: 2 * height,
    height,
  };
  return [
    roundRect(outer, height / 2, color),
    roundRect(inset(outer, width), height / 2 - width, bodyColor),
  ];
}

/** Returns a blast brick's mark: a starburst in the middle of its body. */
function burst(body: Area, color: number): DrawCommand {
  return polygon(
    star(
      body.x + body.width / 2,
      body.y + body.height / 2,
      body.height * 0.42,
      body.height * 0.18,
      8,
    ),
    color,
  );
}

/** How each kind of brick is drawn: its frames, and which one a brick shows. */
export const BRICK_ART = {
  plain: {
    frameOf: (brick) => nameAt(PLAIN_FRAMES, brick.tint),
    colorOf: (brick, palette) => tintAt(palette.tints, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(PLAIN_FRAMES, i), scale, (body) => [
          filled(body, scale, tint),
        ]),
      ),
  },
  tough: {
    frameOf: (brick) =>
      nameAt(TOUGH_FRAMES.get(toughKey(brick.whole, brick.hits)), brick.tint),
    colorOf: (brick, palette) => tintAt(palette.toughTints, brick.tint),
    frames: (palette, scale) =>
      TOUGH_LOOKS.flatMap(({ whole, hits }) => {
        const names = TOUGH_FRAMES.get(toughKey(whole, hits));
        return palette.toughTints.map((tint, i) =>
          drawBrick(nameAt(names, i), scale, (body) => [
            filled(body, scale, tint),
            ...pips(body, hits, scale, palette.mark),
            ...cracks(body, whole - hits, scale, palette.mark),
          ]),
        );
      }),
  },
  steel: {
    frameOf: () => "steel",
    colorOf: (_, palette) => palette.bricks.steel,
    frames: (palette, scale) => [
      drawBrick("steel", scale, (body) => [
        filled(body, scale, palette.bricks.steel),
        ...rivets(body, scale, palette.mark),
      ]),
    ],
  },
  blast: {
    frameOf: () => "blast",
    colorOf: (_, palette) => palette.bricks.blast,
    frames: (palette, scale) => [
      drawBrick("blast", scale, (body) => [
        filled(body, scale, palette.bricks.blast),
        burst(body, palette.mark),
      ]),
    ],
  },
  gift: {
    frameOf: () => "gift",
    colorOf: (_, palette) => palette.bricks.gift,
    frames: (palette, scale) => [
      drawBrick("gift", scale, (body) => [
        filled(body, scale, palette.bricks.gift),
        ...giftMark(body, scale, palette.mark, palette.bricks.gift),
      ]),
    ],
  },
  ghost: {
    // Once it shows, a ghost brick is drawn as a plain one.
    frameOf: (brick) =>
      nameAt(brick.shown ? PLAIN_FRAMES : GHOST_FRAMES, brick.tint),
    colorOf: (brick, palette) => tintAt(palette.tints, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(GHOST_FRAMES, i), scale, (body) =>
          dashes(body, scale, tint),
        ),
      ),
  },
  regrow: {
    frameOf: (brick) => nameAt(REGROW_FRAMES, brick.tint),
    colorOf: (brick, palette) => tintAt(palette.tints, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(REGROW_FRAMES, i), scale, (body) => [
          filled(body, scale, tint),
          ...sprout(body, scale, palette.mark),
        ]),
      ),
  },
} as const satisfies Readonly<Record<BrickKindId, BrickArt>>;

/** Returns the name of the frame a brick shows, as it stands; it throws for a brick no level can lay. */
export function brickFrame(brick: BrickLook): string {
  return BRICK_ART[brick.kind].frameOf(brick);
}

/** Returns the color a brick is drawn in, which its shards take. */
export function brickColor(brick: BrickLook, palette: BricksPalette): number {
  return BRICK_ART[brick.kind].colorOf(brick, palette);
}
