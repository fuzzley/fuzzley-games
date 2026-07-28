import { Injectable, signal } from "@angular/core";

const STORAGE_KEY = "fsolitaire-menu-expanded";

/** Whether the menu was left open, defaulting to collapsed. */
function loadExpanded(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch (e) {
    console.warn("Failed to read the game menu state:", e);
    return false;
  }
}

/**
 * Whether the game rail is showing names or just initials.
 *
 * Remembered, because it is a standing preference about how much of the board
 * to give up rather than a per-visit decision. Collapsed by default: the rail
 * still shows which game is on the table, and a first-time player has one game
 * dealt in front of them rather than a menu.
 */
@Injectable({ providedIn: "root" })
export class GameMenuService {
  private readonly expanded = signal(loadExpanded());

  /** Whether the rail is expanded to show game names. */
  readonly isExpanded = this.expanded.asReadonly();

  /** Expands the rail if it is collapsed, and collapses it if it is not. */
  toggle(): void {
    this.setExpanded(!this.expanded());
  }

  /** Sets whether the rail is expanded. */
  setExpanded(expanded: boolean): void {
    if (this.expanded() === expanded) return;
    this.expanded.set(expanded);
    this.persist(expanded);
  }

  private persist(expanded: boolean): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch (e) {
      console.warn("Failed to save the game menu state:", e);
    }
  }
}
