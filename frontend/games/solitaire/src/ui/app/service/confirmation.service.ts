import { Injectable, signal } from "@angular/core";

/**
 * Generic confirmation-dialog controller. Holds the open/message state and
 * settles a promise when the player answers. It is intentionally unaware of
 * any game rules — the caller decides whether an action needs confirming.
 *
 * A promise rather than the callback this used to take. A caller now reads
 * straight down:
 *
 *     if (!(await this.confirmation.ask(message))) return;
 *     doTheThing();
 *
 * rather than posting `doTheThing` into the service and letting it decide when
 * to run. The control flow stays where the decision is, which also means the
 * "no confirmation needed" path is an ordinary early return rather than a
 * second branch that calls the callback directly.
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

  /**
   * Asks the player to confirm something.
   *
   * @param message What they are being asked.
   * @return Whether they confirmed.
   */
  ask(message: string): Promise<boolean> {
    // A second prompt while one is open would otherwise leave the first
    // caller waiting on a promise nothing can settle. Declining it is the
    // safe reading: whatever it was about to do, it now will not.
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
