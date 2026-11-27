import { Component, computed, inject, signal, viewChild } from "@angular/core";
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
import {
  type CardChoice,
  LevelCardComponent,
} from "./cards/level_card.component";
import { ChooseLevelComponent } from "./levels/choose_level.component";
import { newThingLine } from "../rules/run/describe";
import { GameService } from "./play/game.service";
import { SettingsComponent } from "./settings/settings.component";
import { SettingsService } from "./settings/settings.service";

/**
 * Shows the game: the bar, the board, a wide window's panels beside it, the
 * card over the board at a level's end, Choose a level, as the bar and the
 * card open it, and the settings, as the bar opens them.
 *
 * A level that brings something new has a line about it, on the bar's
 * side of the board where the bar stands across the window. A phone on its
 * side leaves the board the whole height, so there the line shows in the
 * panel, or, where the phone spares no panel, in the room left of the
 * board. Across the window the line never moves to the panel: the height
 * it takes from the board could bring the panels on, and its leaving take
 * them off again.
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
    ChooseLevelComponent,
    ConfirmDialogComponent,
    IconComponent,
    KeepKeysDirective,
    LevelCardComponent,
    LevelFiguresComponent,
    LevelTitleComponent,
    PlayRoomDirective,
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
  protected readonly game = inject(GameService);
  private readonly settings = inject(SettingsService);
  private readonly board = viewChild.required(BoardComponent);
  private readonly bar = viewChild.required(BarComponent);
  private readonly panelFigures = viewChild(LevelFiguresComponent);

  /** Whether Choose a level is open. */
  protected readonly levelsOpen = signal(false);

  /** Whether the settings are open. */
  protected readonly settingsOpen = signal(false);

  /** Whether the player wants sound, as Sound and the settings say. */
  protected readonly soundOn = computed(() => this.settings.settings().sound);

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

  /** The line about what the level brings in new, or null for a level that brings nothing. */
  private readonly line = computed(() => {
    const thing = this.game.state().newThing;
    return thing === null ? null : newThingLine(thing);
  });

  /** Whether the bar runs down the end of a phone on its side. */
  private readonly onRail = computed(
    () => this.viewport.barPlacement() === "end",
  );

  /** The line about what the level brings in new on the bar's side of the board, where the bar stands across the window, or null. */
  protected readonly lineBesideBar = computed(() =>
    this.onRail() ? null : this.line(),
  );

  /** The line about what the level brings in new where the panel shows it, on a phone on its side, or null. */
  protected readonly lineInPanel = computed(() =>
    this.onRail() ? this.line() : null,
  );

  /** The line about what the level brings in new left of the board, on a phone on its side that spares no panel, and where it lies there, or null. */
  protected readonly lineBesideBoard = computed(() => {
    const line = this.lineInPanel();
    const room = this.board().besideBoard();
    return line !== null && room !== null ? { line, room } : null;
  });

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

  /** Turns the sound on or off, as Sound asks. */
  protected toggleSound(): void {
    this.settings.update({ sound: !this.soundOn() });
  }

  /** Does what a card's button asks, its sound played first. */
  protected chooseFromCard(choice: CardChoice): void {
    this.game.cue("button");
    switch (choice) {
      case "next-level":
        void this.game.nextLevel();
        return;
      case "play-again":
      case "try-again":
        void this.game.newGame();
        return;
      case "choose-level":
        this.levelsOpen.set(true);
        return;
    }
  }

  /** Plays the level again on its deal, as Restart asks, asking first once a move is made. */
  protected restart(): void {
    void this.game.restart();
  }
}
