import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
} from "@angular/core";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { OptionGroupComponent } from "../option_group/option_group.component";

/**
 * Offers development-only controls, such as Almost Win Mode and loading the
 * game from a bug report.
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

  /** Emitted once a bug report's game is on the table. */
  readonly loaded = output();

  /** Why the last game state could not be loaded, if it could not. */
  protected readonly loadProblem = signal("");

  /** Plays the current game by a different debug rule, dealt afresh. */
  protected chooseRule(optionId: string, value: number): void {
    void this.lifecycle.setRuleOption(optionId, value);
  }

  /** Loads the game from a bug report's pasted game state. */
  protected async loadPosition(text: string): Promise<void> {
    this.loadProblem.set("");
    try {
      if (await this.lifecycle.loadPosition(text)) this.loaded.emit();
    } catch (error) {
      this.loadProblem.set(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
