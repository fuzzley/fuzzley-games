import { Component, computed, inject, viewChild } from "@angular/core";
import { BugReportDialogComponent } from "@fz/game-ui/bug_report";
import { PlayRoomDirective, refocusWhenUncovered } from "@fz/game-ui/play_room";
import { GameViewportService } from "@fz/game-ui/viewport";
import { KeepKeysDirective } from "@fz/phaser/canvas";
import { AnnouncerComponent } from "@fz/ui/announcer";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { IconComponent } from "@fz/ui/icon";
import { BarComponent } from "./bar/bar.component";
import { LevelFiguresComponent } from "./bar/level_figures.component";
import { LevelTitleComponent } from "./bar/level_title.component";
import { BoardComponent } from "./board/board.component";
import { GameService } from "./play/game.service";

/**
 * Shows the game: the bar, the board, and a wide window's panels beside it.
 *
 * The board takes the focus as a level begins, as the page loads or after
 * a dialog over it closes, so the keys play at once.
 */
@Component({
  selector: "app-root",
  imports: [
    AnnouncerComponent,
    BarComponent,
    BoardComponent,
    BugReportDialogComponent,
    ConfirmDialogComponent,
    IconComponent,
    KeepKeysDirective,
    LevelFiguresComponent,
    LevelTitleComponent,
    PlayRoomDirective,
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
  protected readonly game = inject(GameService);
  private readonly board = viewChild.required(BoardComponent);
  private readonly bar = viewChild.required(BarComponent);
  private readonly panelFigures = viewChild(LevelFiguresComponent);

  /** Whether the panels beside the board show the level, its figures and its buttons, in the bar's place. */
  protected readonly panelled = computed(() => this.board().panels() !== null);

  /**
   * The pictures of the pieces the board last baked, each bake's encoded
   * once, as the bar and the panel show them, or null before the board has
   * baked them.
   */
  protected readonly pictures = computed(
    () => this.board().pictures()?.() ?? null,
  );

  /** Each goal's picture where the page shows the level's figures, in the panel or else in the bar, for the board's copies to fly to. */
  protected readonly goalPictures = computed(() => {
    const figures = this.panelFigures() ?? this.bar().figures();
    return (
      figures?.goalPictures().map(({ nativeElement }) => nativeElement) ?? []
    );
  });

  constructor() {
    refocusWhenUncovered(this.board, this.game.runs);
  }

  /** Plays the level again on its deal, as Restart asks, asking first once a move is made. */
  protected restart(): void {
    void this.game.restart();
  }
}
