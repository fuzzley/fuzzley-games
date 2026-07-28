import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";
import { GameMenuService } from "../../service/game_menu.service";

/**
 * The collapsible rail down the left edge listing the games on offer.
 *
 * Separate from the settings drawer because choosing what to play is not a
 * setting: it is the one control that changes everything else on screen, and it
 * should be reachable without opening a modal over the board.
 */
@Component({
  selector: "app-game-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_menu.component.html",
  styleUrl: "./game_menu.component.css",
})
export class GameMenuComponent {
  protected readonly session = inject(GameSessionService);
  protected readonly menu = inject(GameMenuService);
}
