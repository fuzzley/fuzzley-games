import type { Scene } from "phaser";

/**
 * Puts a sound sprite in a scene's audio cache under its key, as a load that
 * worked would, so a `SpritePlayer` given that key plays its sounds: the
 * headless game decodes no audio, so no load of a spec's ever fills it.
 */
export function cacheSounds(scene: Scene, key: string): void {
  scene.cache.audio.add(key, {});
}
