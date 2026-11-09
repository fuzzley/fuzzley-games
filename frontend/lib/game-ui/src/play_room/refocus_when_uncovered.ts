import {
  type Signal,
  afterRenderEffect,
  assertInInjectionContext,
  inject,
  untracked,
} from "@angular/core";
import { DialogService } from "@fz/ui/dialog";

/**
 * Hands a game's board the focus as each run begins and whenever the last
 * dialog over it closes, so the keys steer at once.
 *
 * Every `<fz-dialog>` counts, so a game lists none of its own. It looks only
 * after a render, by which time each dialog has its `open` from its host and
 * has opened or closed: one that closed has handed the focus back to what
 * opened it, so the board takes it after, and one open, as the page loads or
 * as a run begins, keeps it.
 *
 * @param board The board, as `viewChild()` gives it.
 * @param runs Changes as each run begins.
 */
export function refocusWhenUncovered(
  board: Signal<Pick<HTMLElement, "focus">>,
  runs: Signal<number>,
): void {
  assertInInjectionContext(refocusWhenUncovered);
  const dialogs = inject(DialogService);
  // As the page loads, no focus ring: nothing was pressed to put it there. A
  // dialog open then uses up that first look, as a press closes that dialog.
  let first = true;
  afterRenderEffect(() => {
    runs();
    const covered = dialogs.anyOpen();
    const options = first ? { focusVisible: false } : {};
    first = false;
    if (covered) return;
    untracked(() => {
      board().focus(options);
    });
  });
}
