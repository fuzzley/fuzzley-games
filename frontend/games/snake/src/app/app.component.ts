import { Component, computed, inject, signal, viewChild } from "@angular/core";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { ArrowsComponent } from "./arrows/arrows.component";
import { BarComponent } from "./bar/bar.component";
import { BoardComponent } from "./board/board.component";
import { HelpComponent } from "./help/help.component";
import { GameService } from "./play/game.service";
import { ResultComponent } from "./result/result.component";
import { SettingsComponent } from "./settings/settings.component";
import { SettingsService } from "./settings/settings.service";

/**
 * Shows the game: the bar, the board in the room the bar leaves it, the
 * on-screen arrows beside it where they are wanted, the live region that says
 * what happens, and the dialogs.
 *
 * The board takes the focus as a run begins, as the page loads or after a new
 * game, and whenever the last dialog over it closes, so the keys steer at
 * once. The run pauses whenever the player looks away from the room, the
 * board and the arrows, whose keys all steer (`[fzPlayRoom]`).
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    ArrowsComponent,
    BarComponent,
    BoardComponent,
    ConfirmDialogComponent,
    HelpComponent,
    PlayRoomDirective,
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
  protected readonly viewport = inject(GameViewportService);
  private readonly game = inject(GameService);
  private readonly settings = inject(SettingsService);
  private readonly board = viewChild.required(BoardComponent);

  protected readonly settingsOpen = signal(false);
  protected readonly helpOpen = signal(false);

  /** Whether the on-screen arrows show: on a touch screen, unless the player says otherwise. */
  protected readonly showArrows = computed(() => {
    const arrows = this.settings.settings().arrows;
    return (
      arrows === "always" ||
      (arrows === "touch" && this.viewport.isTouchScreen())
    );
  });

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
  }

  /** Pauses the run under way as the player looks away from the room. */
  protected pauseRun(): void {
    this.game.pause();
  }
}
