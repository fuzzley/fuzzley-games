import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from "@angular/core";

/** How much of the browser's modal behaviour a host wants. */
export type ModalRole = "dialog" | "alertdialog";

/**
 * A modal built on the native `<dialog>` element.
 *
 * `showModal()` is what makes this worth having: the browser supplies the
 * focus trap, the initial focus move, the focus restore on close, Escape, the
 * `inert` background and the backdrop, and it promotes the element to the top
 * layer so it draws above everything regardless of z-index. All of that was
 * previously hand-written — a keydown listener on `document`, a querySelector
 * for focusable children, a saved `previousActiveElement`, a `body.style
 * .overflow` lock and a z-index ladder climbing to 2000 — and each copy of it
 * was slightly different from the others.
 *
 * Content is projected, so a host writes its own body and keeps its own
 * styling; what it gets from here is the behaviour.
 */
@Component({
  selector: "app-modal-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./modal_dialog.component.html",
  styleUrl: "./modal_dialog.component.css",
})
export class ModalDialogComponent {
  /** Whether the dialog is showing. */
  readonly open = input.required<boolean>();

  /** The dialog's accessible name. */
  readonly label = input<string>("");

  /**
   * `alertdialog` for a prompt that interrupts to ask something, `dialog`
   * otherwise. Screen readers treat the two differently, so a confirmation
   * should not claim to be the same kind of thing as a help panel.
   */
  readonly dialogRole = input<ModalRole>("dialog");

  /**
   * Whether Escape and a backdrop click dismiss the dialog.
   *
   * The victory card is the exception: it has one action, and closing it would
   * leave a finished board with no way back to it.
   */
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
   * Escape, which the browser routes here as `cancel` before it closes.
   *
   * A non-dismissible dialog cancels the cancel; everything else lets the host
   * decide by way of `closed`, so the open state stays owned in one place
   * rather than being half in the DOM and half in a signal.
   */
  protected onCancel(event: Event): void {
    event.preventDefault();
    if (this.dismissible()) {
      this.closed.emit();
    }
  }

  /**
   * Light dismiss.
   *
   * A click on the backdrop lands on the `<dialog>` itself, because the
   * backdrop is the element's own `::backdrop` pseudo — so a click whose
   * target is the dialog rather than anything inside it came from outside the
   * visible panel.
   */
  protected onClick(event: MouseEvent): void {
    if (this.dismissible() && event.target === this.dialogRef().nativeElement) {
      this.closed.emit();
    }
  }
}
