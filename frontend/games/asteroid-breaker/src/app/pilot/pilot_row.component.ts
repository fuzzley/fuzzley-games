import { Component, booleanAttribute, computed, input } from "@angular/core";
import type { FuzzballFace } from "@fz/style/fuzzball";
import type { Pilot } from "../../rules/ship/pilots";
import { PilotComponent } from "./pilot.component";

/**
 * Draws pilots in a row, each the fuzzball it is in its color, smiling as
 * they cheer, then any of the crew knocked loose, then what it is given
 * beside them, such as the words that say how many.
 *
 * The first is ringed in the accent, as the canopy's lit rim rings it,
 * where it is the pilot at the controls (`data-at-controls`); those
 * knocked loose are faded in a dashed ring, wide eyed; cheering pilots hop
 * in turn, a few times, where motion is welcome. The row wraps as its room
 * runs out, unless the page sets `--pilot-row-wrap: nowrap` on it, as the
 * bar does.
 *
 * The pilots are hidden from assistive technology, as each pilot is: what
 * the row is given, or what stands around it, has to say what they stand
 * for.
 */
@Component({
  selector: "app-pilot-row",
  imports: [PilotComponent],
  template: `
    <span class="pilots" [class.cheering]="cheering()">
      @for (pilot of pilots(); track $index) {
        <app-pilot
          [attr.data-at-controls]="piloting() && $first ? '' : null"
          [pilot]="pilot"
          [face]="face()"
        />
      }
      @for (pilot of loose(); track $index) {
        <app-pilot class="loose" [pilot]="pilot" face="eep" />
      }
    </span>
    <ng-content />
  `,
  styleUrl: "./pilot_row.component.scss",
})
export class PilotRowComponent {
  /** The pilots to draw, in order, by their colors. */
  readonly pilots = input.required<readonly Pilot[]>();

  /** The crew knocked loose, drawn after them, the last knocked first. */
  readonly loose = input<readonly Pilot[]>([]);

  /** Whether the first of the pilots is the one at the controls, ringed as in the canopy. */
  readonly piloting = input(false, { transform: booleanAttribute });

  /** Whether the pilots cheer, as the crew does over a cleared wave. */
  readonly cheering = input(false, { transform: booleanAttribute });

  /** The pilots' face: happy as they cheer, else at rest. */
  protected readonly face = computed<FuzzballFace>(() =>
    this.cheering() ? "happy" : "rest",
  );
}
