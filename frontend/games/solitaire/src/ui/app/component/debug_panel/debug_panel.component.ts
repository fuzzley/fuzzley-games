import { Component, inject, output } from "@angular/core";
import { BugReportLoaderComponent } from "@fz/game-ui/bug_report";
import { DEV_BUILD } from "@fz/game-ui/debug_menu";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { OptionGroupComponent } from "../option_group/option_group.component";

/**
 * Offers the controls the game shows only in its debug menu: loading a game
 * from a bug report, and in a development build the debug rules, such as
 * Almost Win Mode.
 */
@Component({
  selector: "app-debug-panel",
  imports: [BugReportLoaderComponent, OptionGroupComponent],
  templateUrl: "./debug_panel.component.html",
  styleUrl: "./debug_panel.component.scss",
})
export class DebugPanelComponent {
  protected readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);

  /**
   * Whether this is a development build, which alone offers the debug rules:
   * one chosen on the site at `?debug` would stay in force once the address
   * dropped it, with nothing left to turn it off.
   */
  protected readonly devBuild = inject(DEV_BUILD);

  /** Emitted once a bug report's game is on the table. */
  readonly loaded = output();

  /** Plays the current game by a different debug rule, dealt afresh. */
  protected chooseRule(optionId: string, value: number): void {
    void this.lifecycle.setRuleOption(optionId, value);
  }
}
