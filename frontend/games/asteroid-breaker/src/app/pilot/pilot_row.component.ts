import { Component, input } from "@angular/core";
import type { Pilot } from "../../rules/pilots";
import { PilotComponent } from "./pilot.component";

/**
 * Draws pilots in a row, each the fuzzball it is in its color, and what it
 * is given beside them, such as the words that say how many; the row wraps
 * as its room runs out, unless the page sets `--pilot-row-wrap: nowrap` on
 * it, as the bar does.
 *
 * The pilots are hidden from assistive technology, as each pilot is: what
 * the row is given, or what stands around it, has to say what they stand
 * for.
 */
@Component({
  selector: "app-pilot-row",
  imports: [PilotComponent],
  template: `
    <span class="pilots">
      @for (pilot of pilots(); track $index) {
        <app-pilot [pilot]="pilot" />
      }
    </span>
    <ng-content />
  `,
  styleUrl: "./pilot_row.component.scss",
})
export class PilotRowComponent {
  /** The pilots to draw, in order, by their colors. */
  readonly pilots = input.required<readonly Pilot[]>();
}
