import { Component, computed, inject, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { endTitle, formatPoints } from "../../rules/describe";
import { levelsCleared } from "../../rules/run";
import { SPEED_INFO } from "../../rules/speed";
import { GameService } from "../play/game.service";

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows an ended run's result over the board: whether it was lost or won,
 * where and at what speed, the score and the best, with "New best" when it
 * set one, the level reached and the levels cleared.
 *
 * The game opens it once the last ball has faded. A lost run offers to try
 * again from the level it was lost on, and a won one a new game; either may
 * choose a level instead, or close the card to look at the board.
 */
@Component({
  selector: "app-result",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./result.component.html",
  styleUrl: "./result.component.scss",
})
export class ResultComponent {
  protected readonly game = inject(GameService);

  /** Emitted when the player asks for the levels, to start at one. */
  readonly chooseLevel = output();

  protected readonly won = computed(() => this.game.outcome() === "won");

  protected readonly title = computed(() => endTitle(this.game.run()));

  /** Where the run started or ended, and at what speed. */
  protected readonly subtitle = computed(() => {
    const run = this.game.run();
    const where = this.won()
      ? `From level ${String(run.firstLevel)} to the last`
      : `Out of lives on level ${String(run.level)}`;
    return `${where}, at ${SPEED_INFO[run.speed].name} speed`;
  });

  protected readonly figures = computed<readonly Figure[]>(() => {
    const run = this.game.run();
    return [
      { term: "Score", value: formatPoints(run.score) },
      { term: "Best", value: formatPoints(this.game.best()) },
      { term: "Level", value: String(run.level) },
      { term: "Cleared", value: String(levelsCleared(run)) },
    ];
  });

  /** What the card's first button says: a new game after a win, else trying the level again. */
  protected readonly againLabel = computed(() =>
    this.won()
      ? "New game"
      : `Try again from level ${String(this.game.run().level)}`,
  );

  /** Starts a new run after a win, or one at the level a lost run ended on. */
  protected startAgain(): void {
    if (this.won()) {
      void this.game.newGame();
    } else {
      this.game.tryAgain();
    }
  }

  /** Puts the card away, and asks for the levels. */
  protected chooseFromLevels(): void {
    this.game.closeResult();
    this.chooseLevel.emit();
  }
}
