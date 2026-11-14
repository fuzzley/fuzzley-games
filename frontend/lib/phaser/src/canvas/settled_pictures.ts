import { DestroyRef, assertInInjectionContext, inject } from "@angular/core";

/**
 * How long a scene's atlas must stay as it was last baked before the
 * pictures of it are handed on, in milliseconds: a resize under way bakes
 * it again at each new unit, and each picture handed on is encoded again.
 */
export const PICTURES_SETTLE_MS = 250;

/**
 * Returns what a board hands the pictures of each bake of its scene's atlas
 * to, which hands them on to `hand`: the first at once, and each later one
 * only once no other has come for {@link PICTURES_SETTLE_MS}, so a resize
 * under way, which bakes the atlas at each new unit, has nothing encoded
 * until it stops.
 *
 * Call it in an injection context, as a component's field initializer is;
 * a later bake still waiting is let go as that context is destroyed.
 */
export function settledPictures<T>(
  hand: (pictures: T) => void,
): (pictures: T) => void {
  assertInInjectionContext(settledPictures);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let handed = false;
  inject(DestroyRef).onDestroy(() => {
    clearTimeout(timer);
  });
  return (pictures) => {
    clearTimeout(timer);
    if (!handed) {
      handed = true;
      hand(pictures);
      return;
    }
    timer = setTimeout(() => {
      hand(pictures);
    }, PICTURES_SETTLE_MS);
  };
}
