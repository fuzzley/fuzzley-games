import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";

/**
 * Developer-only debug controls.
 * Exposes tools to manipulate the active game state for testing (e.g. Almost Win Mode).
 * Conditionally rendered in development builds via isDevMode check in parent.
 */
@Component({
  selector: "app-debug-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./debug_panel.component.html",
  styleUrl: "./debug_panel.component.css",
})
export class DebugPanelComponent {
  protected readonly session = inject(GameSessionService);
}
