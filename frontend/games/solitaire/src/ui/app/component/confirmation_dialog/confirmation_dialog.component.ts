import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ConfirmationService } from "../../service/confirmation.service";

/**
 * Renders the confirmation overlay prompt.
 * Intercepts potentially destructive actions (e.g. starting a new game, resetting,
 * or altering the draw count in-progress) and forces explicit user approval.
 */
@Component({
  selector: "app-confirmation-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./confirmation_dialog.component.html",
  styleUrl: "./confirmation_dialog.component.css",
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationService);
}
