import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
} from "@angular/core";
import { AnnouncerService } from "./announcer.service";

/**
 * How long a region is in the page before it says what was said before any
 * region had rendered, since a screen reader announces a live region's
 * changes, not one that arrives with its words.
 */
export const ARRIVAL_MS = 100;

/**
 * Holds the live region `AnnouncerService` speaks through, out of sight.
 *
 * An app puts one in its root template, so there is a region to speak
 * through whatever is on screen, and one in each modal dialog that speaks
 * while open, since a modal hides the page behind it from a screen reader.
 */
@Component({
  selector: "fz-announcer",
  template: "{{ said() }}",
  host: {
    class: "fz-visually-hidden",
    "aria-live": "polite",
  },
})
export class AnnouncerComponent {
  private readonly announcer = inject(AnnouncerService);

  /** What the region says now: nothing while the words are early. */
  protected readonly said = computed(() =>
    this.announcer.early() ? "" : this.announcer.message(),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.announcer.notePlaced();
      if (!this.announcer.early()) return;
      const timer = setTimeout(() => {
        this.announcer.noteEarlyWordsSaid();
      }, ARRIVAL_MS);
      destroyRef.onDestroy(() => {
        clearTimeout(timer);
      });
    });
  }
}
