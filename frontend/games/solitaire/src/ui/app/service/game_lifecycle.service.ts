import { Injectable, inject } from "@angular/core";
import { GameCatalogService } from "./game_catalog.service";
import { GameMetricsService } from "./game_metrics.service";
import { ConfirmationService } from "./confirmation.service";

/**
 * Everything that changes which game is on the table, or throws away the one
 * that is: choosing a game, restarting, dealing afresh, changing a rule, and
 * taking a move back.
 *
 * Each destructive action asks first when a game is under way, and every one
 * of them reads the same way — confirm, then act — because
 * {@link ConfirmationService} answers with a promise rather than taking the
 * action as a callback.
 */
@Injectable({ providedIn: "root" })
export class GameLifecycleService {
  private readonly catalog = inject(GameCatalogService);
  private readonly metrics = inject(GameMetricsService);
  private readonly confirmation = inject(ConfirmationService);

  /**
   * Puts a different game on the table.
   *
   * Choosing the game already in play does nothing rather than dealing a fresh
   * one: picking "Klondike" from the menu while playing Klondike should not
   * throw the game away. "New Game" is what does that.
   *
   * @param id The id of the game to play.
   */
  async selectGame(id: string): Promise<void> {
    if (id === this.catalog.selectedId()) return;
    if (
      !(await this.confirmIfInProgress(
        "Are you sure you want to switch games? Your current progress will be lost.",
      ))
    ) {
      return;
    }

    this.catalog.select(id);
    this.metrics.reset();
  }

  /** Deals the same game again from the start. */
  async restartGame(): Promise<void> {
    if (
      !(await this.confirmIfInProgress(
        "Are you sure you want to restart this game? Your current progress will be lost.",
      ))
    ) {
      return;
    }

    this.catalog.session().game.restartGame();
    this.metrics.reset();
  }

  /** Deals a new game of whatever is on the table. */
  async startNewGame(): Promise<void> {
    if (
      !(await this.confirmIfInProgress(
        "Are you sure you want to start a new game? Your current progress will be lost.",
      ))
    ) {
      return;
    }

    this.catalog.session().game.startNewGame();
    this.metrics.reset();
  }

  /**
   * Plays the current game by a different rule.
   *
   * @param optionId The id of the rule to change.
   * @param value The value to set it to.
   */
  async setRuleOption(optionId: string, value: number): Promise<void> {
    if (this.catalog.valueOf(optionId) === value) return;
    if (
      !(await this.confirmIfInProgress(
        "Changing this will deal a new game. Are you sure you want to proceed?",
      ))
    ) {
      return;
    }

    this.catalog.setOption(optionId, value);
    this.metrics.reset();
  }

  /** Takes back the most recent move, if there is one. */
  undo(): void {
    if (!this.metrics.canUndo()) return;
    this.catalog.session().game.undo();
  }

  /**
   * Asks the player to confirm, but only when there is a game in progress to
   * lose. Resolves to whether the caller should go ahead.
   */
  private confirmIfInProgress(message: string): Promise<boolean> {
    return this.metrics.isInProgress()
      ? this.confirmation.ask(message)
      : Promise.resolve(true);
  }
}
