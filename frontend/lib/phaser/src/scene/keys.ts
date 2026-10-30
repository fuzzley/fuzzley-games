import { Input, type Scene } from "phaser";

/** Calls `listener` once for each key the scene's keyboard hears pressed. */
export function onKeyDown(
  scene: Scene,
  listener: (event: KeyboardEvent) => void,
): void {
  onEachKey(scene, Input.Keyboard.Events.ANY_KEY_DOWN, listener);
}

/** Calls `listener` once for each key the scene's keyboard hears let go. */
export function onKeyUp(
  scene: Scene,
  listener: (event: KeyboardEvent) => void,
): void {
  onEachKey(scene, Input.Keyboard.Events.ANY_KEY_UP, listener);
}

/**
 * Calls `listener` once for each key event the scene's keyboard emits under
 * `name`.
 *
 * Phaser hands over every key event of a frame again with each new one in
 * it, and drops only one that repeats the event just before, so a frame of
 * three keys would repeat the first.
 */
function onEachKey(
  scene: Scene,
  name: string,
  listener: (event: KeyboardEvent) => void,
): void {
  const taken = new WeakSet<KeyboardEvent>();
  scene.input.keyboard?.on(name, (event: KeyboardEvent) => {
    if (taken.has(event)) return;
    taken.add(event);
    listener(event);
  });
}
