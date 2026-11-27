import { Component, computed, inject, input, output } from "@angular/core";
import {
  type HelpCatalog,
  HelpCatalogComponent,
} from "@fz/game-ui/help_catalog";
import { HelpDialogComponent } from "@fz/game-ui/help_dialog";
import { MOST_STARS } from "../../rules/run/stars";
import { MOST_ENCORE_MOVES } from "../../rules/tuning";
import type { Pictures } from "../../scene/pictures";
import { GAME_LEVELS } from "../tokens";
import { BUNCHES, PAIRS, specialEntries } from "./specials";
import { thingEntries } from "./things";

/**
 * Shows How to play: the goal, a swap and what it does, and how a level
 * ends; the controls, a swap by a swipe, by 2 taps or by keys; what each
 * bunch leaves; the special fuzzballs, each with its picture once the
 * scene has drawn it, and what each pair of them does; the goals; the
 * stars and the moves to spare; the deals; and each thing on a board, with
 * its picture.
 */
@Component({
  selector: "app-help",
  imports: [HelpCatalogComponent, HelpDialogComponent],
  templateUrl: "./help.component.html",
  styleUrl: "./help.component.scss",
})
export class HelpComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** The pictures of the pieces, or null before the scene has drawn them. */
  readonly pictures = input<Pictures | null>(null);

  /** Emitted when the dialog asks to close. */
  readonly closed = output();

  protected readonly bunches = BUNCHES;

  protected readonly pairs = PAIRS;

  protected readonly mostStars = MOST_STARS;

  protected readonly mostEncoreMoves = MOST_ENCORE_MOVES;

  /** How many deals each level has: the fewest any has, as the levels' rules give every level as many. */
  protected readonly deals = Math.min(
    ...inject(GAME_LEVELS).map(({ data }) => data.deals.length),
  );

  protected readonly specials = computed<HelpCatalog>(() => ({
    id: "specials",
    heading: "Special fuzzballs",
    intro:
      "Swap a special with any neighbor to set it off, even with no bunch. If a bunch takes it in or another special reaches it, it goes off too.",
    entries: specialEntries(this.pictures()),
  }));

  protected readonly things = computed<HelpCatalog>(() => ({
    id: "things",
    heading: "On the board",
    intro: null,
    entries: thingEntries(this.pictures()),
  }));
}
