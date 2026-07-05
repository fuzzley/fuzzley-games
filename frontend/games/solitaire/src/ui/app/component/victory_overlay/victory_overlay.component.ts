import { Component, inject } from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";

/**
 * Manages the overlay overlay displayed when the user wins the game.
 * Displays final game statistics (score, elapsed time, total moves) and a button to
 * play again.
 */
@Component({
  selector: "app-victory-overlay",
  standalone: true,
  templateUrl: "./victory_overlay.component.html",
  styleUrl: "./victory_overlay.component.css",
})
export class VictoryOverlayComponent {
  protected readonly session = inject(GameSessionService);

  /** Begins a new solitaire game, resetting all session state and timers. */
  startNewGame(): void {
    this.session.startNewGame();
  }
}
