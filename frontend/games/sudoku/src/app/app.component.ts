import { Component, inject } from "@angular/core";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { BoardComponent } from "./board/board.component";
import { PadComponent } from "./pad/pad.component";
import { GameService } from "./play/game.service";

/**
 * Shows the game: the bar, the board and the pad in the room the bar leaves
 * them, the live region that says what each move did, and the dialogs.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BoardComponent,
    ConfirmDialogComponent,
    GameBarComponent,
    PadComponent,
  ],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[attr.data-bar]": "viewport.barPlacement()",
    "(document:keydown)": "onKeydown($event)",
  },
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewport = inject(GameViewportService);
  private readonly game = inject(GameService);

  /**
   * Takes back a move on Ctrl+Z, or Cmd+Z, wherever the focus is but in a
   * dialog, where it might mean something else.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const undo =
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "z";
    if (!undo || inDialog(event.target)) return;
    event.preventDefault();
    this.game.undo();
  }
}

/** Returns whether an event's target sits in a dialog. */
function inDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("dialog") !== null;
}
