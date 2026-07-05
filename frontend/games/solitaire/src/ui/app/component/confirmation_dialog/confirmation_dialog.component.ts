import { Component, inject } from "@angular/core";
import { ConfirmationService } from "../../service/confirmation.service";

/**
 * Renders the confirmation overlay prompt.
 * Intercepts potentially destructive actions (e.g. starting a new game, resetting,
 * or altering the draw count in-progress) and forces explicit user approval.
 */
@Component({
  selector: "app-confirmation-dialog",
  standalone: true,
  templateUrl: "./confirmation_dialog.component.html",
  styleUrl: "./confirmation_dialog.component.css",
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationService);

  /** Cancels the pending action and closes the confirmation dialog. */
  cancel(): void {
    this.confirmation.cancel();
  }

  /** Executes the pending action and closes the confirmation dialog. */
  accept(): void {
    this.confirmation.accept();
  }
}
