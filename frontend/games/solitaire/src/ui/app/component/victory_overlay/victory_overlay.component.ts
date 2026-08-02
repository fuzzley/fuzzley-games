import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { GameMetricsService } from "../../service/game_metrics.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";

/**
 * The card shown when the player clears the board.
 * Displays final game statistics (score, elapsed time, total moves) and a
 * button to play again.
 *
 * Deliberately not dismissible: "Play Again" is the only way on from a
 * finished board, and an Escape that dropped the player back onto it with no
 * moves left would be a dead end.
 */
@Component({
  selector: "app-victory-overlay",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  templateUrl: "./victory_overlay.component.html",
  styleUrl: "./victory_overlay.component.css",
})
export class VictoryOverlayComponent {
  protected readonly metrics = inject(GameMetricsService);
  protected readonly lifecycle = inject(GameLifecycleService);
}
