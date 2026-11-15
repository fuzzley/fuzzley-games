import type { Scene, Textures } from "phaser";

/**
 * Returns the canvas texture a scene holds under a key, as a canvas spec
 * reads what was drawn on it.
 *
 * @throws {Error} Where the key names no texture, or one that isn't drawn
 *   on a canvas of its own.
 */
export function canvasTexture(
  scene: Scene,
  key: string,
): Textures.CanvasTexture {
  const texture = scene.textures.exists(key) ? scene.textures.get(key) : null;
  if (!texture || !isCanvasTexture(texture)) {
    throw new Error(`No canvas texture "${key}"`);
  }
  return texture;
}

/**
 * Returns whether a texture is drawn on a canvas of its own, by the context
 * it hands out: this entry is loaded before Phaser can be, so it has no
 * class of Phaser's to test against.
 */
function isCanvasTexture(
  texture: Textures.Texture,
): texture is Textures.CanvasTexture {
  return "getContext" in texture && typeof texture.getContext === "function";
}
