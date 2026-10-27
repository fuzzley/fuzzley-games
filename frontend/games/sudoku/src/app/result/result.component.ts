import {
  Component,
  computed,
  effect,
  inject,
  output,
  signal,
} from "@angular/core";
import { formatClock } from "@fz/game-ui/stopwatch";
import { GameViewportService } from "@fz/game-ui/viewport";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { LEVEL_INFO } from "../../rules/difficulty";
import { count } from "../../rules/format";
import { WAVE_MS } from "../board/board_view";
import { GameService } from "../play/game.service";
import { StatsService } from "../stats/stats.service";

/** Names one figure on the card, and gives its value. */
interface Figure {
  readonly term: string;
  readonly value: string;
}

/**
 * Shows a solved puzzle's result over the board: the level, the time, the
 * best time or the hints used, and the puzzles solved.
 *
 * It opens once the board's wave has run, at once where motion is
 * unwelcome. Closing it leaves the solved board to look at; New Game deals
 * another.
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
  private readonly viewport = inject(GameViewportService);

  /** Emitted when the player deals a game from the card. */
  readonly played = output();

  /** Whether the card shows, which trails the game's word by the wave. */
  protected readonly open = signal(false);

  protected readonly level = computed(() => LEVEL_INFO[this.game.level()].name);

  protected readonly figures = computed<readonly Figure[]>(() => {
    const level = this.game.level();
    const { hints } = this.game.grid();
    const { played, solved, best } = this.stats.stats()[level];
    return [
      { term: "Time", value: formatClock(this.game.seconds()) },
      hints > 0
        ? { term: "Hints", value: String(hints) }
        : { term: "Best", value: best === null ? "–" : formatClock(best) },
      { term: "Solved", value: `${solved} of ${played}` },
    ];
  });

  /** Says why a puzzle solved with hints set no best time. */
  protected readonly note = computed(() => {
    const { hints } = this.game.grid();
    return hints > 0
      ? `Solved with ${count(hints, "hint", "hints")}, so no best time.`
      : null;
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.game.resultOpen()) {
        this.open.set(false);
        return;
      }
      // The wave runs only where motion is welcome, as the board's styles say.
      const wave = this.viewport.allowsMotion() ? WAVE_MS : 0;
      const timer = setTimeout(() => {
        this.open.set(true);
      }, wave);
      onCleanup(() => {
        clearTimeout(timer);
      });
    });
  }

  /** Deals a new game. */
  protected async newGame(): Promise<void> {
    if (await this.game.newGame()) this.played.emit();
  }
}
