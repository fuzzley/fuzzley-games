import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from "@angular/core";
import { AnnouncerService } from "./announcer.service";

/**
 * How long the region is in the page before it says what was said before it
 * was, since a screen reader announces a live region's changes, not one that
 * arrives with its words.
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

  /** Whether it says what the service says yet, which waits if words came before it. */
  private readonly speaking = signal(this.announcer.message() === "");

  /** What the region says now. */
  protected readonly said = computed(() =>
    this.speaking() ? this.announcer.message() : "",
  );

  constructor() {
    if (this.speaking()) return;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setTimeout(() => {
        this.speaking.set(true);
      }, ARRIVAL_MS);
      destroyRef.onDestroy(() => {
        clearTimeout(timer);
      });
    });
  }
}
