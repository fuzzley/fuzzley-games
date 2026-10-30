import { Input, type Scene } from "phaser";

/** Takes a key event a scene's keyboard heard. */
export type KeyListener = (event: KeyboardEvent) => void;

/**
 * Calls `listener` once for each key pressed on the scene's keyboard, a held
 * key's repeats included, until the scene ends.
 *
 * Phaser holds back the repeats of a key the scene made a `Key` of, such as
 * with `addKey()`, and its own key events hand a frame's earlier keys over
 * again from its third key on.
 */
export function onKeyDown(scene: Scene, listener: KeyListener): void {
  onEachKey(scene, Input.Keyboard.Events.ANY_KEY_DOWN, listener);
}

/**
 * Calls `listener` once for each key let go on the scene's keyboard, until
 * the scene ends.
 *
 * Phaser's own key events hand a frame's earlier keys over again from its
 * third key on.
 */
export function onKeyUp(scene: Scene, listener: KeyListener): void {
  onEachKey(scene, Input.Keyboard.Events.ANY_KEY_UP, listener);
}

/**
 * Calls `listener` once for each key event the scene's keyboard emits under
 * `name`, until the scene ends, as the keyboard lets go of its listeners
 * then.
 *
 * Phaser runs through the frame's whole queue of key events as each new one
 * comes, and drops only an event whose key code, type and time match those
 * of the one it handled before.
 */
function onEachKey(scene: Scene, name: string, listener: KeyListener): void {
  const taken = new WeakSet<KeyboardEvent>();
  scene.input.keyboard?.on(name, (event: KeyboardEvent) => {
    if (taken.has(event)) return;
    taken.add(event);
    listener(event);
  });
}
