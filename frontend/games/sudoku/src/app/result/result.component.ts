import { DOCUMENT } from "@angular/common";
import { Component, computed, effect, inject, signal } from "@angular/core";
import { formatClock } from "@fz/game-ui/stopwatch";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { LEVELS, LEVEL_INFO, type Level } from "../../rules/difficulty";
import { count } from "../../rules/format";
import { GameService } from "../play/game.service";
import { StatsService } from "../stats/stats.service";

/**
 * How long the board's wave runs once a puzzle is solved, in milliseconds,
 * before the card opens over it: the last square's delay and its animation
 * (board.component.scss).
 */
const WAVE_MS = 1300;

/** Names a level the card offers a new game at. */
interface LevelChoice {
  readonly id: Level;
  readonly name: string;
}

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
 * another at the same level, and the other levels' buttons one at theirs.
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
  private readonly document = inject(DOCUMENT);

  /** Whether the card shows, which trails the game's word by the wave. */
  protected readonly open = signal(false);

  protected readonly level = computed(() => LEVEL_INFO[this.game.level()].name);

  /** The levels besides the one just played, which a new game can be at. */
  protected readonly otherLevels = computed<readonly LevelChoice[]>(() =>
    LEVELS.filter((id) => id !== this.game.level()).map((id) => ({
      id,
      name: LEVEL_INFO[id].name,
    })),
  );

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

  /**
   * Says why the puzzle set no best time: it was solved before, or with
   * hints.
   */
  protected readonly note = computed(() => {
    if (this.game.replay()) return "Solved before, so not counted again.";
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
      const timer = setTimeout(() => {
        this.open.set(true);
      }, this.waveMs());
      onCleanup(() => {
        clearTimeout(timer);
      });
    });
  }

  /** Deals a new game. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /** Deals a new game at another level, which the settings keep. */
  protected playLevel(level: Level): void {
    void this.game.changeLevel(level);
  }

  /**
   * Returns how long the wave runs: none where the player prefers less
   * motion, or where the browser can't be asked.
   */
  private waveMs(): number {
    // jsdom, which the specs run in, has no matchMedia.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const query = this.document.defaultView?.matchMedia?.(
      "(prefers-reduced-motion: no-preference)",
    );
    return query?.matches ? WAVE_MS : 0;
  }
}
