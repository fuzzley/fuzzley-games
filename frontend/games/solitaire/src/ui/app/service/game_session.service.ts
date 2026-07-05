import { Injectable, signal, effect, inject, DestroyRef } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { GAME_MODEL } from "../provider/game_model.provider";
import { TimerService } from "./timer.service";
import { ConfirmationService } from "./confirmation.service";

/**
 * Coordinates a play session: bridges the model's observable state to signals,
 * tracks the won state, drives the stopwatch, and orchestrates the lifecycle
 * actions (restart / new game / draw mode) behind confirmation when a game is
 * in progress.
 */
@Injectable({ providedIn: "root" })
export class GameSessionService {
  private readonly gameModel = inject(GAME_MODEL);
  private readonly timer = inject(TimerService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals bridged from observable game state ---
  readonly score = toSignal(this.gameModel.state.score$, { initialValue: 0 });
  readonly moves = toSignal(this.gameModel.state.moves$, { initialValue: 0 });
  readonly drawCount = toSignal(this.gameModel.settings.drawCount$, {
    initialValue: 3,
  });
  readonly cardBack = toSignal(this.gameModel.settings.cardBackStyle$, {
    initialValue: "card-back-blue" as const,
  });

  readonly isGameWon = signal(false);
  readonly timerText = this.timer.timerText;

  constructor() {
    // Auto-start the stopwatch once the first move is made (and not yet won).
    effect(() => {
      const moves = this.moves();
      const isWon = this.isGameWon();
      if (moves > 0 && !isWon && !this.timer.isRunning) {
        this.timer.start();
      }
    });

    const gameWonHandler = () => {
      this.isGameWon.set(true);
      this.timer.stop();
    };
    this.gameModel.on("game-won", gameWonHandler);
    this.destroyRef.onDestroy(() => {
      this.gameModel.off("game-won", gameWonHandler);
    });
  }

  restartGame(): void {
    this.confirmIfInProgress(
      "Are you sure you want to restart this game? Your current progress will be lost.",
      () => {
        this.gameModel.restartGame();
        this.startFreshSession();
      },
    );
  }

  startNewGame(): void {
    this.confirmIfInProgress(
      "Are you sure you want to start a new game? Your current progress will be lost.",
      () => {
        this.gameModel.startNewGame();
        this.startFreshSession();
      },
    );
  }

  setDrawMode(mode: 1 | 3): void {
    if (this.drawCount() === mode) return;
    this.confirmIfInProgress(
      `Changing the draw mode to Draw ${mode} will restart the game. Are you sure you want to proceed?`,
      () => {
        this.gameModel.setDrawCount(mode);
        this.gameModel.startNewGame();
        this.startFreshSession();
      },
    );
  }

  setCardBack(style: "card-back-blue" | "card-back-red"): void {
    this.gameModel.setCardBackStyle(style);
  }

  /** Resets the won flag and stopwatch for a freshly (re)started game. */
  private startFreshSession(): void {
    this.isGameWon.set(false);
    this.timer.reset();
  }

  /**
   * Runs `action` immediately, or defers it behind a confirmation prompt when a
   * game is actively in progress (moves made and not yet won).
   */
  private confirmIfInProgress(message: string, action: () => void): void {
    if (this.moves() > 0 && !this.isGameWon()) {
      this.confirmation.request(message, action);
    } else {
      action();
    }
  }
}
