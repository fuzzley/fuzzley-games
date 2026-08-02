import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { OptionGroupComponent } from "../option_group/option_group.component";

/**
 * Developer-only debug controls.
 * Exposes tools to manipulate the active game state for testing (e.g. Almost
 * Win Mode). Conditionally rendered in development builds by the settings
 * drawer that hosts it.
 */
@Component({
  selector: "app-debug-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OptionGroupComponent],
  templateUrl: "./debug_panel.component.html",
  styleUrl: "./debug_panel.component.css",
})
export class DebugPanelComponent {
  protected readonly catalog = inject(GameCatalogService);
  protected readonly lifecycle = inject(GameLifecycleService);
}
