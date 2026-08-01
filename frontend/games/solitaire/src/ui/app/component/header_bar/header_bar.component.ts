import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";

import { GameDocumentationService } from "../../service/game_documentation.service";

/**
 * Manages the top header bar of the Solitaire game.
 * Renders game status metrics (score, elapsed time, total moves) and actions
 * such as restarting the game, beginning a new game, opening rules, or opening the settings panel.
 */
@Component({
  selector: "app-header-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./header_bar.component.html",
  styleUrl: "./header_bar.component.css",
})
export class HeaderBarComponent {
  protected readonly session = inject(GameSessionService);
  protected readonly docService = inject(GameDocumentationService);

  /** Emitted when the user requests to open the settings panel. */
  readonly openSettings = output();
}
