import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { BoardComponent } from "./board/board.component";
import { GameBarComponent } from "./game_bar/game_bar.component";
import { HelpComponent } from "./help/help.component";
import { ResultComponent } from "./result/result.component";
import { GameService } from "./service/game.service";
import { ViewportService } from "./service/viewport.service";
import { SettingsComponent } from "./settings/settings.component";

/**
 * Shows the game: the bar, the board in the room the bar leaves it, the live
 * region that says what each move did, and the dialogs.
 */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BoardComponent,
    ConfirmDialogComponent,
    GameBarComponent,
    HelpComponent,
    ResultComponent,
    SettingsComponent,
  ],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[attr.data-bar]": "viewport.barPlacement()",
  },
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly game = inject(GameService);
  protected readonly viewport = inject(ViewportService);

  protected readonly settingsOpen = signal(false);
  protected readonly helpOpen = signal(false);
}
