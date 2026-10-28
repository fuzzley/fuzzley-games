import { DOCUMENT } from "@angular/common";
import {
  Component,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from "@angular/core";
import { GameViewportService } from "@fz/game-ui/viewport";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent, ConfirmService } from "@fz/ui/confirm";
import { BoardComponent } from "./board/board.component";
import { GameService } from "./play/game.service";

/**
 * Shows the game: the board in the room the bar leaves it, the live region
 * that says what happens, and the dialogs.
 *
 * Once a run begins, as the page loads or after a new game, the board takes
 * the focus as soon as nothing covers it, so the keys steer at once. The run
 * pauses whenever the page is hidden; the board pauses it whenever it loses
 * the focus.
 */
@Component({
  selector: "app-root",
  imports: [AnnouncerComponent, BoardComponent, ConfirmDialogComponent],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[attr.data-bar]": "viewport.barPlacement()",
    "(document:visibilitychange)": "onVisibilityChange()",
  },
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly viewport = inject(GameViewportService);
  private readonly game = inject(GameService);
  private readonly confirm = inject(ConfirmService);
  private readonly document = inject(DOCUMENT);
  private readonly board = viewChild.required(BoardComponent);

  /** Whether a dialog covers the board. */
  private readonly covered = computed(() => this.confirm.isOpen());

  /** The last run the board took the focus for, by `GameService.runs`. */
  private focusedRun = -1;

  constructor() {
    effect(() => {
      const run = this.game.runs();
      if (this.covered() || run === this.focusedRun) return;
      // As the page loads, no focus ring: nothing was pressed to put it there.
      const options = this.focusedRun === -1 ? { focusVisible: false } : {};
      this.focusedRun = run;
      untracked(() => {
        this.board().focus(options);
      });
    });
  }

  /** Pauses the run under way as the page goes out of sight. */
  protected onVisibilityChange(): void {
    if (this.document.visibilityState === "hidden") this.game.pause();
  }
}
