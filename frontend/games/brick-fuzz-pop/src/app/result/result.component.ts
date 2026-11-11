import { Component, computed, input, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { isShortcut } from "@fz/core/keys";
import type { RunStage } from "@fz/core/run";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { endTitle } from "../../rules/run/describe";
import { tryAgainLabel, whereLost } from "./end_words";

/** Describes how a run ended, as the result card shows it. */
export interface RunEnd {
  /** Whether a level was lost (`"over"`), or the last level cleared, as the run's lifecycle names its end. */
  readonly outcome: Extract<RunStage, "over" | "won">;
  /** The level it started on. */
  readonly firstLevel: number;
  /** The level it was lost on, or the last. */
  readonly level: number;
  /** That level's name. */
  readonly levelName: string;
  readonly score: number;
  /** How many levels it cleared. */
  readonly cleared: number;
  /** How many stars its levels earned. */
  readonly stars: number;
}

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows an ended run's result over the board: whether a level was lost or
 * every level cleared, where, the score and the best, with "New best" when
 * it set one, and the levels and stars it earned.
 *
 * The board opens it once the wall has settled and its card's wait is over.
 * A lost run offers to try the level again, and a won one a new game;
 * either may choose a level instead, or close the card to look at the
 * board. Each choice is handed on, for the board to act on and close it.
 */
@Component({
  selector: "app-result",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./result.component.html",
  styleUrl: "./result.component.scss",
})
export class ResultComponent {
  /** Whether the card is showing. */
  readonly open = input.required<boolean>();

  /** How the run ended. */
  readonly end = input.required<RunEnd>();

  /** The best run's score, this one's among them. */
  readonly best = input.required<number>();

  /** Whether this run set the best. */
  readonly newBest = input.required<boolean>();

  /** Emitted when the player asks to try the lost level again. */
  readonly tryAgain = output();

  /** Emitted when the player asks for a new game, after every level is cleared. */
  readonly newGame = output();

  /** Emitted when the player asks for the levels, to start at one. */
  readonly chooseLevel = output();

  /** Emitted when the card asks to close, to look at the board. */
  readonly closed = output();

  protected readonly won = computed(() => this.end().outcome === "won");

  /** Whether the card shows the trophy: for a new best, or every level cleared. */
  protected readonly trophy = computed(() => this.newBest() || this.won());

  protected readonly title = computed(() => endTitle(this.end()));

  /** Where the run ended, or where it started once it won. */
  protected readonly subtitle = computed(() => {
    const { firstLevel, level, levelName } = this.end();
    return this.won()
      ? `From level ${String(firstLevel)} to the last`
      : whereLost(level, levelName);
  });

  protected readonly figures = computed<readonly Figure[]>(() => {
    const { score, cleared, stars } = this.end();
    return [
      { term: "Score", value: formatPoints(score) },
      { term: "Best", value: formatPoints(this.best()) },
      { term: "Cleared", value: String(cleared) },
      { term: "Stars", value: String(stars) },
    ];
  });

  /** What the card's first button says: a new game after a win, else trying the level again. */
  protected readonly againLabel = computed(() =>
    this.won() ? "New game" : tryAgainLabel(this.end().level),
  );

  /**
   * Takes Enter on the title, which the card opens on, as a press of the
   * card's first button.
   *
   * A repeat presses nothing, so an Enter held from before the card opened
   * doesn't start again, and Enter with Ctrl, Alt or Meta is left to the
   * browser.
   */
  protected startAgainAtEnter(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.repeat || isShortcut(event)) return;
    this.startAgain();
  }

  /** Asks for a new game after a win, or to try the lost level again. */
  protected startAgain(): void {
    if (this.won()) {
      this.newGame.emit();
    } else {
      this.tryAgain.emit();
    }
  }
}
