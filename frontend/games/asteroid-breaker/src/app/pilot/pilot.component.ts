import { Component, computed, inject, input } from "@angular/core";
import type { FuzzballFace } from "@fz/style/fuzzball";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { ThemeService } from "@fz/ui/theme";
import type { Pilot } from "../../rules/ship/pilots";
import { pilotInk } from "../../view/colors/palette";

/**
 * Draws a pilot as the fuzzball it is, in its ink in the palette on the
 * page, as the field draws it at the controls and adrift, at rest unless
 * given another `face`, its fur lifted by static's `lift`.
 *
 * Its size is the text's, unless `width` and `height` say otherwise; lifted
 * fur reaches past it, as `<fz-fuzzball>`'s does. It is hidden from
 * assistive technology: whatever it sits beside has to say what it stands
 * for.
 */
@Component({
  selector: "app-pilot",
  imports: [FuzzballComponent],
  host: {
    "aria-hidden": "true",
    "[style.color]": "ink()",
  },
  template: '<fz-fuzzball [face]="face()" [lift]="lift()" />',
  styleUrl: "./pilot.component.scss",
})
export class PilotComponent {
  private readonly theme = inject(ThemeService);

  /** The pilot to draw, by its color. */
  readonly pilot = input.required<Pilot>();

  /** Its face, at rest unless another is given. */
  readonly face = input<FuzzballFace>("rest");

  /** Static's step, from 0, its fur flat, to 3, on end and sparking. */
  readonly lift = input(0);

  /** The pilot's ink in the palette's mode, which colors its body and fur. */
  protected readonly ink = computed(() =>
    pilotInk(this.pilot(), this.theme.mode()),
  );
}
