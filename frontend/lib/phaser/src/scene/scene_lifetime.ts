import { Core, Renderer, Scale, type Scene, Scenes } from "phaser";

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
  const renderer = scene.renderer;
  renderer.on(Renderer.Events.RESTORE_WEBGL, listener);
  whenSceneEnds(scene, () => {
    renderer.off(Renderer.Events.RESTORE_WEBGL, listener);
  });
}

/**
 * Calls `listener` whenever the player looks away, until the scene ends: as
 * the window loses the focus, the page is hidden, or the focus leaves the
 * element the game's keyboard listens on for anything outside it, so a scene
 * lets go of a key or a finger it would otherwise hold for good.
 *
 * One look-away may call the listener more than once, since leaving the
 * window takes the focus from the board and then from the window, and
 * leaving the tab hides the page too, so the listener must be safe to repeat.
 */
export function onPlayerAway(scene: Scene, listener: () => void): void {
  const away = (): void => {
    listener();
  };
  // Phaser types the keyboard's target as anything; a game's is its board.
  const listened: unknown = scene.game.input.keyboard?.target;
  const board = listened instanceof HTMLElement ? listened : null;
  const leave = (event: FocusEvent): void => {
    const to = event.relatedTarget;
    if (!(to instanceof Node && board?.contains(to))) away();
  };
  const events = scene.game.events;
  events.on(Core.Events.BLUR, away);
  events.on(Core.Events.HIDDEN, away);
  board?.addEventListener("focusout", leave);
  whenSceneEnds(scene, () => {
    events.off(Core.Events.BLUR, away);
    events.off(Core.Events.HIDDEN, away);
    board?.removeEventListener("focusout", leave);
  });
}

/** Calls `listener` once, after the scene has drawn its first frame. */
export function onFirstFrame(scene: Scene, listener: () => void): void {
  scene.events.once(Scenes.Events.RENDER, listener);
  whenSceneEnds(scene, () => {
    scene.events.off(Scenes.Events.RENDER, listener);
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
