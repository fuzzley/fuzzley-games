import { Component, computed, inject, signal, viewChild } from "@angular/core";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { BarComponent } from "./bar/bar.component";
import { BoardComponent } from "./board/board.component";
import { HelpComponent } from "./help/help.component";
import { GameService } from "./play/game.service";
import { ResultComponent } from "./result/result.component";
import { SectorsComponent } from "./sectors/sectors.component";
import { SettingsComponent } from "./settings/settings.component";

/**
 * Shows the game: the bar, the board in the room the bar leaves it, the live
 * region that says what happens, the sectors, How to play and the settings
 * the bar opens, the result card over an ended run, and the question
 * before a run is thrown away.
 *
 * The board takes the focus as a run begins, as the page loads or after a
 * new game, and whenever the last dialog over it closes, so the keys steer
 * at once. The wave in play pauses whenever the player looks away from the
 * room (`[fzPlayRoom]`).
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BarComponent,
    BoardComponent,
    ConfirmDialogComponent,
    HelpComponent,
    PlayRoomDirective,
    ResultComponent,
    SectorsComponent,
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
  private readonly board = viewChild.required(BoardComponent);

  protected readonly sectorsOpen = signal(false);
  protected readonly helpOpen = signal(false);
  protected readonly settingsOpen = signal(false);

  /**
   * The pictures How to play shows, asked of the board only while it is
   * open, since the scene encodes them only as they are asked for.
   */
  protected readonly helpPictures = computed(() =>
    this.helpOpen() ? this.board().pictures() : null,
  );

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
  }

  /** Pauses the wave in play as the player looks away from the room. */
  protected pauseRun(): void {
    this.game.pause();
  }
}
