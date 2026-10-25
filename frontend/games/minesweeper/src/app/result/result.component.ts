import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { difficultyName } from "../../game/difficulty";
import { clearedShare, minesFound } from "../../game/field";
import { formatTime } from "../format";
import { GameService } from "../service/game.service";
import { StatsService } from "../service/stats.service";

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows how a game ended, over the board: on a win the time, the lives left
 * and the games won, and on a loss how much of the field was cleared.
 *
 * Closing it leaves the finished board to look at; New Game deals another.
 */
@Component({
  selector: "app-result",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, IconComponent],
  templateUrl: "./result.component.html",
  styleUrl: "./result.component.scss",
})
export class ResultComponent {
  protected readonly game = inject(GameService);
  private readonly stats = inject(StatsService);

  /** Emitted when the player deals a game from the card. */
  readonly played = output();

  protected readonly won = computed(() => this.game.field().outcome === "won");

  protected readonly title = computed(() =>
    this.won() ? "Field cleared!" : "Out of lives",
  );

  /** The line under the title: the field won, or how much of it was cleared. */
  protected readonly subtitle = computed(() => {
    const field = this.game.field();
    if (!this.won()) {
      const share = Math.floor(clearedShare(field) * 100);
      return `You cleared ${share}% of the field.`;
    }
    const { rows, cols, mines } = field.size;
    const name = difficultyName(this.game.difficulty());
    return `${name} · ${rows} × ${cols} · ${mines} mines`;
  });

  protected readonly figures = computed<readonly Figure[]>(() => {
    const field = this.game.field();
    const { played, won, best } = this.stats.stats()[this.game.difficulty()];
    const time = { term: "Time", value: formatTime(this.game.seconds()) };
    const games = { term: "Won", value: `${won} of ${played}` };
    if (this.won()) {
      return [
        time,
        { term: "Lives left", value: `${field.livesLeft} of ${field.lives}` },
        games,
      ];
    }
    return [
      time,
      {
        term: "Mines found",
        value: `${minesFound(field)} of ${field.size.mines}`,
      },
      best === null ? games : { term: "Best", value: formatTime(best) },
    ];
  });

  /** Deals a new game. */
  protected async newGame(): Promise<void> {
    if (await this.game.newGame()) this.played.emit();
  }

  /** Starts the same field again. */
  protected async playAgain(): Promise<void> {
    if (await this.game.restart()) this.played.emit();
  }
}
