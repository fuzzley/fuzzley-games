import { Component, input } from "@angular/core";
import type { HelpCatalog } from "./help_entries";

/** Tells one catalog's heading apart from another's on the same page. */
let nextHeading = 0;

/**
 * Shows a catalog of what a game's field can hold, for How to play, as a
 * section its heading names: the heading, what to know first, and each
 * entry's picture beside its name and what it does.
 *
 * The pictures stand in a column of one size, `--fz-help-picture-width` by `--fz-help-picture-height` (48 by 24
 * CSS px unless the app says otherwise), so the words line up whatever
 * each shows and nothing moves as they come in. A picture says nothing to
 * assistive technology: its name beside it does.
 */
@Component({
  selector: "fz-help-catalog",
  templateUrl: "./help_catalog.component.html",
  styleUrl: "./help_catalog.component.scss",
})
export class HelpCatalogComponent {
  readonly catalog = input.required<HelpCatalog>();

  protected readonly headingId = `fz-help-catalog-${String(nextHeading++)}`;
}
