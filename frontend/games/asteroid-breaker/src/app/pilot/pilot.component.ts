import { Component, computed, inject, input } from "@angular/core";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { ThemeService } from "@fz/ui/theme";
import type { Pilot } from "../../rules/pilots";
import { pilotInk } from "../../view/palette";

/**
 * Draws a pilot as the fuzzball it is, in its ink in the palette on the
 * page, as the field draws it at the controls and adrift.
 *
 * Its size is the text's, unless `width` and `height` say otherwise. It is
 * hidden from assistive technology: whatever it sits beside has to say what
 * it stands for.
 */
@Component({
  selector: "app-pilot",
  imports: [FuzzballComponent],
  host: {
    "aria-hidden": "true",
    "[style.color]": "ink()",
  },
  template: "<fz-fuzzball />",
  styleUrl: "./pilot.component.scss",
})
export class PilotComponent {
  private readonly theme = inject(ThemeService);

  /** The pilot to draw, by its color. */
  readonly pilot = input.required<Pilot>();

  /** The pilot's ink in the palette's mode, which colors its body and fur. */
  protected readonly ink = computed(() =>
    pilotInk(this.pilot(), this.theme.mode()),
  );
}
