import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ConfirmationService } from "../../service/confirmation.service";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";

/**
 * Renders the confirmation prompt.
 * Intercepts potentially destructive actions (e.g. starting a new game, resetting,
 * or altering the draw count in-progress) and forces explicit user approval.
 *
 * An `alertdialog` rather than a plain one: it interrupts to ask a question
 * whose answer decides whether the player keeps their game.
 */
@Component({
  selector: "app-confirmation-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  templateUrl: "./confirmation_dialog.component.html",
  styleUrl: "./confirmation_dialog.component.css",
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationService);
}
