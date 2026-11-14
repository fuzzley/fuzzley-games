import { Component, computed, input } from "@angular/core";
import { IconComponent } from "@fz/ui/icon";
import { starAsks } from "../../rules/run/describe";
import { STAR_IDS, type StarId } from "../../rules/run/stars";

/**
 * Shows a level's three stars, one under another, each with what it asks,
 * the third naming the level's mark: a held one lit, a filled star in gold,
 * and one not yet won an outline, its words quieter; one just won marked
 * new; and, beside the streak's star where it isn't held, the best streak
 * of the play, where one is given. Laid `across`, they stand side by side,
 * each over its mark, and what each asks is left to a screen reader.
 *
 * It is a list named "Stars", each star's state said in words a screen
 * reader hears, as the stars and the marks beside them are hidden from it.
 */
@Component({
  selector: "app-stars",
  imports: [IconComponent],
  host: { "[class.across]": "across()" },
  templateUrl: "./stars.component.html",
  styleUrl: "./stars.component.scss",
})
export class StarsComponent {
  /** The stars the level holds. */
  readonly held = input.required<readonly StarId[]>();

  /** The streak the level's third star asks for. */
  readonly mark = input.required<number>();

  /** The stars the play just won that the level didn't hold before, marked new. */
  readonly won = input<readonly StarId[]>([]);

  /** The longest streak of the play, shown beside the streak's star where it isn't held, or null for none. */
  readonly bestStreak = input<number | null>(null);

  /**
   * Whether the stars stand side by side, each over its mark, what each asks
   * heard but not shown, as a Cleared card over a short field lays them,
   * rather than one under another.
   */
  readonly across = input(false);

  /** Each star as the list shows it, in its order. */
  protected readonly stars = computed(() => {
    const held = this.held();
    const won = this.won();
    const best = this.bestStreak();
    return STAR_IDS.map((id) => {
      const isHeld = held.includes(id);
      const isNew = won.includes(id);
      const shownBest =
        id === "streak" && !isHeld && best !== null
          ? `best ${String(best)}`
          : null;
      const state = isNew ? "won just now" : isHeld ? "won" : "not won yet";
      return {
        id,
        held: isHeld,
        isNew,
        icon: isHeld ? ("star" as const) : ("star-outline" as const),
        asks: starAsks(id, this.mark()),
        best: shownBest,
        state: shownBest === null ? state : `${state}, ${shownBest}`,
      };
    });
  });
}
