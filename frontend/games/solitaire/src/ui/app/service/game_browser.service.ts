import { Injectable, signal } from "@angular/core";

/** Opens and closes the game browser, from wherever a game can be chosen. */
@Injectable({ providedIn: "root" })
export class GameBrowserService {
  private readonly isOpenSignal = signal(false);

  /** Whether the browser is showing. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /** Opens the browser. */
  open(): void {
    this.isOpenSignal.set(true);
  }

  /** Closes the browser. */
  close(): void {
    this.isOpenSignal.set(false);
  }
}
