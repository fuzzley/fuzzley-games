import type { Scene } from "phaser";
import { type DrawTexture, bakeTexture } from "./bake_texture";

/** Describes a frame of an atlas: its name, its size and its picture. */
export interface AtlasFrame {
  /** Names the frame in the atlas's texture. */
  readonly name: string;
  /** Its width, in whole pixels. */
  readonly width: number;
  /** Its height, in whole pixels. */
  readonly height: number;
  /** Draws its picture, in its own pixels, from its top left corner. */
  readonly draw: DrawTexture;
}

/** The empty pixels between two frames, so none bleeds into the next. */
export const ATLAS_GUTTER = 2;

/** The widest or tallest an atlas may be, which every WebGL device takes. */
export const MAX_ATLAS_SIDE = 4096;

/** Where a frame lies in the atlas. */
interface Placed {
  readonly frame: AtlasFrame;
  readonly x: number;
  readonly y: number;
}

/** Says where every frame lies in an atlas, and how big it is. */
interface Packing {
  readonly placed: readonly Placed[];
  readonly width: number;
  readonly height: number;
}

/**
 * Draws many frames into one texture, each a named frame of it, so the game
 * objects that show them draw in one batch; draws it again whenever a lost
 * WebGL context is restored, as {@link bakeTexture} does.
 *
 * Baking a key again draws over its texture and moves its frames, keeping
 * each frame's object, so an image already showing one shows the new
 * picture; it takes the frame's new size once it sets the frame again.
 */
export function bakeAtlas(
  scene: Scene,
  key: string,
  frames: readonly AtlasFrame[],
): void {
  const { placed, width, height } = pack(frames);
  bakeTexture(scene, key, width, height, (graphics) => {
    for (const { frame, x, y } of placed) {
      graphics.save();
      graphics.translateCanvas(x, y);
      frame.draw(graphics);
      graphics.restore();
    }
  });

  const texture = scene.textures.get(key);
  const names = new Set(frames.map((frame) => frame.name));
  for (const name of texture.getFrameNames()) {
    if (!names.has(name)) texture.remove(name);
  }
  for (const { frame, x, y } of placed) {
    if (texture.has(frame.name)) {
      texture.get(frame.name).setSize(frame.width, frame.height, x, y);
    } else {
      texture.add(frame.name, 0, x, y, frame.width, frame.height);
    }
  }
}

/**
 * Packs frames into rows, in their order, about as wide as the atlas is
 * tall, with a gutter between, or throws for frames it can't pack.
 */
function pack(frames: readonly AtlasFrame[]): Packing {
  const names = new Set<string>();
  let area = 0;
  let widest = 1;
  for (const frame of frames) {
    if (names.has(frame.name)) {
      throw new Error(`Two atlas frames are named "${frame.name}".`);
    }
    names.add(frame.name);
    area += (frame.width + ATLAS_GUTTER) * (frame.height + ATLAS_GUTTER);
    widest = Math.max(widest, frame.width);
  }

  const across = Math.max(widest, Math.ceil(Math.sqrt(area)));
  const placed: Placed[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let width = 1;
  for (const frame of frames) {
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
