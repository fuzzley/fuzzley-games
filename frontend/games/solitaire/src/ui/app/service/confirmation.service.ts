import { Injectable, signal } from "@angular/core";

/**
 * Asks the player to confirm an action and settles a promise with their
 * answer.
 */
@Injectable({ providedIn: "root" })
export class ConfirmationService {
  private readonly isOpenSignal = signal(false);
  private readonly messageSignal = signal("");

  /** Whether a prompt is currently showing. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /** What the current prompt is asking. */
  readonly message = this.messageSignal.asReadonly();

  /** Settles the promise handed to the current asker. */
  private settlePending: ((confirmed: boolean) => void) | null = null;

  /** Asks the player to confirm something and resolves to whether they did. */
  ask(message: string): Promise<boolean> {
    // Decline any prompt still open, so its caller is not left waiting.
    this.settle(false);

    this.messageSignal.set(message);
    this.isOpenSignal.set(true);
    return new Promise<boolean>((resolve) => {
      this.settlePending = resolve;
    });
  }

  accept(): void {
    this.settle(true);
  }

  cancel(): void {
    this.settle(false);
  }

  private settle(confirmed: boolean): void {
    const resolve = this.settlePending;
    this.settlePending = null;
    this.isOpenSignal.set(false);
    resolve?.(confirmed);
  }
}
