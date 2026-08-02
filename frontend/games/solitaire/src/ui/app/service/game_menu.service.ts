import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { LocalStorageService } from "./local_storage.service";

/**
 * Below this width the rail overlays the board instead of sitting beside it.
 *
 * A 56px rail is a reasonable tithe on a laptop and a seventh of a phone, and
 * the board needs every pixel it can get — Spider lays out ten columns.
 */
export const RAIL_OVERLAY_MAX_WIDTH_PX = 720;

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(LocalStorageService);

  private readonly expanded = signal(
    this.storage.readString(STORAGE_KEY) === "true",
  );
  private readonly overlay = signal(false);

  /** Whether the rail is expanded to show game names. */
  readonly isExpanded = this.expanded.asReadonly();

  /**
   * Whether the rail is currently covering the board rather than sitting
   * beside it, which is what a narrow screen gets.
   */
  readonly isOverlay = this.overlay.asReadonly();

  constructor() {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia(
      `(max-width: ${RAIL_OVERLAY_MAX_WIDTH_PX}px)`,
    );
    this.overlay.set(query.matches);
    const onChange = () => this.overlay.set(query.matches);
    query.addEventListener("change", onChange);
    this.destroyRef.onDestroy(() => {
      query.removeEventListener("change", onChange);
    });
  }

  /**
   * Closes the rail if it is covering the board.
   *
   * Called after picking a game: on a phone the rail is over the board the
   * player just chose, and leaving it open would hide the thing they asked
   * for. On a wider screen it sits beside the board and can stay put.
   */
  collapseIfOverlay(): void {
    if (this.overlay()) {
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
