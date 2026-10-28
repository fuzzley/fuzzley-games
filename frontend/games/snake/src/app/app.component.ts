import { DOCUMENT } from "@angular/common";
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
 * once. The run pauses whenever the page is hidden; the board pauses it
 * whenever it loses the focus.
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
    ResultComponent,
    SettingsComponent,
  ],
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
  private readonly settings = inject(SettingsService);
  private readonly confirm = inject(ConfirmService);
  private readonly document = inject(DOCUMENT);
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

  /** Whether a dialog covers the board. */
  private readonly covered = computed(
    () =>
      this.settingsOpen() ||
      this.helpOpen() ||
      this.confirm.isOpen() ||
      this.game.resultOpen(),
  );

  /** The last run the board took the focus for, by `GameService.runs`. */
  private focusedRun = -1;

  /** Whether a dialog covered the board when the focus was last looked at. */
  private wasCovered = false;

  constructor() {
    effect(() => {
      const run = this.game.runs();
      const covered = this.covered();
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
  }

  /** Pauses the run under way as the page goes out of sight. */
  protected onVisibilityChange(): void {
    if (this.document.visibilityState === "hidden") this.game.pause();
  }
}
