import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import {
  CatalogEntry,
  CatalogSession,
  GAME_CATALOG,
  catalogEntry,
} from "../provider/game_catalog";

const STORAGE_KEY = "fsolitaire-game";

/** The game named by the URL fragment, or null when it names nothing known. */
function gameFromHash(): string | null {
  if (typeof location === "undefined") return null;
  const id = location.hash.replace(/^#/, "");
  return GAME_CATALOG.some((entry) => entry.id === id) ? id : null;
}

/** The game last played, from storage. */
function gameFromStorage(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to read the selected game:", e);
    return null;
  }
}

/**
 * The game to open on.
 *
 * The URL wins, so a link to `#spider` opens Spider whatever was last played;
 * otherwise the last game played, and otherwise the first in the catalog.
 */
function initialGameId(): string {
  return catalogEntry(gameFromHash() ?? gameFromStorage()).id;
}

/**
 * Owns which game is on the table, and the dealt session of it.
 *
 * A signal rather than a one-shot injection token because the choice can change
 * while the application is running: picking a different game deals a new one
 * and everything downstream — the header's score, the board on the canvas —
 * follows the signal to it.
 *
 * The choice is mirrored into the URL fragment, so a game is linkable and the
 * back button moves between games rather than out of the application.
 */
@Injectable({ providedIn: "root" })
export class GameCatalogService {
  private readonly destroyRef = inject(DestroyRef);

  /** Every game that can be played, in the order they are offered. */
  readonly games: readonly CatalogEntry[] = GAME_CATALOG;

  private readonly selectedIdSignal = signal<string>(initialGameId());

  /** The id of the game currently on the table. */
  readonly selectedId = this.selectedIdSignal.asReadonly();

  private readonly sessionSignal = signal<CatalogSession>(
    catalogEntry(initialGameId()).create(),
  );

  /** The dealt game currently on the table, and the options it offers. */
  readonly session = this.sessionSignal.asReadonly();

  constructor() {
    // Reflect the game the application actually opened on, so the URL is right
    // even when it was chosen from storage or fell back to the default.
    this.writeHash(this.selectedIdSignal());

    if (typeof window === "undefined") return;
    // Following the fragment is what makes the back button move between games.
    // A hash this service wrote itself resolves to the game already in play and
    // falls straight out of `select`, so there is no loop to break.
    const onHashChange = () => {
      const id = gameFromHash();
      if (id) this.select(id);
    };
    window.addEventListener("hashchange", onHashChange);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener("hashchange", onHashChange);
    });
  }

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
    this.writeHash(entry.id);
  }

  private writeHash(id: string): void {
    if (typeof location === "undefined" || location.hash === `#${id}`) return;
    location.hash = id;
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
