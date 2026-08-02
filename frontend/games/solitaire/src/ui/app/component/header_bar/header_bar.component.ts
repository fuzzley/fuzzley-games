import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from "@angular/core";
import { GameMetricsService } from "../../service/game_metrics.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { GameDocumentationService } from "../../service/game_documentation.service";

/**
 * The top header bar.
 *
 * Renders the game's status (score, elapsed time, moves) and the actions that
 * act on it: undo, restart, deal a new game, open the rules, open settings.
 */
@Component({
  selector: "app-header-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./header_bar.component.html",
  styleUrl: "./header_bar.component.scss",
})
export class HeaderBarComponent {
  protected readonly metrics = inject(GameMetricsService);
  protected readonly lifecycle = inject(GameLifecycleService);
  protected readonly docService = inject(GameDocumentationService);

  /** Emitted when the user requests to open the settings panel. */
  readonly openSettings = output();

  /**
   * Deals the same game again, or asks first if there is one to lose.
   *
   * The lifecycle actions are async because they may have to wait on that
   * prompt. Discarding the promise is deliberate — the answer is acted on
   * inside the service, and there is nothing here left to do with it — but it
   * is discarded explicitly rather than by a template calling an async method
   * and dropping what it returns where no lint rule can see it.
   */
  protected restart(): void {
    void this.lifecycle.restartGame();
  }

  /** Deals a new game, or asks first if there is one to lose. */
  protected newGame(): void {
    void this.lifecycle.startNewGame();
  }
}
