import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ConfirmationService } from "../../service/confirmation.service";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";

/**
 * Renders the prompt that asks the player to confirm an action that would
 * lose their game.
 */
@Component({
  selector: "app-confirmation-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  templateUrl: "./confirmation_dialog.component.html",
  styleUrl: "./confirmation_dialog.component.scss",
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationService);
}
