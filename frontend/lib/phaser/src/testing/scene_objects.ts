import type { GameObjects, Scene } from "phaser";

/** Returns how many game objects a scene holds, its layers and theirs too, however deep. */
export function objectsIn(scene: Scene): number {
  return everyObjectIn(scene.children.getChildren()).length;
}

/** Returns every image a scene holds, those in its layers too, however deep. */
export function imagesIn(scene: Scene): readonly GameObjects.Image[] {
  return everyObjectIn(scene.children.getChildren()).filter(
    (object): object is GameObjects.Image => object.type === "Image",
  );
}

/** Returns game objects, each layer among them followed by what it holds. */
function everyObjectIn(
  objects: readonly GameObjects.GameObject[],
): readonly GameObjects.GameObject[] {
  return objects.flatMap((object) =>
    isLayer(object)
      ? [object, ...everyObjectIn(object.getChildren())]
      : [object],
  );
}

/**
 * Returns whether a game object is a layer, which holds others, by its type:
 * this entry is loaded before Phaser can be, so it has no class of Phaser's
 * to test against.
 */
function isLayer(object: GameObjects.GameObject): object is GameObjects.Layer {
  return object.type === "Layer";
}
