import { Component, inject, viewChild } from "@angular/core";
import { BugReportDialogComponent } from "@fz/game-ui/bug_report";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { BoardComponent } from "./board/board.component";
import { GameService } from "./play/game.service";

/**
 * Shows the game: the board, in the room the player looks away from, beside
 * what the page holds from the start, the live region that says what
 * happens, the question asked before something is lost, and the Report a
 * bug dialog.
 *
 * The board takes the focus as a level begins, as the page loads or after
 * a dialog over it closes, so the keys play at once.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BoardComponent,
    BugReportDialogComponent,
    ConfirmDialogComponent,
    PlayRoomDirective,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewport = inject(GameViewportService);
  protected readonly game = inject(GameService);
  private readonly board = viewChild.required(BoardComponent);

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
  }
}
