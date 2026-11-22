import { Injectable, inject } from "@angular/core";
import { type ConfirmRequest, ConfirmService } from "@fz/ui/confirm";
import type { GamePosition } from "../model/game_position";
import type { GameOptionValues } from "../provider/game_catalog";
import { GameCatalogService } from "./game_catalog.service";
import { GameMetricsService } from "./game_metrics.service";

/** What every question but Restart's says is lost: the game under way. */
const GAME_LOST = "You'll lose the game in progress.";

/** What the player is asked before another game replaces one under way. */
function switchQuestion(name: string | undefined): ConfirmRequest {
  return {
    title: name === undefined ? "Switch games?" : `Switch to ${name}?`,
    message: GAME_LOST,
    confirmLabel: "Switch",
  };
}

/**
 * Changes which game is on the table, or throws away the one that is, asking
 * first when a game is under way.
 */
@Injectable({ providedIn: "root" })
export class GameLifecycleService {
  private readonly catalog = inject(GameCatalogService);
  private readonly metrics = inject(GameMetricsService);
  private readonly confirm = inject(ConfirmService);

  /**
   * Puts a game on the table by the given rules, asking first when that would
   * throw away a game under way.
   *
   * Rules it does not name keep their chosen values, and the game already on
   * the table by the same rules is left alone.
   *
   * @param name What the prompt calls the game, which for a named variant is
   *   not its catalog entry's name.
   * @returns Whether the game is on the table by those rules afterwards, which
   *   it is not when the player declines.
   */
  async playGame(
    id: string,
    values: GameOptionValues,
    name: string,
  ): Promise<boolean> {
    const switching = id !== this.catalog.selectedId();
    const current = this.catalog.optionValues();
    const sameRules = Object.entries(values).every(
      ([optionId, value]) => current[optionId] === value,
    );
    if (!switching && sameRules) return true;

    const question: ConfirmRequest = switching
      ? switchQuestion(name)
      : {
          title: `Start a new game of ${name}?`,
          message: GAME_LOST,
          confirmLabel: "New game",
        };
    if (!(await this.confirmIfInProgress(question))) return false;

    this.catalog.load(id, values);
    return true;
  }

  /**
   * Resolves whether a navigation may put the named game on the table, asking
   * first when that would throw away a game under way.
   *
   * The game already on the table passes without asking, because
   * {@link playGame} deals a game before routing to it.
   */
  confirmNavigation(gameId: string): Promise<boolean> {
    return gameId === this.catalog.selectedId()
      ? Promise.resolve(true)
      : this.confirmIfInProgress(
          switchQuestion(
            this.catalog.games.find((game) => game.id === gameId)?.name,
          ),
        );
  }

  /** Deals the same game again from the start. */
  async restartGame(): Promise<void> {
    if (
      !(await this.confirmIfInProgress({
        title: "Restart this game?",
        message: "You'll lose your progress.",
        confirmLabel: "Restart",
      }))
    ) {
      return;
    }

    this.catalog.session().game.restartGame();
  }

  /** Deals a new game of whatever is on the table. */
  async startNewGame(): Promise<void> {
    if (
      !(await this.confirmIfInProgress({
        title: "Start a new game?",
        message: GAME_LOST,
        confirmLabel: "New game",
      }))
    ) {
      return;
    }

    this.catalog.session().game.startNewGame();
  }

  /** Plays the current game by a different rule. */
  async setRuleOption(optionId: string, value: number): Promise<void> {
    if (this.catalog.valueOf(optionId) === value) return;
    if (
      !(await this.confirmIfInProgress({
        title: "Change the rules?",
        message: GAME_LOST,
        confirmLabel: "New game",
      }))
    ) {
      return;
    }

    this.catalog.setOption(optionId, value);
  }

  /**
   * Puts a reported game on the table: its game, its rules and its position,
   * asking first when that would throw away a game under way.
   *
   * @returns Whether it was loaded, which it is not when the player declines.
   * @throws Error if the position names a game or a rule this build does not
   *   have, before asking anything, or a board that does not fit the game.
   */
  async loadPosition({
    gameId,
    options,
    snapshot,
  }: GamePosition): Promise<boolean> {
    const entry = this.catalog.games.find((game) => game.id === gameId);
    if (!entry) throw new Error(`There is no game "${gameId}".`);
    for (const [optionId, value] of Object.entries(options)) {
      const option = entry.options.find((spec) => spec.id === optionId);
      if (!option?.choices.some((choice) => choice.value === value)) {
        throw new Error(`${entry.name} has no rule "${optionId}" of ${value}.`);
      }
    }
    if (
      !(await this.confirmIfInProgress({
        title: "Load this game?",
        message: GAME_LOST,
        confirmLabel: "Load",
      }))
    ) {
      return false;
    }

    this.catalog.load(entry.id, options);
    this.catalog.session().game.restore(snapshot);
    return true;
  }

  /** Takes back the most recent move, if there is one. */
  undo(): void {
    if (!this.metrics.canUndo()) return;
    this.catalog.session().game.undo();
  }

  /**
   * Asks the player a question if there is a game in progress to lose,
   * resolving to whether the caller should go ahead.
   */
  private confirmIfInProgress(question: ConfirmRequest): Promise<boolean> {
    return this.metrics.isInProgress()
      ? this.confirm.ask({ ...question, tone: "danger" })
      : Promise.resolve(true);
  }
}
