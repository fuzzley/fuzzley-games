import { Component, computed, inject, output } from "@angular/core";
import { count } from "@fz/core/format";
import {
  BarChoiceComponent,
  type BarChoiceOption,
} from "@fz/game-ui/bar_choice";
import {
  type BarOverflowAction,
  BarOverflowComponent,
  type BarOverflowItem,
  withHomeLink,
} from "@fz/game-ui/bar_overflow";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";

/** Where the link home leads: the Fuzzley Games site, which serves this game. */
const HOME_HREF = "/";

/** The speeds the badge offers, each with what it is like. */
const SPEED_CHOICES: readonly BarChoiceOption<Speed>[] = SPEEDS.map((id) => ({
  id,
  name: SPEED_INFO[id].name,
  detail: SPEED_INFO[id].says,
}));

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "levels" | "help" | "settings";

/** Describes the Pause button as the level stands. */
interface PauseButton {
  readonly label: string;
  readonly icon: IconName;
  /** Whether it does anything: there is a level in play or paused. */
  readonly able: boolean;
}

/**
 * Shows the game bar: the link home, the game's name and speed, the
 * figures, and the actions.
 *
 * The speed shows at every size, as a menu of the speeds; the name only for
 * a screen reader on a compact screen. From the width the actions keep their
 * labels at, the figures are the level, the score, the lives as hearts and
 * the streak's multiplier while it counts; below it, the score and the lives
 * alone, the lives as a number, since a score runs to six figures and the
 * lives to six.
 *
 * On a compact screen, Pause and New game stay, and Sound, Levels, How to
 * play and Settings move into the overflow menu, as on the narrowest the link home
 * does too.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarChoiceComponent,
    BarOverflowComponent,
    GameBarComponent,
    IconComponent,
  ],
  host: {
    "[class.score-and-lives]": "!fitsEveryFigure()",
    "[class.rail]": 'viewport.barPlacement() === "end"',
  },
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
})
export class BarComponent {
  protected readonly game = inject(GameService);
  protected readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService);

  /** Emitted when the player asks for the levels, to start at one. */
  readonly openLevels = output();

  /** Emitted when the player asks how to play. */
  readonly openHelp = output();

  /** Emitted when the player asks for the settings. */
  readonly openSettings = output();

  /** Emitted when the board should take the focus, as a level goes on. */
  readonly handBack = output();

  protected readonly homeHref = HOME_HREF;

  protected readonly speeds = SPEED_CHOICES;

  /** Whether the bar has room for the level, the hearts and the streak. */
  protected readonly fitsEveryFigure = computed(
    () => !this.viewport.isCompact() && this.viewport.fitsActionLabels(),
  );

  /** A heart for each life the run has. */
  protected readonly hearts = computed(() =>
    Array.from({ length: this.game.lives() }, (_, i) => i),
  );

  /** The lives as words, since the hearts are pictures. */
  protected readonly livesText = computed(() =>
    count(this.game.lives(), "life", "lives"),
  );

  /** How many times a hit scores, as "×2", while a streak makes it more than once; else null. */
  protected readonly streak = computed(() => {
    const times = this.game.multiplier();
    return times > 1 ? `×${String(times)}` : null;
  });

  /** Whether the player wants sound. */
  protected readonly sound = computed(() => this.settings.settings().sound);

  protected readonly pauseButton = computed<PauseButton>(() => {
    const outcome = this.game.outcome();
    return outcome === "paused"
      ? { label: "Resume", icon: "play", able: true }
      : { label: "Pause", icon: "pause", able: outcome === "playing" };
  });

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() => {
    const actions: readonly BarOverflowAction<MenuAction>[] = [
      this.sound()
        ? { id: "sound", label: "Turn sound off", icon: "sound-off" }
        : { id: "sound", label: "Turn sound on", icon: "sound" },
      { id: "levels", label: "Levels", icon: "grid" },
      { id: "help", label: "How to play", icon: "help" },
      { id: "settings", label: "Settings", icon: "settings" },
    ];
    return this.viewport.barHome() === "none"
      ? withHomeLink(actions, HOME_HREF)
      : actions;
  });

  /**
   * Keeps the focus on the board through a press with a pointer, so a level
   * in play isn't paused by the board losing it.
   */
  protected keepFocus(event: PointerEvent): void {
    event.preventDefault();
  }

  /**
   * Pauses the level in play, or goes on with a paused one and hands the
   * board the focus, which a press from the keyboard took away.
   */
  protected togglePause(): void {
    const { outcome } = this.game.run();
    if (outcome === "playing") {
      this.game.pause();
    } else if (outcome === "paused") {
      this.game.resume();
      this.handBack.emit();
    }
  }

  /** Turns the sound on or off, which the settings keep. */
  protected toggleSound(): void {
    this.settings.update({ sound: !this.sound() });
  }

  /** Starts a run at the speed chosen from the badge, asking first. */
  protected changeSpeed(speed: Speed): void {
    void this.game.changeSpeed(speed);
  }

  /** Starts a new run, asking first. */
  protected newGame(): void {
    void this.game.newGame();
  }

  /** Carries out the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "sound":
        this.toggleSound();
        break;
      case "levels":
        this.openLevels.emit();
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
