import { Injectable, computed, signal } from "@angular/core";

/** Names how a confirmation looks: `danger` for what can't be undone. */
export type ConfirmTone = "accent" | "danger";

/** Says what a confirmation asks, and how its parts read. */
export interface ConfirmRequest {
  /** The heading, which names the dialog too. */
  readonly title: string;

  /** What the player is asked, under the title. */
  readonly message: string;

  /** The button that goes ahead; "Confirm" unless given. */
  readonly confirmLabel?: string;

  /** The button that backs out; "Cancel" unless given. */
  readonly cancelLabel?: string;

  /** `accent` unless given. */
  readonly tone?: ConfirmTone;
}

/** A confirmation with every part filled in. */
export type ConfirmPrompt = Required<ConfirmRequest>;

/** What the dialog shows before anything has asked. */
const NOTHING_ASKED: ConfirmPrompt = {
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "accent",
};

/**
 * Asks the player to confirm an action, through `<fz-confirm-dialog>`, and
 * settles a promise with their answer.
 */
@Injectable({ providedIn: "root" })
export class ConfirmService {
  private readonly promptSignal = signal(NOTHING_ASKED);
  private readonly isOpenSignal = signal(false);

  /** Whether a confirmation is showing. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /**
   * The confirmation showing, or the last one shown, which the dialog keeps
   * while it closes.
   */
  readonly prompt = this.promptSignal.asReadonly();

  /** Whether the confirmation showing is for something that can't be undone. */
  readonly isDanger = computed(() => this.promptSignal().tone === "danger");

  /** Settles the promise handed to the current asker. */
  private settlePending: ((confirmed: boolean) => void) | null = null;

  /** Asks the player to confirm something and resolves to whether they did. */
  ask(request: ConfirmRequest): Promise<boolean> {
    // Declines a confirmation still open, so its caller is not left waiting.
    this.settle(false);

    this.promptSignal.set({ ...NOTHING_ASKED, ...request });
    this.isOpenSignal.set(true);
    return new Promise<boolean>((resolve) => {
      this.settlePending = resolve;
    });
  }

  /** Answers the confirmation showing with yes. */
  accept(): void {
    this.settle(true);
  }

  /** Answers the confirmation showing with no. */
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
