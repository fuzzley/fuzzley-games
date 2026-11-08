import { GameObjects, type Scene } from "phaser";

/**
 * Has every image and sprite of the scene that shows a frame of a texture,
 * in its layers and containers too, set that frame again, so each takes the
 * frame's new size and origin once the texture has been baked again, as
 * `bakeAtlas()` asks.
 *
 * A particle emitter needs nothing: its particles read their frames as they
 * are emitted and drawn.
 */
export function retakeFrames(scene: Scene, key: string): void {
  retakeAmong(scene.children.list, key);
}

/** Has each image and sprite among objects, or in one of them, that shows a frame of a texture set it again. */
function retakeAmong(
  objects: readonly GameObjects.GameObject[],
  key: string,
): void {
  for (const object of objects) {
    if (
      object instanceof GameObjects.Layer ||
      object instanceof GameObjects.Container
    ) {
      retakeAmong(object.list, key);
    } else if (
      (object instanceof GameObjects.Image ||
        object instanceof GameObjects.Sprite) &&
      object.texture.key === key
    ) {
      object.setFrame(object.frame.name);
    }
  }
}
