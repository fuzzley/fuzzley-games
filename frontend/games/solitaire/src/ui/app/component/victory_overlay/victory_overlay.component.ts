import { Component, inject } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { GameMetricsService } from "../../service/game_metrics.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { GameBrowserService } from "../../service/game_browser.service";

/**
 * Shows the final score, time and moves once the board is cleared, with
 * buttons to play again or to choose another game.
 *
 * Not dismissible, since a finished board has nothing to go back to.
 */
@Component({
  selector: "app-victory-overlay",
  imports: [DialogComponent, IconComponent],
  templateUrl: "./victory_overlay.component.html",
  styleUrl: "./victory_overlay.component.scss",
})
export class VictoryOverlayComponent {
  protected readonly metrics = inject(GameMetricsService);
  protected readonly browser = inject(GameBrowserService);
  private readonly lifecycle = inject(GameLifecycleService);

  /** Deals a new game without asking: a finished board has nothing to lose. */
  protected playAgain(): void {
    void this.lifecycle.startNewGame();
  }
}
