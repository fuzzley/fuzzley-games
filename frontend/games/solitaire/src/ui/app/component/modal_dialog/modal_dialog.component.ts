import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from "@angular/core";

/** Names the role a modal takes. */
export type ModalRole = "dialog" | "alertdialog";

/**
 * Shows projected content in a native `<dialog>`, which supplies the focus
 * trap, Escape, focus restore and inert background.
 */
@Component({
  selector: "app-modal-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./modal_dialog.component.html",
  styleUrl: "./modal_dialog.component.scss",
})
export class ModalDialogComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** The dialog's accessible name. */
  readonly label = input<string>("");

  /**
   * The id of the element that says what the dialog is about, announced after
   * its name.
   */
  readonly describedBy = input<string>("");

  /** `alertdialog` for a prompt that interrupts to ask, else `dialog`. */
  readonly dialogRole = input<ModalRole>("dialog");

  /** Whether Escape and a backdrop click dismiss the dialog. */
  readonly dismissible = input(true);

  /** Emitted when the dialog asks to close — Escape, backdrop, or the host. */
  readonly closed = output();

  private readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>("dialog");

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      const shouldBeOpen = this.open();

      // `showModal()` throws if the dialog is already open, and `close()` on a
      // closed dialog fires a spurious `close` event, so both are guarded.
      if (shouldBeOpen && !dialog.open) {
        dialog.showModal();
      } else if (!shouldBeOpen && dialog.open) {
        dialog.close();
      }
    });
  }

  /**
   * Handles Escape, which the browser reports as `cancel`, by asking the host
   * to close a dismissible dialog.
   *
   * The browser never closes it itself, so the `open` input stays the only
   * state.
   */
  protected onCancel(event: Event): void {
    event.preventDefault();
    if (this.dismissible()) {
      this.closed.emit();
    }
  }

  /**
   * Closes a dismissible dialog on a backdrop click, which targets the
   * `<dialog>` itself rather than anything inside it.
   */
  protected onClick(event: MouseEvent): void {
    if (this.dismissible() && event.target === this.dialogRef().nativeElement) {
      this.closed.emit();
    }
  }
}
