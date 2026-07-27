import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";

/**
 * Manages the top header bar of the Solitaire game.
 * Renders game status metrics (score, elapsed time, total moves) and actions
 * such as restarting the game, beginning a new game, or opening the settings panel.
 */
@Component({
  selector: "app-header-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./header_bar.component.html",
  styleUrl: "./header_bar.component.css",
})
export class HeaderBarComponent {
  protected readonly session = inject(GameSessionService);

  /** Emitted when the user requests to open the settings panel. */
  readonly openSettings = output();
}
