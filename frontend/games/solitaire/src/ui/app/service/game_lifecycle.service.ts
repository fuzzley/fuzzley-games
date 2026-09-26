import { Injectable, inject } from "@angular/core";
import { decodePosition } from "../model/game_position";
import { GameCatalogService } from "./game_catalog.service";
import { GameMetricsService } from "./game_metrics.service";
import { ConfirmationService } from "./confirmation.service";

/** What the player is asked before another game replaces one under way. */
const SWITCH_GAME_MESSAGE =
  "Are you sure you want to switch games? Your current progress will be lost.";

/**
 * Changes which game is on the table, or throws away the one that is, asking
 * first when a game is under way.
 */
@Injectable({ providedIn: "root" })
export class GameLifecycleService {
  private readonly catalog = inject(GameCatalogService);
  private readonly metrics = inject(GameMetricsService);
  private readonly confirmation = inject(ConfirmationService);

  /**
   * Puts a different game on the table; choosing the one already in play does
   * nothing.
   */
  async selectGame(id: string): Promise<void> {
    if (id === this.catalog.selectedId()) return;
    if (!(await this.confirmIfInProgress(SWITCH_GAME_MESSAGE))) return;

    this.catalog.select(id);
  }

  /**
   * Resolves whether a navigation may put the named game on the table, asking
   * first when that would throw away a game under way.
   *
   * The game already on the table passes without asking, because
   * {@link selectGame} deals a game before routing to it.
   */
  confirmNavigation(gameId: string): Promise<boolean> {
    return gameId === this.catalog.selectedId()
      ? Promise.resolve(true)
      : this.confirmIfInProgress(SWITCH_GAME_MESSAGE);
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
  }

  /** Plays the current game by a different rule. */
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
  }

  /**
   * Puts the game from a bug report's game state on the table: its game, its
   * rules and its position.
   *
   * @param text The report's game state, or any text containing it.
   * @returns Whether it was loaded, which it is not when the player declines.
   * @throws Error if the text holds no game state, or one naming a game or
   *   rule this build does not have, or a position that does not fit it.
   */
  async loadPosition(text: string): Promise<boolean> {
    const { gameId, options, snapshot } = await decodePosition(text);
    const entry = this.catalog.games.find((game) => game.id === gameId);
    if (!entry) throw new Error(`There is no game "${gameId}".`);
    for (const [optionId, value] of Object.entries(options)) {
      const option = entry.options.find((spec) => spec.id === optionId);
      if (!option?.choices.some((choice) => choice.value === value)) {
        throw new Error(`${entry.name} has no rule "${optionId}" of ${value}.`);
      }
    }
    if (
      !(await this.confirmIfInProgress(
        "Are you sure you want to load this game? Your current progress will be lost.",
      ))
    ) {
      return false;
    }

    this.catalog.select(entry.id);
    for (const [optionId, value] of Object.entries(options)) {
      this.catalog.setOption(optionId, value);
    }
    this.catalog.session().game.restore(snapshot);
    return true;
  }

  /** Takes back the most recent move, if there is one. */
  undo(): void {
    if (!this.metrics.canUndo()) return;
    this.catalog.session().game.undo();
  }

  /**
   * Asks the player to confirm if there is a game in progress to lose,
   * resolving to whether the caller should go ahead.
   */
  private confirmIfInProgress(message: string): Promise<boolean> {
    return this.metrics.isInProgress()
      ? this.confirmation.ask(message)
      : Promise.resolve(true);
  }
}
