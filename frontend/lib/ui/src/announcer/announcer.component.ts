import { Component, inject } from "@angular/core";
import { AnnouncerService } from "./announcer.service";

/**
 * Holds the live region `AnnouncerService` speaks through, out of sight.
 *
 * An app puts one in its root template, so there is one region to speak
 * through whatever is on screen.
 */
@Component({
  selector: "fz-announcer",
  template: "{{ announcer.message() }}",
  host: {
    class: "fz-visually-hidden",
    "aria-live": "polite",
  },
})
export class AnnouncerComponent {
  protected readonly announcer = inject(AnnouncerService);
}
