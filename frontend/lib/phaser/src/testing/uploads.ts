import type { Scene } from "phaser";
import { onTestFinished, vi } from "vitest";

/**
 * Hands a function each canvas the game uploads to the GPU from now on, as it
 * uploads it, until the test finishes.
 *
 * @throws {Error} Where the game has no WebGL renderer, or its uploads are
 *   watched already.
 */
export function watchUploads(
  scene: Scene,
  uploaded: (canvas: HTMLCanvasElement) => void,
): void {
  const renderer = scene.game.renderer;
  if (!("canvasToTexture" in renderer)) throw new Error("No WebGL renderer");
  // Vitest would hand back the spy already there, which would call itself.
  if (vi.isMockFunction(Reflect.get(renderer, "canvasToTexture"))) {
    throw new Error(
      "The game's uploads are watched already: watch them once a test.",
    );
  }
  const upload = renderer.canvasToTexture.bind(renderer);
  const spy = vi
    .spyOn(renderer, "canvasToTexture")
    .mockImplementation((canvas, ...rest) => {
      uploaded(canvas);
      return upload(canvas, ...rest);
    });
  onTestFinished(() => {
    spy.mockRestore();
  });
}
