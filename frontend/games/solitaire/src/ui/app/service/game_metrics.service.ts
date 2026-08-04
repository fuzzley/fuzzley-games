import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { GameCatalogService } from "./game_catalog.service";
import { TimerService } from "./timer.service";

/**
 * What the game on the table currently reads: score, moves, elapsed time, and
 * whether it has been won.
 *
 * Follows whichever game is on the table rather than binding to one. Picking a
 * different game re-subscribes everything here to it, which is why these are
 * plain signals fed by an effect rather than bridged once from a fixed set of
 * observables.
 *
 * Deliberately read-only from the outside apart from {@link reset}, which is
 * how a lifecycle action says a fresh game has been dealt. Anything that
 * *changes* the game lives in {@link GameLifecycleService}.
 */
@Injectable({ providedIn: "root" })
export class GameMetricsService {
  private readonly catalog = inject(GameCatalogService);
  private readonly timer = inject(TimerService);

  private readonly scoreSignal = signal(0);
  private readonly movesSignal = signal(0);
  private readonly undoDepthSignal = signal(0);
  private readonly wonSignal = signal(false);

  /** The running game's score. */
  readonly score = this.scoreSignal.asReadonly();

  /** How many moves have been made. */
  readonly moves = this.movesSignal.asReadonly();

  /** Whether the board has been cleared. */
  readonly isGameWon = this.wonSignal.asReadonly();

  /** Elapsed time, formatted `mm:ss`. */
  readonly timerText = this.timer.timerText;

  /**
   * Whether a game is under way — moves made, and not yet won.
   *
   * This is the question every destructive action asks before throwing the
   * board away.
   */
  readonly isInProgress = computed(() => this.moves() > 0 && !this.isGameWon());

  /**
   * Whether there is a move to take back. A won game is excluded: the board is
   * finished, and the victory overlay covers it.
   */
  readonly canUndo = computed(
    () => this.undoDepthSignal() > 0 && !this.isGameWon(),
  );

  constructor() {
    // Re-bind everything to whichever game is on the table. Angular runs the
    // cleanup before the next pass, so switching games never leaves a
    // subscription pointing at the game that just left.
    effect((onCleanup) => {
      const { game } = this.catalog.session();

      // Reports the metrics once on subscribe, so switching to a game already
      // in progress shows its score rather than zero.
      const unsubscribe = game.state.onChange((metrics) => {
        this.scoreSignal.set(metrics.score);
        this.movesSignal.set(metrics.moves);
        this.undoDepthSignal.set(metrics.undoDepth);
      });

      const gameWonHandler = () => {
        this.wonSignal.set(true);
        this.timer.stop();
      };
      game.on("game-won", gameWonHandler);

      onCleanup(() => {
        unsubscribe();
        game.off("game-won", gameWonHandler);
      });
    });

    // Auto-start the stopwatch once the first move is made (and not yet won).
    effect(() => {
      if (this.isInProgress() && !this.timer.isRunning) {
        this.timer.start();
      }
    });
  }

  /** Clears the won flag and the stopwatch for a freshly dealt game. */
  reset(): void {
    this.wonSignal.set(false);
    this.timer.reset();
  }
}
