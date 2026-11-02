import { Component, effect, inject, untracked, viewChild } from "@angular/core";
import { PlayRoomDirective } from "@fz/game-ui/play_room";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent, ConfirmService } from "@fz/ui/confirm";
import { BoardComponent } from "./board/board.component";
import { GameService } from "./play/game.service";

/**
 * Shows the game: the board in the room the page gives it, the live region
 * that says what happens, and the question before a run is thrown away.
 *
 * The board takes the focus as a run begins, as the page loads or after a
 * new game, and whenever the question over it closes, so the keys steer at
 * once. The wave in play pauses whenever the player looks away from the
 * room (`[fzPlayRoom]`). An ended run's result is put away as it opens,
 * leaving the board's card to offer another run.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BoardComponent,
    ConfirmDialogComponent,
    PlayRoomDirective,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  private readonly game = inject(GameService);
  private readonly confirm = inject(ConfirmService);
  private readonly board = viewChild.required(BoardComponent);

  /** The last run the board took the focus for, by `GameService.runs`. */
  private focusedRun = -1;

  /** Whether the question covered the board when the focus was last looked at. */
  private wasCovered = false;

  constructor() {
    effect(() => {
      const run = this.game.runs();
      const covered = this.confirm.isOpen();
      const uncovered = this.wasCovered && !covered;
      this.wasCovered = covered;
      if (covered || (run === this.focusedRun && !uncovered)) return;
      // As the page loads, no focus ring: nothing was pressed to put it there.
      const options = this.focusedRun === -1 ? { focusVisible: false } : {};
      this.focusedRun = run;
      untracked(() => {
        this.board().focus(options);
      });
    });
    effect(() => {
      if (this.game.resultOpen()) this.game.closeResult();
    });
  }

  /** Pauses the wave in play as the player looks away from the room. */
  protected pauseRun(): void {
    this.game.pause();
  }
}
