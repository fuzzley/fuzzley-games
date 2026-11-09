import type { Scene } from "phaser";

/**
 * Holds a string in place of each of `T`'s strings, in records and lists of
 * the same keys, nested as deep.
 */
export type Pictured<T> = {
  readonly [K in keyof T]: T[K] extends object ? Pictured<T[K]> : string;
};

/**
 * Returns a picture of each frame of a texture that `frames` names, as a
 * `data:` URL of the frame as the texture now holds it, in the same records
 * and lists the names are, for a page to show beside the canvas, as How to
 * play does.
 *
 * It encodes every frame it names, each time it is called: a PNG of each,
 * drawn from the texture's source.
 */
export function picturesOf<T extends Pictured<T>>(
  scene: Scene,
  key: string,
  frames: T,
): Pictured<T> {
  // A walk over records and lists keeps their keys and their nesting, which
  // its type can't follow.
  return mapNames(frames, (frame) =>
    scene.textures.getBase64(key, frame),
  ) as Pictured<T>;
}

/**
 * Returns a function that pictures the frames `frames` names, as
 * `picturesOf()` does, as it is first called, and returns those same
 * pictures after, so a scene can hand one over at each bake and the frames
 * are encoded only if a page shows them.
 */
export function picturesWhenAsked<T extends Pictured<T>>(
  scene: Scene,
  key: string,
  frames: T,
): () => Pictured<T> {
  let pictures: Pictured<T> | null = null;
  return () => (pictures ??= picturesOf(scene, key, frames));
}

/** Returns names, alone or nested in records and lists, each mapped to another string. */
function mapNames(names: unknown, map: (name: string) => string): unknown {
  if (typeof names === "string") return map(names);
  if (Array.isArray(names)) {
    return names.map((name: unknown) => mapNames(name, map));
  }
  return Object.fromEntries(
    Object.entries(names as object).map(([name, value]) => [
      name,
      mapNames(value, map),
    ]),
  );
}
