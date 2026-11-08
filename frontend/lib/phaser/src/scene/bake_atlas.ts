import type { Scene } from "phaser";
import { type FrameSize, pack } from "../shapes/packing";
import { type DrawTexture, bakeTexture } from "./bake_texture";

/** Describes a frame of an atlas: its name, its size and its picture. */
export interface AtlasFrame extends FrameSize {
  /** Draws its picture, in its own pixels, from its top left corner. */
  readonly draw: DrawTexture;
}

/**
 * Draws many frames into one texture, each a named frame of it, so the game
 * objects that show them draw in one batch; draws it again whenever a lost
 * WebGL context is restored, as {@link bakeTexture} does.
 *
 * Baking a key again draws over its texture and moves its frames, keeping
 * each frame's object, but an object showing one takes the frame's new size
 * and origin only once it sets the frame again, and one left showing a
 * frame the new bake leaves out throws as it draws. So a scene sets every
 * object's frame again after a bake, as `retakeFrames()` has every image
 * and sprite do.
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
