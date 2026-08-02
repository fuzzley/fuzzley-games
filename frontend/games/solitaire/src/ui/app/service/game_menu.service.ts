import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "./local_storage.service";
import { ViewportService } from "./viewport.service";

const STORAGE_KEY = "fsolitaire-menu-expanded";

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
  private readonly storage = inject(LocalStorageService);
  private readonly viewport = inject(ViewportService);

  private readonly expanded = signal(
    this.storage.readString(STORAGE_KEY) === "true",
  );

  /** Whether the rail is expanded to show game names. */
  readonly isExpanded = this.expanded.asReadonly();

  /**
   * Whether the rail is currently covering the board rather than sitting
   * beside it, which is what a narrow screen gets.
   *
   * The same width at which the header compacts, because it is the same
   * judgement: a 56px rail is a reasonable tithe on a laptop and a seventh of a
   * phone, and the board needs every pixel it can get — Spider lays out ten
   * columns.
   */
  readonly isOverlay = this.viewport.isCompact;

  /**
   * Closes the rail if it is covering the board.
   *
   * Called after picking a game: on a phone the rail is over the board the
   * player just chose, and leaving it open would hide the thing they asked
   * for. On a wider screen it sits beside the board and can stay put.
   */
  collapseIfOverlay(): void {
    if (this.isOverlay()) {
      this.setExpanded(false);
    }
  }

  /** Expands the rail if it is collapsed, and collapses it if it is not. */
  toggle(): void {
    this.setExpanded(!this.expanded());
  }

  /** Sets whether the rail is expanded. */
  setExpanded(expanded: boolean): void {
    if (this.expanded() === expanded) return;
    this.expanded.set(expanded);
    this.storage.writeString(STORAGE_KEY, String(expanded));
  }
}
