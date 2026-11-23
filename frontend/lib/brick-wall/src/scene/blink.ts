import { type GameObjects, type Scene, Scenes } from "phaser";
import { blinkShows } from "../view/blink";

/**
 * Blinks a game object in a scene from now, on each of the scene's frames
 * as `blinkShows()` says, but holds it shown on each frame `steady()` reads
 * true, and returns a function that stops the blinking and shows it. The
 * blinking stops by itself as the scene ends.
 *
 * It throws a `RangeError` for a period `blinkShows()` refuses, as it
 * starts, before it blinks anything, steady or not. Stop a target's
 * blinking before blinking it again, or both set whether it shows.
 */
export function blink(
  scene: Scene,
  target: GameObjects.Components.Visible,
  periodMs: number,
  steady: () => boolean,
): () => void {
  const start = scene.time.now;
  // Refuses a period too short before anything listens, steady or not.
  blinkShows(0, periodMs);
  const show = (time: number): void => {
    target.setVisible(steady() || blinkShows(time - start, periodMs));
  };
  // Not `whenSceneEnds()`, which can't be called off: a blinking stopped
  // early lets go of what it listens for, and of its target, then. A scene
  // destroyed without shutting down drops every listener of its events
  // itself.
  const unlisten = (): void => {
    scene.events.off(Scenes.Events.UPDATE, show);
    scene.events.off(Scenes.Events.SHUTDOWN, unlisten);
  };
  show(start);
  scene.events.on(Scenes.Events.UPDATE, show);
  scene.events.once(Scenes.Events.SHUTDOWN, unlisten);
  return () => {
    unlisten();
    target.setVisible(true);
  };
}
