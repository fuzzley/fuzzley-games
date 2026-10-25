import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { ConfirmationService } from "../../service/confirmation.service";

/**
 * Renders the prompt that asks the player to confirm an action that would
 * lose their game.
 */
@Component({
  selector: "app-confirmation-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogComponent, IconComponent],
  templateUrl: "./confirmation_dialog.component.html",
  styleUrl: "./confirmation_dialog.component.scss",
})
export class ConfirmationDialogComponent {
  protected readonly confirmation = inject(ConfirmationService);
}
