import { Injectable, computed, inject, signal } from "@angular/core";
import { GameCatalogService } from "./game_catalog.service";
import { GameDocumentation } from "../model/game_documentation.model";
import { GAME_DOCUMENTATION_REGISTRY } from "../provider/game_documentation_data";

/**
 * Manages game documentation accessibility, active game rules lookup, and
 * overlay modal visibility state.
 */
@Injectable({ providedIn: "root" })
export class GameDocumentationService {
  private readonly catalog = inject(GameCatalogService);

  /** Signal tracking whether the documentation overlay modal is visible. */
  readonly isOpen = signal(false);

  /** Documentation entry for the game currently on the table. */
  readonly activeGameDoc = computed<GameDocumentation>(() => {
    const selectedId = this.catalog.selectedId();
    return (
      GAME_DOCUMENTATION_REGISTRY[selectedId] ??
      GAME_DOCUMENTATION_REGISTRY["klondike"]
    );
  });

  /** Opens the documentation overlay modal. */
  openHelp(): void {
    this.isOpen.set(true);
  }

  /** Closes the documentation overlay modal. */
  closeHelp(): void {
    this.isOpen.set(false);
  }

  /** Toggles the documentation overlay modal visibility. */
  toggleHelp(): void {
    this.isOpen.update((open) => !open);
  }

  /**
   * Retrieves documentation for a specific game id.
   * @param gameId Stable game identifier.
   */
  getDocumentation(gameId: string): GameDocumentation | undefined {
    return GAME_DOCUMENTATION_REGISTRY[gameId];
  }
}
