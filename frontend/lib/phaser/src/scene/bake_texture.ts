import type { GameObjects, Scene } from "phaser";
import { drawCanvasTexture } from "./canvas_texture";
import { onContextRestored, whenSceneEnds } from "./scene_lifetime";

/** Draws a texture's picture, in its own pixels, from its top left corner. */
export type DrawTexture = (graphics: GameObjects.Graphics) => void;

/** How each scene draws each texture it drew at run time, by key, to draw it again after a lost context. */
const drawings = new WeakMap<Scene, Map<string, () => void>>();

/**
 * Draws a texture once, with a throwaway `Graphics`, into a canvas texture of
 * its key, drawing over the one already there, so whatever shows it keeps
 * showing it; and draws it again whenever a lost WebGL context is restored.
 */
export function bakeTexture(
  scene: Scene,
  key: string,
  width: number,
  height: number,
  draw: DrawTexture,
): void {
  keepDrawn(scene, key, () => {
    const graphics = scene.make.graphics({}, false);
    draw(graphics);
    drawCanvasTexture(scene, key, width, height, ({ canvas }) => {
      graphics.generateTexture(canvas, width, height);
    });
    graphics.destroy();
  });
}

/**
 * Draws the texture of a key now, and again whenever a lost WebGL context,
 * which Phaser restores only for the textures it loaded, is restored, until
 * the scene ends or another `bakeTexture()`, `bakeAtlas()` or
 * `paintTexture()` draws the key: a key is drawn again the last way one of
 * them drew it, and a drawing that throws is not kept.
 */
export function keepDrawn(scene: Scene, key: string, draw: () => void): void {
  let kept = drawings.get(scene);
  if (!kept) {
    const known = new Map<string, () => void>();
    drawings.set(scene, known);
    onContextRestored(scene, () => {
      for (const again of known.values()) again();
    });
    whenSceneEnds(scene, () => {
      drawings.delete(scene);
    });
    kept = known;
  }
  draw();
  kept.set(key, draw);
}
