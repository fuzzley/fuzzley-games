import type { GameObjects, Scene } from "phaser";
import { drawCanvasTexture } from "./canvas_texture";
import { onContextRestored, whenSceneEnds } from "./scene_lifetime";

/** Draws a texture's picture, in its own pixels, from its top left corner. */
export type DrawTexture = (graphics: GameObjects.Graphics) => void;

/** A texture a scene draws at run time, and how. */
interface Bake {
  readonly key: string;
  readonly width: number;
  readonly height: number;
  readonly draw: DrawTexture;
}

/** The textures each scene has baked, by key, to bake again after a lost context. */
const bakes = new WeakMap<Scene, Map<string, Bake>>();

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
  let baked = bakes.get(scene);
  if (!baked) {
    const known = new Map<string, Bake>();
    bakes.set(scene, known);
    onContextRestored(scene, () => {
      for (const bake of known.values()) paint(scene, bake);
    });
    whenSceneEnds(scene, () => {
      bakes.delete(scene);
    });
    baked = known;
  }
  const bake = { key, width, height, draw };
  baked.set(key, bake);
  paint(scene, bake);
}

/** Draws a texture with a throwaway `Graphics` into the canvas texture of its key. */
function paint(scene: Scene, { key, width, height, draw }: Bake): void {
  const graphics = scene.make.graphics({}, false);
  draw(graphics);
  drawCanvasTexture(scene, key, width, height, ({ canvas }) => {
    graphics.generateTexture(canvas, width, height);
  });
  graphics.destroy();
}
