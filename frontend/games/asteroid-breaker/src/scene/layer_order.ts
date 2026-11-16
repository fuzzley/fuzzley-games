import { whenSceneEnds } from "@fz/phaser/scene";
import { type GameObjects, type Scene, Scenes } from "phaser";

/** A game object a layer can order by its depth. */
type Ordered = GameObjects.GameObject & GameObjects.Components.Depth;

/** How far a kept layer's depths reach: the front's, the last to join it, and the back's, the last sent there. */
interface Reach {
  front: number;
  back: number;
}

/** The reach of each layer whose order is kept, by the layer. */
const reaches = new WeakMap<
  GameObjects.DisplayList | GameObjects.Layer,
  Reach
>();

/** The layer each object joined first, of those whose order is kept. */
const joinedTo = new WeakMap<
  Ordered,
  GameObjects.DisplayList | GameObjects.Layer
>();

/**
 * Returns the list a game object lies in, the scene's or a layer, or null
 * out of every list, which Phaser's types leave out.
 */
export function listOf(
  object: GameObjects.GameObject,
): GameObjects.DisplayList | GameObjects.Layer | null {
  return object.displayList;
}

/** Returns whether a game object has a depth, which a layer orders its children by. */
function hasDepth(object: GameObjects.GameObject): object is Ordered {
  return "setDepth" in object;
}

/**
 * Has each of a scene's layers keep its children in the order they first
 * joined it, however often one leaves it and joins it again: each takes,
 * as it first joins its layer, its place among all that layer has held as
 * its depth, which Phaser sorts a layer's children by before it draws
 * them. So a painter may take what it hides out of its layer, which
 * Phaser's render then never passes over, and put it back as it shows, in
 * its place (`Copies`). One sent to its layer's back (`sendToBack()`)
 * keeps that place too.
 *
 * It returns every object the layers have held, in them or out of them,
 * and, as the scene ends, destroys those out of their layer then, which
 * Phaser, destroying only what its display lists hold, would not.
 */
export function keepJoinOrder(
  scene: Scene,
  layers: readonly GameObjects.Layer[],
): ReadonlySet<GameObjects.GameObject> {
  for (const layer of layers) reaches.set(layer, { front: 0, back: 0 });
  const placed = new Set<Ordered>();
  const join = (object: GameObjects.GameObject): void => {
    const layer = listOf(object);
    if (!layer || !hasDepth(object) || placed.has(object)) return;
    const reach = reaches.get(layer);
    if (!reach) return;
    placed.add(object);
    joinedTo.set(object, layer);
    reach.front += 1;
    object.setDepth(reach.front);
  };
  scene.events.on(Scenes.Events.ADDED_TO_SCENE, join);
  whenSceneEnds(scene, () => {
    scene.events.off(Scenes.Events.ADDED_TO_SCENE, join);
    for (const object of placed) {
      if (!listOf(object)) object.destroy();
    }
  });
  return placed;
}

/**
 * Puts objects that have joined a layer whose order is kept under all it
 * has held, each under the one before it, as the layer's own
 * `sendToBack()` would one at a time, keeping that place however often
 * each leaves the layer and joins it again.
 */
export function sendToBack(
  layer: GameObjects.Layer,
  objects: readonly Ordered[],
): void {
  const reach = reaches.get(layer);
  if (!reach) {
    throw new Error(
      "The layer keeps no order to send to the back of (keepJoinOrder()).",
    );
  }
  for (const object of objects) {
    if (joinedTo.get(object) !== layer) {
      throw new Error("Only what has joined a layer is sent to its back.");
    }
    reach.back -= 1;
    object.setDepth(reach.back);
  }
}
