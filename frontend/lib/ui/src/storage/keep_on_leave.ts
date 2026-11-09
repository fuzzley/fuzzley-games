import { DOCUMENT } from "@angular/common";
import { DestroyRef, assertInInjectionContext, inject } from "@angular/core";

/**
 * Calls `save` as the page is hidden and as it goes away, until the injector
 * it was called in is destroyed.
 *
 * It must be called in an injection context. A page hidden first, as a phone
 * hides a tab it may then drop, draws no frame for an effect to save in, nor
 * may it see `pagehide`, so both are listened to.
 */
export function keepOnLeave(save: () => void): void {
  assertInInjectionContext(keepOnLeave);
  const document = inject(DOCUMENT);
  const view = document.defaultView;
  const saveHidden = (): void => {
    if (document.visibilityState === "hidden") save();
  };
  const saveGone = (): void => {
    save();
  };
  document.addEventListener("visibilitychange", saveHidden);
  view?.addEventListener("pagehide", saveGone);
  inject(DestroyRef).onDestroy(() => {
    document.removeEventListener("visibilitychange", saveHidden);
    view?.removeEventListener("pagehide", saveGone);
  });
}
