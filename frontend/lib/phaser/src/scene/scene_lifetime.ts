import { Renderer, Scale, type Scene, Scenes } from "phaser";

/**
 * Runs `release` once, when the scene shuts down or is destroyed, whichever
 * comes first.
 *
 * Both, because Phaser destroys a running scene without shutting it down
 * first, whether the scene is removed or the whole game is destroyed.
 */
export function whenSceneEnds(scene: Scene, release: () => void): void {
  const end = (): void => {
    scene.events.off(Scenes.Events.SHUTDOWN, end);
    scene.events.off(Scenes.Events.DESTROY, end);
    release();
  };
  scene.events.once(Scenes.Events.SHUTDOWN, end);
  scene.events.once(Scenes.Events.DESTROY, end);
}

/**
 * Calls `listener` whenever the game's canvas changes size, until the scene
 * ends; the scale manager belongs to the game, which outlives the scene.
 */
export function onScaleResize(scene: Scene, listener: () => void): void {
  scene.scale.on(Scale.Events.RESIZE, listener);
  whenSceneEnds(scene, () => {
    scene.scale.off(Scale.Events.RESIZE, listener);
  });
}

/**
 * Calls `listener` whenever a lost WebGL context is restored, until the scene
 * ends, for the textures Phaser can't restore by itself: those drawn at run
 * time.
 */
export function onContextRestored(scene: Scene, listener: () => void): void {
  // A HEADLESS game has no renderer, and so no context to lose.
  const renderer = scene.renderer as Scene["renderer"] | null;
  if (!renderer) return;
  renderer.on(Renderer.Events.RESTORE_WEBGL, listener);
  whenSceneEnds(scene, () => {
    renderer.off(Renderer.Events.RESTORE_WEBGL, listener);
  });
}

/** Calls `listener` once, after the scene's first frame. */
export function onFirstFrame(scene: Scene, listener: () => void): void {
  scene.events.once(Scenes.Events.POST_UPDATE, listener);
  whenSceneEnds(scene, () => {
    scene.events.off(Scenes.Events.POST_UPDATE, listener);
  });
}

/**
 * Returns the device pixels per CSS pixel the canvas renders at, from the
 * scale manager, so a scene lays itself out by the same ratio Phaser maps the
 * pointer by; 1 before the canvas has been sized.
 */
export function pixelRatioOf(scene: Scene): number {
  const displayScale = scene.scale?.displayScale?.x;
  return displayScale && Number.isFinite(displayScale) ? displayScale : 1;
}
