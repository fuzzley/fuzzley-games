import { Component, computed, input } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import { WordmarkComponent } from "@fz/ui/wordmark";

/**
 * Names the edge of its containing block a bar stands against: `start` and
 * `end` stand it down that side as a rail.
 */
export type BarPlacement = "top" | "bottom" | "start" | "end";

/**
 * Names how a bar shows its link home: the wordmark, the round home button,
 * or not at all, for an app that puts the link in its overflow menu instead.
 */
export type BarHome = "wordmark" | "icon" | "none";

/**
 * Frames a game in a header that leads with a link home to Fuzzley Games, then
 * holds the app's title, status and actions.
 *
 * The app marks what it projects with an attribute: `fzBarTitle`,
 * `fzBarStatus`, and `fzBarActions` on each action, which the bar lays out in
 * a row, or in a column on a rail. At the top the bar takes its place in the
 * flow; at the bottom or on a rail it stands against that edge of its
 * containing block, which the app positions.
 */
@Component({
  selector: "fz-game-bar",
  imports: [IconComponent, WordmarkComponent],
  host: { "[attr.data-placement]": "placement()" },
  templateUrl: "./game_bar.component.html",
  styleUrl: "./game_bar.component.scss",
})
export class GameBarComponent {
  /** The edge the bar stands against. */
  readonly placement = input<BarPlacement>("top");

  /**
   * Whether the bar runs from its end to its start, its actions first. A rail
   * ignores it.
   */
  readonly reversed = input(false);

  /** Whether the bar is shorter and tighter, for an app with little room. */
  readonly compact = input(false);

  /** How the bar shows its link home. A rail has room for the button alone. */
  readonly home = input<BarHome>("wordmark");

  /** Where the link home leads. */
  readonly homeHref = input("/");

  protected readonly isRail = computed(
    () => this.placement() === "start" || this.placement() === "end",
  );

  protected readonly shownHome = computed<BarHome>(() =>
    this.isRail() && this.home() === "wordmark" ? "icon" : this.home(),
  );
}
