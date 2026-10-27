import {
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent, ConfirmService } from "@fz/ui/confirm";
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
 * Once a game begins, as the page loads or after a new deal, the board takes
 * the focus as soon as nothing covers it, so a digit typed goes into the
 * square drawn as selected.
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
  private readonly confirm = inject(ConfirmService);
  private readonly board = viewChild.required(BoardComponent);

  protected readonly settingsOpen = signal(false);
  protected readonly helpOpen = signal(false);

  /** Whether a drawer or a dialog covers the board. */
  private readonly covered = computed(
    () => this.settingsOpen() || this.helpOpen() || this.confirm.isOpen(),
  );

  /** The last game the board took the focus for, by `GameService.deals`. */
  private focusedDeal = -1;

  constructor() {
    effect(() => {
      this.game.cover(this.covered());
    });
    effect(() => {
      const deal = this.game.deals();
      if (this.covered() || deal === this.focusedDeal) return;
      this.focusedDeal = deal;
      untracked(() => {
        this.board().focus();
      });
    });
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
