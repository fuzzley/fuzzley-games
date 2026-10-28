import { Component, computed, inject } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { StatsService } from "../stats/stats.service";

/** Names a speed the card offers a new run at. */
interface SpeedChoice {
  readonly id: Speed;
  readonly name: string;
}

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows an ended run's result over the board: why it ended, its speed, the
 * score, the best at that speed and the snake's length.
 *
 * The game opens it once the crash's fade has run. Closing it leaves the
 * board to look at; New Game starts another run at the same speed, and the
 * other speeds' buttons one at theirs.
 */
@Component({
  selector: "app-result",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./result.component.html",
  styleUrl: "./result.component.scss",
})
export class ResultComponent {
  protected readonly game = inject(GameService);
  private readonly stats = inject(StatsService);

  protected readonly won = computed(() => this.game.outcome() === "won");

  protected readonly title = computed(() =>
    this.won() ? "You filled the board!" : "Game over",
  );

  /** Why the run ended, and at what speed. */
  protected readonly subtitle = computed(() => {
    const run = this.game.run();
    const why = this.won()
      ? "Every square filled"
      : run.crash === "self"
        ? "Ran into itself"
        : "Ran into the wall";
    return `${why}, at ${SPEED_INFO[run.speed].name} speed`;
  });

  /** The speeds besides the one just played, which a new run can be at. */
  protected readonly otherSpeeds = computed<readonly SpeedChoice[]>(() =>
    SPEEDS.filter((id) => id !== this.game.run().speed).map((id) => ({
      id,
      name: SPEED_INFO[id].name,
    })),
  );

  protected readonly figures = computed<readonly Figure[]>(() => {
    const run = this.game.run();
    const { best } = this.stats.stats()[run.speed];
    return [
      { term: "Score", value: String(run.eaten) },
      { term: "Best", value: String(best) },
      { term: "Length", value: String(run.snake.length) },
    ];
  });

  /** Starts a new run at the same speed. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /** Starts a run at another speed, which the settings keep. */
  protected playSpeed(speed: Speed): void {
    void this.game.changeSpeed(speed);
  }
}
