import { Component, inject } from "@angular/core";
import { DialogComponent } from "../dialog";
import { IconComponent } from "../icon";
import { ConfirmService } from "./confirm.service";

/** Tells one dialog's message apart from another's on the same page. */
let nextMessage = 0;

/**
 * Shows what `ConfirmService` asks, as an alert dialog with a button to go
 * ahead and one to back out.
 *
 * An app puts one in its root template. Cancel comes first, so it is what
 * the dialog focuses as it opens, and Escape or a click outside the card
 * answers no.
 */
@Component({
  selector: "fz-confirm-dialog",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./confirm_dialog.component.html",
  styleUrl: "./confirm_dialog.component.scss",
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);

  protected readonly messageId = `fz-confirm-message-${String(nextMessage++)}`;
}
