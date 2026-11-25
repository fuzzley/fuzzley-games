import { Component, computed, inject, input, output } from "@angular/core";
import type { Nudge } from "@fz/brick-wall/view/aiming";
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
import { FastForwardComponent } from "./fast_forward.component";
import { showsEveryFigure } from "./figures";
import { figuresPairedBesideRelease, homeBesideRelease } from "./release_room";
import { SkipComponent } from "./skip.component";

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "levels" | "new-game" | "help" | "settings";

/**
 * Shows the game bar: the link home, the game's name, the figures, and the
 * actions, from what it is handed, asking the app for each action.
 *
 * From the desktop width (`fitsActionLabels`), unless the window is compact
 * (`showsEveryFigure()`), the figures are the level, the shots against par,
 * the rows left, the level's best rally against its rally mark and the
 * score; otherwise the shots and the score alone, as the Ready card, the
 * lintel and the rally beside the fuzzball give the rest.
 *
 * Every action is round at every size, its name heard and shown under the
 * pointer. Where the bar has room, Pause, the two Nudges, Release where the
 * settings ask for it, Fast-forward and Skip all stay, each dimmed while a
 * press would do nothing, so nothing moves as a flight starts: the Nudges
 * and Release live while a shot is aimed, Skip while one flies, and
 * Fast-forward, a switch, at any time. On a compact screen the two pairs
 * take turns beside Pause, the Nudges and Release while a shot is aimed,
 * Fast-forward and Skip the rest of the time, so the bar moves as a flight
 * starts: a second press where Release was lands on More actions, which
 * only opens the menu. The Nudges and Release are for a pointer: the focus
 * leaving the board pauses the level, which dims them, and the keys do the
 * same from the board, Shift with Left or Right and Space. On a compact
 * screen Sound, Levels, New game, How to play and Settings move into the
 * overflow menu, as on the narrowest the link home does too, and on the
 * shortest rail with Release the figures share one card.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarOverflowComponent,
    BarPauseComponent,
    BarSoundComponent,
    FastForwardComponent,
    FuzzballComponent,
    GameBarComponent,
    IconComponent,
    SkipComponent,
  ],
  host: {
    "[class.rounds-and-score]": "!fitsEveryFigure()",
    "[class.rail]": 'viewport.barPlacement() === "end"',
    "[class.release-by-button]": "releaseByButton()",
    "[class.paired]": "figuresPaired()",
  },
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
})
export class BarComponent {
  protected readonly viewport = inject(GameViewportService);

  /** The number of the level in play, from 1. */
  readonly level = input.required<number>();

  /** The shots the level in play has taken. */
  readonly rounds = input.required<number>();

  /** The level in play's par, in shots. */
  readonly par = input.required<number>();

  /** How many of the wall's rows still wait over the ceiling. */
  readonly rowsLeft = input.required<number>();

  /** The level in play's best rally, a flight's counted as it plays back. */
  readonly bestRally = input.required<number>();

  /** The level in play's rally mark. */
  readonly rallyMark = input.required<number>();

  /** The run's score. */
  readonly score = input.required<number>();

  /** Where the run stands, which Pause shows. */
  readonly outcome = input.required<RunStage>();

  /** Whether a shot is being aimed, which the Nudges and Release need. */
  readonly aiming = input.required<boolean>();

  /**
   * Whether a flight is in the air, paused or not, which Skip needs: a
   * player who tabs to it from the board leaves the play room, which pauses
   * the run, and can still press it.
   */
  readonly flying = input.required<boolean>();

  /** Whether the settings ask for a button to release the shot. */
  readonly releaseByButton = input.required<boolean>();

  /** Whether fast-forward is on, which shows Fast-forward pressed. */
  readonly fast = input.required<boolean>();

  /** Whether the player wants sound. */
  readonly soundOn = input.required<boolean>();

  /**
   * Whether How to play is loading after a press, which shows its
   * button busy, or the overflow menu's on a compact screen.
   */
  readonly helpLoading = input(false);

  /** Emitted as the player pauses the run in play. */
  readonly pauseRun = output();

  /**
   * Emitted as the player goes on with the paused run, for the app to go on
   * and hand the board the focus, which a press from the keyboard took.
   */
  readonly resumeRun = output();

  /** Emitted as the player nudges the aim a quarter of a degree, left or right. */
  readonly nudge = output<Nudge>();

  /** Emitted as the player releases the shot aimed. */
  readonly releaseShot = output();

  /** Emitted as the player presses Fast-forward, to switch it on or off. */
  readonly fastForward = output();

  /** Emitted as the player skips the flight in the air. */
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

  /** The link home, a step smaller where Release with a button needs its room. */
  protected readonly home = homeBesideRelease(this.releaseByButton);

  /** Whether the rail sets the shots over the score in one card, where Release with a button needs their room. */
  protected readonly figuresPaired = figuresPairedBesideRelease(
    this.releaseByButton,
  );

  /** Pause's name, which it shows under the pointer, as it doesn't itself: Resume while the run is paused. */
  protected readonly pauseName = computed(() =>
    this.outcome() === "paused" ? "Resume" : "Pause",
  );

  /** Whether the bar has room for the level, the rows left and the best rally. */
  protected readonly fitsEveryFigure = computed(() =>
    showsEveryFigure(this.viewport),
  );

  /** The shots against par, as "4/9". */
  protected readonly roundsShown = computed(
    () => `${String(this.rounds())}/${String(this.par())}`,
  );

  /** The shots against par in words, as "4 shots, par 9", since "4/9" reads poorly. */
  protected readonly roundsText = computed(
    () => `${count(this.rounds(), "shot", "shots")}, par ${String(this.par())}`,
  );

  /** The best rally against the rally mark, as "11/24". */
  protected readonly rallyShown = computed(
    () => `${String(this.bestRally())}/${String(this.rallyMark())}`,
  );

  /** The best rally against the rally mark in words, as "11, rally mark 24". */
  protected readonly rallyText = computed(
    () => `${String(this.bestRally())}, rally mark ${String(this.rallyMark())}`,
  );

  /** The run's score, grouped in thousands. */
  protected readonly scoreShown = computed(() => formatPoints(this.score()));

  /**
   * Whether the bar shows the Nudges and Release: always where it has room,
   * and on a compact screen only while a shot is aimed, as Fast-forward and
   * Skip take their places the rest of the time, so the bar holds four
   * actions there, as Brick Fuzz Pop's does, or five with Release.
   */
  protected readonly showsAiming = computed(
    () => !this.viewport.isCompact() || this.aiming(),
  );

  /** Whether the bar shows Fast-forward and Skip: always where it has room, and on a compact screen while no shot is aimed. */
  protected readonly showsFlight = computed(
    () => !this.viewport.isCompact() || !this.aiming(),
  );

  /** Whether a press on a Nudge or Release would do nothing, which dims them, as "true", or null. */
  protected readonly aimDimmed = computed(() =>
    this.aiming() ? null : "true",
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
    return withHomeLink(actions, this.home());
  });

  /** Nudges the aim, as a Nudge asks, while a shot is aimed. */
  protected nudgeAim(toward: Nudge): void {
    if (this.aiming()) this.nudge.emit(toward);
  }

  /** Releases the shot, as Release asks, while one is aimed. */
  protected release(): void {
    if (this.aiming()) this.releaseShot.emit();
  }

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
