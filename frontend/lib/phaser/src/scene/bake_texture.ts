import { type GameObjects, type Scene, Textures } from "phaser";
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

/** Draws a texture into its canvas, clearing it first, at its size. */
function paint(scene: Scene, { key, width, height, draw }: Bake): void {
  const textures = scene.textures;
  const existing = textures.exists(key) ? textures.get(key) : null;
  if (existing instanceof Textures.CanvasTexture) {
    existing.setSize(width, height);
    existing.clear();
  } else {
    if (existing) textures.remove(key);
    textures.createCanvas(key, width, height);
  }

  const graphics = scene.make.graphics({}, false);
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}
