import { DOCUMENT } from "@angular/common";
import { Injectable, inject, signal } from "@angular/core";

/** Opens and closes the game browser, from wherever a game can be chosen. */
@Injectable({ providedIn: "root" })
export class GameBrowserService {
  private readonly document = inject(DOCUMENT);

  private readonly isOpenSignal = signal(false);

  /** Whether the browser is showing. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /** The keyboard shortcut that opens the browser, as `aria-keyshortcuts` names it. */
  readonly shortcutKeys = "Control+K Meta+K";

  /** The keyboard shortcut as a player on this platform would write it. */
  readonly shortcutLabel = /Mac|iPhone|iPad/.test(
    this.document.defaultView?.navigator.userAgent ?? "",
  )
    ? "⌘K"
    : "Ctrl K";

  /** Opens the browser. */
  open(): void {
    this.isOpenSignal.set(true);
  }

  /** Closes the browser. */
  close(): void {
    this.isOpenSignal.set(false);
  }

  /** Returns whether a key press is the browser's shortcut, Ctrl or Command with K. */
  isShortcut(event: KeyboardEvent): boolean {
    const modified = event.ctrlKey || event.metaKey;
    if (!modified || event.altKey || event.shiftKey) return false;
    return event.key.toLowerCase() === "k";
  }

  /**
   * Opens the browser if a key press is its shortcut, keeping the key from the
   * browser's own use of it.
   */
  openOnShortcut(event: KeyboardEvent): void {
    if (!this.isShortcut(event)) return;

    event.preventDefault();
    this.open();
  }
}
