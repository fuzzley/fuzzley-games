import { Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "./local_storage.service";
import { ViewportService } from "./viewport.service";

const STORAGE_KEY = "fsolitaire-menu-expanded";

/** Remembers whether the game rail shows names or just initials. */
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
   */
  readonly isOverlay = this.viewport.isCompact;

  /**
   * Closes the rail if it is covering the board, as it should after a game is
   * picked on a phone.
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
