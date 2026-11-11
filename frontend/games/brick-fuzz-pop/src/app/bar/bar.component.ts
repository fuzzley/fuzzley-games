import { Component, computed, inject, input, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import type { RunStage } from "@fz/core/run";
import {
  type BarOverflowAction,
  BarOverflowComponent,
  type BarOverflowItem,
  HELP_MENU_ACTION,
  SETTINGS_MENU_ACTION,
  withHomeLink,
} from "@fz/game-ui/bar_overflow";
import { BarPauseComponent } from "@fz/game-ui/bar_pause";
import { BarSoundComponent, soundMenuAction } from "@fz/game-ui/bar_sound";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { IconComponent } from "@fz/ui/icon";
import { CrewComponent } from "./crew.component";
import { FastForwardComponent } from "./fast_forward.component";
import { SkipComponent } from "./skip.component";

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "levels" | "new-game" | "help" | "settings";

/**
 * Shows the game bar: the link home, the game's name, the figures, and the
 * actions, from what it is handed, asking the app for each action.
 *
 * From the desktop width (`fitsActionLabels`), the figures are the level,
 * the rounds against par, the rows left, the score and the crew, the
 * player's fuzzball and each friend in its ink; below it, the rounds and the
 * score alone, as the Ready card, the lintel and the panels give the rest.
 *
 * Every action is round at every size, its name heard and shown under the
 * pointer, which is what leaves room for the five figures. Pause,
 * Fast-forward and Skip stay at every size, the two dimmed while there is
 * no flight, so nothing moves as one starts. On a compact screen Sound, Levels,
 * New game, How to play and Settings move into the overflow menu, as on the
 * narrowest the link home does too.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarOverflowComponent,
    BarPauseComponent,
    BarSoundComponent,
    CrewComponent,
    FastForwardComponent,
    FuzzballComponent,
    GameBarComponent,
    IconComponent,
    SkipComponent,
  ],
  host: {
    "[class.rounds-and-score]": "!fitsEveryFigure()",
    "[class.rail]": 'viewport.barPlacement() === "end"',
  },
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
})
export class BarComponent {
  protected readonly viewport = inject(GameViewportService);

  /** The number of the level in play, from 1. */
  readonly level = input.required<number>();

  /** The rounds the level in play has played. */
  readonly rounds = input.required<number>();

  /** The level in play's par, in rounds. */
  readonly par = input.required<number>();

  /** How many of the wall's rows still wait over the ceiling. */
  readonly rowsLeft = input.required<number>();

  /** The run's score. */
  readonly score = input.required<number>();

  /** Each friend's ink, 0 to 7, in the order they were freed: the crew's `friends`. */
  readonly friends = input.required<readonly number[]>();

  /** Where the run stands, which Pause shows. */
  readonly outcome = input.required<RunStage>();

  /**
   * Whether a flight is under way, paused or not, which Fast-forward and
   * Skip need: a player who tabs to them from the board leaves the play
   * room, which pauses the run, and can still press them.
   */
  readonly flying = input.required<boolean>();

  /** Whether the flight plays fast, which shows Fast-forward pressed. */
  readonly fast = input.required<boolean>();

  /** Whether the player wants sound. */
  readonly soundOn = input.required<boolean>();

  /** Emitted as the player pauses the run in play. */
  readonly pauseRun = output();

  /**
   * Emitted as the player goes on with the paused run, for the app to go on
   * and hand the board the focus, which a press from the keyboard took.
   */
  readonly resumeRun = output();

  /** Emitted with whether the flight should play fast from now on, as the player presses Fast-forward. */
  readonly fastForward = output<boolean>();

  /** Emitted as the player skips the flight, to land it at once. */
  readonly skipFlight = output();

  /** Emitted as the player turns the sound on or off. */
  readonly toggleSound = output();

  /** Emitted when the player asks for the levels, to start at one. */
  readonly openLevels = output();

  /** Emitted when the player asks for a new game. */
  readonly newGame = output();

  /** Emitted when the player asks how to play. */
  readonly openHelp = output();

  /** Emitted when the player asks for the settings. */
  readonly openSettings = output();

  /** Pause's name, which it shows under the pointer, as it doesn't itself: Resume while the run is paused. */
  protected readonly pauseName = computed(() =>
    this.outcome() === "paused" ? "Resume" : "Pause",
  );

  /** Whether the bar has room for the level, the rows left and the crew. */
  protected readonly fitsEveryFigure = computed(
    () => !this.viewport.isCompact() && this.viewport.fitsActionLabels(),
  );

  /** The rounds against par, as "4/9". */
  protected readonly roundsShown = computed(
    () => `${String(this.rounds())}/${String(this.par())}`,
  );

  /** The rounds against par in words, as "4 rounds, par 9", since "4/9" reads poorly. */
  protected readonly roundsText = computed(
    () =>
      `${count(this.rounds(), "round", "rounds")}, par ${String(this.par())}`,
  );

  /** The run's score, grouped in thousands. */
  protected readonly scoreShown = computed(() => formatPoints(this.score()));

  /** The crew as words, the player's fuzzball among them, since the fuzzballs are pictures. */
  protected readonly crewText = computed(() =>
    count(this.friends().length + 1, "fuzzball", "fuzzballs"),
  );

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() => {
    const actions: readonly BarOverflowAction<MenuAction>[] = [
      soundMenuAction(this.soundOn()),
      { id: "levels", label: "Levels", icon: "grid" },
      { id: "new-game", label: "New game", icon: "plus" },
      HELP_MENU_ACTION,
      SETTINGS_MENU_ACTION,
    ];
    return withHomeLink(actions, this.viewport.barHome());
  });

  /** Asks for the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "sound":
        this.toggleSound.emit();
        break;
      case "levels":
        this.openLevels.emit();
        break;
      case "new-game":
        this.newGame.emit();
        break;
      case "help":
        this.openHelp.emit();
        break;
      case "settings":
        this.openSettings.emit();
        break;
    }
  }
}
