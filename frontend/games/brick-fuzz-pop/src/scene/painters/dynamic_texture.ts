import { type Scene, Textures } from "phaser";

/**
 * Returns the dynamic texture of a key: the one there, which an earlier scene
 * of the game may have made, or a new one, which replaces, and destroys, a
 * texture of another kind of the key.
 */
export function dynamicTexture(
  scene: Scene,
  key: string,
): Textures.DynamicTexture {
  const textures = scene.textures;
  const existing = textures.exists(key) ? textures.get(key) : null;
  if (existing instanceof Textures.DynamicTexture) return existing;
  if (existing) textures.remove(key);
  const made = textures.addDynamicTexture(key, 2, 2);
  if (!made) throw new Error(`The texture "${key}" could not be made.`);
  return made;
}
