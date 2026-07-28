import {
  Injectable,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { GAME_MODEL, GAME_RULE_OPTIONS } from "../provider/game_model.provider";
import {
  CardBackStyle,
  PresentationSettingsService,
} from "./presentation_settings.service";
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
  private readonly presentation = inject(PresentationSettingsService);
  private readonly rules = inject(GAME_RULE_OPTIONS);
  private readonly destroyRef = inject(DestroyRef);

  // --- Signals bridged from observable game state ---
  readonly score = toSignal(this.gameModel.state.score$, { initialValue: 0 });
  readonly moves = toSignal(this.gameModel.state.moves$, { initialValue: 0 });
  /**
   * The draw mode, or null for a game that has no stock to draw from.
   *
   * A signal fed by the game's own option rather than read off a settings
   * object, because FreeCell has no such setting and must not be assumed to.
   */
  readonly drawCount = signal<number | null>(
    this.rules.drawCount?.current() ?? null,
  );

  /** The draw modes the running game offers, empty when it offers none. */
  readonly drawCountOptions: readonly number[] =
    this.rules.drawCount?.options ?? [];
  readonly cardBack = toSignal(this.presentation.cardBackStyle$, {
    initialValue: "card-back-blue" satisfies CardBackStyle,
  });
  /** The debug board toggle, or null for a game that offers none. */
  readonly almostWin = signal<boolean | null>(
    this.rules.almostWin?.current() ?? null,
  );

  readonly isGameWon = signal(false);
  readonly timerText = this.timer.timerText;

  private readonly undoDepth = toSignal(this.gameModel.state.undoDepth$, {
    initialValue: 0,
  });

  /**
   * Whether there is a move to take back. A won game is excluded: the board is
   * finished, and the victory overlay covers it.
   */
  readonly canUndo = computed(() => this.undoDepth() > 0 && !this.isGameWon());

  constructor() {
    // Follow whichever options the game offers, and none it does not.
    const stopFollowingDraw = this.rules.drawCount?.subscribe((count) =>
      this.drawCount.set(count),
    );
    const stopFollowingAlmostWin = this.rules.almostWin?.subscribe((enabled) =>
      this.almostWin.set(enabled),
    );
    this.destroyRef.onDestroy(() => {
      stopFollowingDraw?.();
      stopFollowingAlmostWin?.();
    });

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

  setDrawMode(mode: number): void {
    const drawCount = this.rules.drawCount;
    if (!drawCount || this.drawCount() === mode) return;

    if (this.moves() === 0) {
      drawCount.set(mode);
    } else {
      this.confirmIfInProgress(
        `Changing the draw mode to Draw ${mode} will restart the game. Are you sure you want to proceed?`,
        () => {
          drawCount.set(mode);
          this.gameModel.startNewGame();
          this.startFreshSession();
        },
      );
    }
  }

  /** Takes back the most recent move, if there is one. */
  undo(): void {
    if (!this.canUndo()) return;
    this.gameModel.undo();
  }

  setCardBack(style: CardBackStyle): void {
    this.presentation.setCardBackStyle(style);
  }

  setAlmostWin(enabled: boolean): void {
    if (!this.rules.almostWin) return;
    this.rules.almostWin.set(enabled);
    if (this.moves() > 0 || this.isGameWon()) {
      this.gameModel.startNewGame();
      this.startFreshSession();
    }
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
