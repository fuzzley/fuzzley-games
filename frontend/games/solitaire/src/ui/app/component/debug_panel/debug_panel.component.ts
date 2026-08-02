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
  styleUrl: "./debug_panel.component.scss",
})
export class DebugPanelComponent {
  protected readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);

  /** Plays the current game by a different debug rule, dealt afresh. */
  protected chooseRule(optionId: string, value: number): void {
    void this.lifecycle.setRuleOption(optionId, value);
  }
}
