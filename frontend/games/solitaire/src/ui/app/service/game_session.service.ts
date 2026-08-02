import { Injectable, signal, computed, effect, inject } from "@angular/core";
import { PlayableGame } from "@/engine/tableau/playable_game";
import { CatalogEntry, GameOptionSpec } from "../provider/game_catalog";
import { GameCatalogService } from "./game_catalog.service";
import {
  CardBackStyle,
  PresentationSettingsService,
} from "./presentation_settings.service";
import { TimerService } from "./timer.service";
import { ConfirmationService } from "./confirmation.service";

/**
 * Coordinates a play session: bridges the running game's observable state to
 * signals, tracks the won state, drives the stopwatch, and orchestrates the
 * lifecycle actions behind confirmation when a game is in progress.
 *
 * Follows whichever game is on the table rather than binding to one. Picking a
 * different game re-subscribes everything here to it, which is why the metrics
 * are plain signals fed by an effect instead of bridged once from a fixed set
 * of observables.
 */
@Injectable({ providedIn: "root" })
export class GameSessionService {
  private readonly catalog = inject(GameCatalogService);
  private readonly timer = inject(TimerService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly presentation = inject(PresentationSettingsService);

  // --- Live metrics of whichever game is running ---
  readonly score = signal(0);
  readonly moves = signal(0);
  private readonly undoDepth = signal(0);

  /** The rules the running game lets a player choose, for the settings panel. */
  readonly ruleOptions = computed<readonly GameOptionSpec[]>(() =>
    this.catalog.options().filter((option) => !option.debugOnly),
  );

  /** The development-only rules the running game offers. */
  readonly debugOptions = computed<readonly GameOptionSpec[]>(() =>
    this.catalog.options().filter((option) => option.debugOnly),
  );

  /** The chosen value of every rule of the running game, by option id. */
  readonly optionValues = this.catalog.optionValues;

  readonly cardBack = this.presentation.cardBackStyle;

  readonly isGameWon = signal(false);
  readonly timerText = this.timer.timerText;

  /** Every game that can be played. */
  readonly games: readonly CatalogEntry[] = this.catalog.games;

  /** The id of the game on the table. */
  readonly selectedGameId = this.catalog.selectedId;

  /**
   * Whether there is a move to take back. A won game is excluded: the board is
   * finished, and the victory overlay covers it.
   */
  readonly canUndo = computed(() => this.undoDepth() > 0 && !this.isGameWon());

  constructor() {
    // Re-bind everything to whichever game is on the table. Angular runs the
    // cleanup before the next pass, so switching games never leaves a
    // subscription pointing at the game that just left.
    effect((onCleanup) => {
      const { game } = this.catalog.session();

      const subscriptions = [
        game.state.score$.subscribe((value) => this.score.set(value)),
        game.state.moves$.subscribe((value) => this.moves.set(value)),
        game.state.undoDepth$.subscribe((value) => this.undoDepth.set(value)),
      ];

      const gameWonHandler = () => {
        this.isGameWon.set(true);
        this.timer.stop();
      };
      game.on("game-won", gameWonHandler);

      onCleanup(() => {
        subscriptions.forEach((subscription) => subscription.unsubscribe());
        game.off("game-won", gameWonHandler);
      });
    });

    // Auto-start the stopwatch once the first move is made (and not yet won).
    effect(() => {
      const moves = this.moves();
      const isWon = this.isGameWon();
      if (moves > 0 && !isWon && !this.timer.isRunning) {
        this.timer.start();
      }
    });
  }

  /** The game currently on the table. */
  private get gameModel(): PlayableGame {
    return this.catalog.session().game;
  }

  /**
   * Puts a different game on the table, behind a confirmation when the current
   * one is in progress.
   *
   * @param id The id of the game to play.
   */
  selectGame(id: string): void {
    if (id === this.selectedGameId()) return;

    this.confirmIfInProgress(
      "Are you sure you want to switch games? Your current progress will be lost.",
      () => {
        this.catalog.select(id);
        this.startFreshSession();
      },
    );
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

  /**
   * Plays the current game by a different rule, behind a confirmation when a
   * game is in progress.
   *
   * @param optionId The id of the rule to change.
   * @param value The value to set it to.
   */
  setRuleOption(optionId: string, value: number): void {
    if (this.catalog.valueOf(optionId) === value) return;

    this.confirmIfInProgress(
      "Changing this will deal a new game. Are you sure you want to proceed?",
      () => {
        this.catalog.setOption(optionId, value);
        this.startFreshSession();
      },
    );
  }

  /** Takes back the most recent move, if there is one. */
  undo(): void {
    if (!this.canUndo()) return;
    this.gameModel.undo();
  }

  setCardBack(style: CardBackStyle): void {
    this.presentation.setCardBackStyle(style);
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
