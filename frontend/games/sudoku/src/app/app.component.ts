import { Component, effect, inject, signal, viewChild } from "@angular/core";
import { refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { DialogService } from "@fz/ui/dialog";
import { BarComponent } from "./bar/bar.component";
import { BoardComponent } from "./board/board.component";
import { HelpComponent } from "./help/help.component";
import { PadComponent } from "./pad/pad.component";
import { GameService } from "./play/game.service";
import { ResultComponent } from "./result/result.component";
import { SettingsComponent } from "./settings/settings.component";

/**
 * Shows the game: the bar, the board and the pad in the room the bar leaves
 * them, the live region that says what each move did, and the dialogs.
 *
 * The board takes the focus as each game begins, as the page loads or after
 * a new deal, and whenever the last dialog over it closes, so a digit typed
 * goes into the square drawn as selected. The clock stops while any dialog
 * is open.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BarComponent,
    BoardComponent,
    ConfirmDialogComponent,
    HelpComponent,
    PadComponent,
    ResultComponent,
    SettingsComponent,
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
  private readonly dialogs = inject(DialogService);
  private readonly board = viewChild.required(BoardComponent);

  protected readonly settingsOpen = signal(false);
  protected readonly helpOpen = signal(false);

  constructor() {
    effect(() => {
      this.game.cover(this.dialogs.anyOpen());
    });
    refocusWhenUncovered(this.board, this.game.deals);
  }

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
