import { CANVAS, Display, type Scene, Textures } from "phaser";

/** Draws on a canvas texture's canvas, through the context the texture draws with. */
export type DrawCanvas = (context: CanvasRenderingContext2D) => void;

/**
 * How a canvas texture asks its canvas for its context, which the canvas
 * keeps, so what is drawn before the texture is made draws as it would after.
 */
const TEXTURE_CONTEXT: CanvasRenderingContext2DSettings = {
  willReadFrequently: true,
};

/**
 * Draws the canvas texture of a key anew at a size, and returns it, uploaded
 * once, drawn: the one there, cleared at the size, so whatever shows it keeps
 * showing it, or a new one on a canvas of Phaser's pool, drawn before it is
 * made, since making one uploads its canvas.
 *
 * `draw` touches nothing but its context, which this saves before it and
 * restores after. A `Graphics` draws there with
 * `generateTexture(context.canvas, width, height)`: its `generateTexture()`
 * of the key would upload the texture again, as the texture's `refresh()`
 * would, and on a first drawing, where the key has no texture yet, make one
 * of its own, for which this throws.
 *
 * @throws {Error} Where Phaser refuses the key, or `draw` makes a texture of
 *   it.
 */
export function drawCanvasTexture(
  scene: Scene,
  key: string,
  width: number,
  height: number,
  draw: DrawCanvas,
): Textures.CanvasTexture {
  const textures = scene.textures;
  const existing = textures.exists(key) ? textures.get(key) : null;
  if (existing instanceof Textures.CanvasTexture) {
    clearAtSize(existing, width, height);
    drawRestoring(existing.getContext(), draw);
    return existing.refresh();
  }
  if (existing) textures.remove(key);
  if (!textures.checkKey(key)) {
    throw new Error(`The texture "${key}" could not be made.`);
  }
  const { CanvasPool } = Display.Canvas;
  // Its own parent, as `createCanvas()` takes one, so only its texture frees it.
  const canvas = CanvasPool.create(textures, width, height, CANVAS, true);
  try {
    const context = canvas.getContext("2d", TEXTURE_CONTEXT);
    if (!context) throw new Error(`No context to draw "${key}" with.`);
    drawRestoring(context, draw);
    if (textures.exists(key)) {
      throw new Error(
        `Drawing the texture "${key}" made one of its own: draw on the ` +
          "context's canvas alone, as a Graphics does with " +
          "generateTexture(context.canvas, width, height).",
      );
    }
  } catch (error) {
    CanvasPool.remove(canvas);
    throw error;
  }
  const made = textures.addCanvas(key, canvas);
  if (!made) {
    CanvasPool.remove(canvas);
    throw new Error(`The texture "${key}" could not be made.`);
  }
  return made;
}

/**
 * Draws through a context, restoring after what the drawing set, such as a
 * transform or a clip, which a clear of the whole canvas would follow.
 */
function drawRestoring(
  context: CanvasRenderingContext2D,
  draw: DrawCanvas,
): void {
  context.save();
  try {
    draw(context);
  } finally {
    context.restore();
  }
}

/**
 * Clears a canvas texture at a size, as its `setSize()` and `clear()` would,
 * without the uploads and the read-back they make of the blank canvas.
 */
function clearAtSize(
  texture: Textures.CanvasTexture,
  width: number,
  height: number,
): void {
  if (width === texture.width && height === texture.height) {
    texture.clear(0, 0, width, height, false);
    return;
  }
  // Sizing a canvas clears it.
  const canvas = texture.getCanvas();
  canvas.width = width;
  canvas.height = height;
  const base = texture.get("__BASE");
  base.source.updateSize(width, height);
  base.setSize(width, height);
  // Phaser types the texture's size read-only, for `setSize()` to write.
  const size: { width: number; height: number } = texture;
  size.width = width;
  size.height = height;
}
