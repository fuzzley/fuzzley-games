import { Injectable, signal } from "@angular/core";
import {
  CatalogEntry,
  CatalogSession,
  GAME_CATALOG,
  catalogEntry,
} from "../provider/game_catalog";

const STORAGE_KEY = "fsolitaire-game";

/** The id of the game to open on, from storage or the default. */
function loadSelectedId(): string {
  if (typeof localStorage === "undefined") {
    return GAME_CATALOG[0].id;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return catalogEntry(stored).id;
  } catch (e) {
    console.warn("Failed to read the selected game:", e);
    return GAME_CATALOG[0].id;
  }
}

/**
 * Owns which game is on the table, and the dealt session of it.
 *
 * A signal rather than a one-shot injection token because the choice can now
 * change while the application is running: picking a different game deals a new
 * one and everything downstream — the header's score, the board on the canvas —
 * follows the signal to it.
 */
@Injectable({ providedIn: "root" })
export class GameCatalogService {
  /** Every game that can be played, in the order they are offered. */
  readonly games: readonly CatalogEntry[] = GAME_CATALOG;

  private readonly selectedIdSignal = signal<string>(loadSelectedId());

  /** The id of the game currently on the table. */
  readonly selectedId = this.selectedIdSignal.asReadonly();

  private readonly sessionSignal = signal<CatalogSession>(
    catalogEntry(loadSelectedId()).create(),
  );

  /** The dealt game currently on the table, and the options it offers. */
  readonly session = this.sessionSignal.asReadonly();

  /** The catalog entry currently selected. */
  get selectedEntry(): CatalogEntry {
    return catalogEntry(this.selectedIdSignal());
  }

  /**
   * Puts a different game on the table, dealt and ready.
   *
   * Selecting the game already in play is ignored rather than dealing a fresh
   * one: choosing "Klondike" from the menu while playing Klondike should not
   * throw the game away. "New Game" is what does that.
   *
   * @param id The id of the game to play.
   */
  select(id: string): void {
    const entry = catalogEntry(id);
    if (entry.id === this.selectedIdSignal()) {
      return;
    }

    this.selectedIdSignal.set(entry.id);
    this.sessionSignal.set(entry.create());
    this.persist(entry.id);
  }

  private persist(id: string): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      console.warn("Failed to save the selected game:", e);
    }
  }
}
