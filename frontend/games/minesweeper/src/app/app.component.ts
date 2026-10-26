import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { GameViewportService } from "@fz/game-ui/viewport";
import { BarComponent } from "./bar/bar.component";
import { BoardComponent } from "./board/board.component";
import { HelpComponent } from "./help/help.component";
import { GameService } from "./play/game.service";
import { ResultComponent } from "./result/result.component";
import { SettingsComponent } from "./settings/settings.component";

/**
 * Shows the game: the bar, the board in the room the bar leaves it, the live
 * region that says what each move did, and the dialogs.
 */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AnnouncerComponent,
    BarComponent,
    BoardComponent,
    ConfirmDialogComponent,
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
  protected readonly viewport = inject(GameViewportService);

  protected readonly settingsOpen = signal(false);
  protected readonly helpOpen = signal(false);
}
