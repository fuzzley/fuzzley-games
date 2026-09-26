import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { GameMenuService } from "../../service/game_menu.service";

/**
 * Lists the games on offer in a collapsible rail down the left edge, beside
 * the board when there is room and over it when there is not.
 */
@Component({
  selector: "app-game-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_menu.component.html",
  styleUrl: "./game_menu.component.scss",
})
export class GameMenuComponent {
  protected readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);
  protected readonly menu = inject(GameMenuService);

  /**
   * Picks a game, closing the rail when it is covering the board.
   *
   * The rail closes without waiting on any confirmation, which appears over
   * everything anyway.
   */
  protected chooseGame(id: string): void {
    void this.lifecycle.selectGame(id);
    this.menu.collapseIfOverlay();
  }
}
