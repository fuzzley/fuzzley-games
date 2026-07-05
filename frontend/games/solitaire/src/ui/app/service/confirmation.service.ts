import { Injectable, signal } from "@angular/core";

/**
 * Generic confirmation-dialog controller. Holds the open/message state and a
 * pending action to run on accept. It is intentionally unaware of any game
 * rules — the caller decides whether an action needs confirming.
 */
@Injectable({ providedIn: "root" })
export class ConfirmationService {
  readonly isOpen = signal(false);
  readonly message = signal("");
  private pendingAction: (() => void) | null = null;

  /** Opens the dialog and stores the action to run if the user confirms. */
  request(message: string, action: () => void): void {
    this.pendingAction = action;
    this.message.set(message);
    this.isOpen.set(true);
  }

  accept(): void {
    const action = this.pendingAction;
    this.pendingAction = null;
    this.isOpen.set(false);
    action?.();
  }

  cancel(): void {
    this.pendingAction = null;
    this.isOpen.set(false);
  }
}
