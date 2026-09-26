import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { GameCatalogService } from "./game_catalog.service";
import { TimerService } from "./timer.service";

/**
 * Reads out the game on the table: its score, moves, elapsed time, and whether
 * it has been won.
 *
 * Anything that changes the game belongs in {@link GameLifecycleService}.
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

  /** Whether a game is under way: moves made, and not yet won. */
  readonly isInProgress = computed(() => this.moves() > 0 && !this.isGameWon());

  /** Whether there is a move to take back, which a won game never has. */
  readonly canUndo = computed(
    () => this.undoDepthSignal() > 0 && !this.isGameWon(),
  );

  constructor() {
    // Follow whichever game is on the table; the cleanup lets go of the last.
    // A new game and a new deal both reset the readings here, rather than
    // waiting to be told, because the router can put a game on the table
    // without going through GameLifecycleService.
    effect((onCleanup) => {
      const { game } = this.catalog.session();

      const unsubscribe = game.state.onChange((metrics) => {
        this.scoreSignal.set(metrics.score);
        this.movesSignal.set(metrics.moves);
        this.undoDepthSignal.set(metrics.undoDepth);
      });
      // After the subscription, so the reset reads this game's moves.
      this.reset();

      const gameWonHandler = () => {
        this.wonSignal.set(true);
        this.timer.stop();
      };
      const gameResetHandler = () => this.reset();
      game.on("game-won", gameWonHandler);
      game.on("game-reset", gameResetHandler);

      onCleanup(() => {
        unsubscribe();
        game.off("game-won", gameWonHandler);
        game.off("game-reset", gameResetHandler);
      });
    });

    effect(() => {
      if (this.isInProgress() && !this.timer.isRunning) {
        this.timer.start();
      }
    });
  }

  /**
   * Clears the won flag and the stopwatch for a game just put on the table,
   * starting the stopwatch at once for one restored part-way through.
   */
  private reset(): void {
    // Untracked, so the effect that calls this does not re-run on every move.
    untracked(() => {
      this.wonSignal.set(false);
      this.timer.reset();
      if (this.isInProgress()) this.timer.start();
    });
  }
}
