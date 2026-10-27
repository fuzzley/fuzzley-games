import {
  Component,
  type ElementRef,
  effect,
  input,
  output,
  viewChild,
} from "@angular/core";

/** Names the role a dialog takes. */
export type DialogRole = "dialog" | "alertdialog";

/**
 * Names how the page behind a dialog looks: `glass`, dimmed and blurred, or
 * `clear`, left as it is, for a panel about what the page shows.
 */
export type DialogBackdrop = "glass" | "clear";

/**
 * Shows projected content in a native `<dialog>`, which supplies the focus
 * trap, Escape, focus restore and inert background.
 *
 * The host owns the open state: the dialog never closes itself, only asks to
 * through `closed`, so the host lowers `open` in return.
 */
@Component({
  selector: "fz-dialog",
  templateUrl: "./dialog.component.html",
  styleUrl: "./dialog.component.scss",
})
export class DialogComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** The dialog's accessible name. */
  readonly label = input("");

  /**
   * The id of the element that says what the dialog is about, announced after
   * its name.
   */
  readonly describedBy = input("");

  /** `alertdialog` for a prompt that interrupts to ask, else `dialog`. */
  readonly dialogRole = input<DialogRole>("dialog");

  /** Whether Escape and a backdrop click dismiss the dialog. */
  readonly dismissible = input(true);

  /** How the page behind looks while the dialog is open. */
  readonly backdrop = input<DialogBackdrop>("glass");

  /** Emitted when the dialog asks to close, on Escape or a backdrop click. */
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
   */
  protected onCancel(event: Event): void {
    event.preventDefault();
    if (this.dismissible()) {
      this.closed.emit();
    }
  }

  /**
   * Asks to close a dismissible dialog on a backdrop click, which targets the
   * `<dialog>` itself rather than anything inside it.
   */
  protected onClick(event: MouseEvent): void {
    if (this.dismissible() && event.target === this.dialogRef().nativeElement) {
      this.closed.emit();
    }
  }
}
