import { Injectable, computed, inject, signal } from "@angular/core";
import { GameCatalogService } from "./game_catalog.service";
import { GameDocumentation } from "../model/game_documentation.model";
import { GAME_DOCUMENTATION } from "../provider/game_documentation_data";

/**
 * Manages game documentation lookup and the visibility of the help modal.
 */
@Injectable({ providedIn: "root" })
export class GameDocumentationService {
  private readonly catalog = inject(GameCatalogService);
  private readonly registry = inject(GAME_DOCUMENTATION);

  private readonly isOpenSignal = signal(false);

  /** Whether the documentation modal is showing. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /** Documentation for the game on the table, or undefined if not documented. */
  readonly activeGameDoc = computed<GameDocumentation | undefined>(
    () => this.registry[this.catalog.selectedId()],
  );

  /** Opens the documentation modal. */
  openHelp(): void {
    this.isOpenSignal.set(true);
  }

  /** Closes the documentation modal. */
  closeHelp(): void {
    this.isOpenSignal.set(false);
  }

  /** Toggles the documentation modal. */
  toggleHelp(): void {
    this.isOpenSignal.update((open) => !open);
  }

  /**
   * Retrieves documentation for a specific game id.
   * @param gameId Stable game identifier.
   */
  getDocumentation(gameId: string): GameDocumentation | undefined {
    return this.registry[gameId];
  }
}
