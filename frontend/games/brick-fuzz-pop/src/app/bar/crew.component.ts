import { Component, computed, inject, input } from "@angular/core";
import { cssHex } from "@fz/phaser/color";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { ThemeService } from "@fz/ui/theme";
import { friendInk } from "../../view/colors/inks";

/**
 * Draws a level's crew in a row, as the field draws it: the player's
 * fuzzball in the accent, then each friend in its ink in the palette on the
 * page.
 *
 * Each fuzzball is `--crew-size` across, 1em unless the page sets it. It is
 * hidden from assistive technology: whatever it sits beside has to say what
 * it stands for.
 */
@Component({
  selector: "app-crew",
  imports: [FuzzballComponent],
  host: { "aria-hidden": "true" },
  template: `
    <fz-fuzzball class="own" />
    @for (color of colors(); track $index) {
      <fz-fuzzball [style.color]="color" />
    }
  `,
  styleUrl: "./crew.component.scss",
})
export class CrewComponent {
  private readonly theme = inject(ThemeService);

  /** Each friend's ink, 0 to 7, in the order they were freed: the crew's `friends`. */
  readonly friends = input.required<readonly number[]>();

  /** Each friend's ink in the palette's mode, as CSS. */
  protected readonly colors = computed(() =>
    this.friends().map((ink) => cssHex(friendInk(ink, this.theme.mode()))),
  );
}
