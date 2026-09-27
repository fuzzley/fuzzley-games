import { Injectable, computed, inject, signal } from "@angular/core";
import { GameCatalogService } from "./game_catalog.service";
import { GameDocumentation } from "../model/game_documentation.model";
import { GAME_DOCUMENTATION } from "../provider/game_documentation_data";

/** Manages game documentation lookup and the visibility of the help modal. */
@Injectable({ providedIn: "root" })
export class GameDocumentationService {
  private readonly catalog = inject(GameCatalogService);
  private readonly registry = inject(GAME_DOCUMENTATION);

  private readonly isOpenSignal = signal(false);

  /** The game asked for by name, or null for the game on the table. */
  private readonly requestedId = signal<string | null>(null);

  /** Whether the documentation modal is showing. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /**
   * The id of the game whose rules the modal shows: the one it was opened
   * for, or else the game on the table.
   */
  readonly shownGameId = computed(
    () => this.requestedId() ?? this.catalog.selectedId(),
  );

  /** Documentation for the game shown, or undefined if not documented. */
  readonly activeGameDoc = computed<GameDocumentation | undefined>(
    () => this.registry[this.shownGameId()],
  );

  /**
   * Opens the documentation modal on a game's rules, by default the game on
   * the table.
   */
  openHelp(gameId?: string): void {
    this.requestedId.set(gameId ?? null);
    this.isOpenSignal.set(true);
  }

  /** Closes the documentation modal. */
  closeHelp(): void {
    this.isOpenSignal.set(false);
    this.requestedId.set(null);
  }

  /** Toggles the documentation modal. */
  toggleHelp(): void {
    if (this.isOpen()) this.closeHelp();
    else this.openHelp();
  }

  /** Returns the documentation for a game, or undefined if it has none. */
  getDocumentation(gameId: string): GameDocumentation | undefined {
    return this.registry[gameId];
  }
}
