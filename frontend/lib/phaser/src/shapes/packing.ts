// How the frames of an atlas are packed into it, which knows no Phaser, so
// a game's spec can hold its atlas to a size without running a scene.

/** Describes a frame by all its atlas's packing reads of it: its name and its size. */
export interface FrameSize {
  /** Names the frame in the atlas's texture. */
  readonly name: string;
  /** Its width, in whole pixels. */
  readonly width: number;
  /** Its height, in whole pixels. */
  readonly height: number;
}

/** The empty pixels between two frames, so none bleeds into the next. */
export const ATLAS_GUTTER = 2;

/** The widest or tallest an atlas may be, which every WebGL device takes. */
export const MAX_ATLAS_SIDE = 4096;

/** Says where a frame lies in the atlas. */
export interface Placed<T extends FrameSize> {
  readonly frame: T;
  readonly x: number;
  readonly y: number;
}

/** Says where every frame lies in an atlas, and how big it is. */
export interface Packing<T extends FrameSize> {
  readonly placed: readonly Placed<T>[];
  readonly width: number;
  readonly height: number;
}

/** The name Phaser gives the frame that is a texture's whole. */
const BASE_FRAME = "__BASE";

/** Returns whether a size is a whole number of pixels, at least one. */
function isWholeSize(size: number): boolean {
  return Number.isInteger(size) && size > 0;
}

/**
 * Returns how big an atlas of frames is, packed as `bakeAtlas()` packs
 * them, so a game can hold its atlas to a size the devices it plays on take.
 *
 * It throws as {@link pack} does.
 */
export function atlasSize(frames: readonly FrameSize[]): {
  readonly width: number;
  readonly height: number;
} {
  const { width, height } = pack(frames);
  return { width, height };
}

/**
 * Packs frames into rows, tallest first, about as wide as the atlas is
 * tall, with a gutter between, so the rows waste little; frames of one
 * height keep the order they are given in.
 *
 * It throws for two frames of one name, a frame named as Phaser names a
 * texture's whole, a size that isn't a whole number of pixels above 0, or an
 * atlas larger than every device takes.
 */
export function pack<T extends FrameSize>(frames: readonly T[]): Packing<T> {
  const names = new Set<string>();
  let area = 0;
  let widest = 1;
  for (const frame of frames) {
    if (names.has(frame.name)) {
      throw new Error(`Two atlas frames are named "${frame.name}".`);
    }
    if (frame.name === BASE_FRAME) {
      throw new Error(`An atlas frame can't be named "${BASE_FRAME}".`);
    }
    if (!isWholeSize(frame.width) || !isWholeSize(frame.height)) {
      throw new Error(
        `The atlas frame "${frame.name}" is ${frame.width} × ${frame.height}, not whole pixels above 0.`,
      );
    }
    names.add(frame.name);
    area += (frame.width + ATLAS_GUTTER) * (frame.height + ATLAS_GUTTER);
    widest = Math.max(widest, frame.width);
  }

  const across = Math.max(widest, Math.ceil(Math.sqrt(area)));
  const placed: Placed<T>[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 1;
  for (const frame of [...frames].sort((a, b) => b.height - a.height)) {
    if (x > 0 && x + frame.width > across) {
      x = 0;
      y += rowHeight + ATLAS_GUTTER;
      rowHeight = 0;
    }
    placed.push({ frame, x, y });
    width = Math.max(width, x + frame.width);
    rowHeight = Math.max(rowHeight, frame.height);
    x += frame.width + ATLAS_GUTTER;
  }
  const height = Math.max(1, y + rowHeight);
  if (width > MAX_ATLAS_SIDE || height > MAX_ATLAS_SIDE) {
    throw new Error(
      `An atlas of ${width} × ${height} pixels is larger than ${MAX_ATLAS_SIDE} a side.`,
    );
  }
  return { placed, width, height };
}
