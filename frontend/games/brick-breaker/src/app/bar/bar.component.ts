import { Component, computed, inject, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
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
import { BarPauseComponent } from "@fz/game-ui/bar_pause";
import { BarSoundComponent, soundMenuAction } from "@fz/game-ui/bar_sound";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { FuzzballComponent } from "@fz/ui/fuzzball";
import { IconComponent } from "@fz/ui/icon";
import { formatCustomPercent } from "../../rules/run/describe";
import {
  CUSTOM_PERCENT,
  SPEEDS,
  SPEED_INFO,
  type Speed,
} from "../../rules/speed";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";

/** The speeds the badge offers, each with what it is like. */
const SPEED_CHOICES: readonly BarChoiceOption<Speed>[] = SPEEDS.map((id) => ({
  id,
  name: SPEED_INFO[id].name,
  detail: SPEED_INFO[id].says,
}));

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "levels" | "help" | "settings";

/**
 * Shows the game bar: the link home, the game's name and speed, the
 * figures, and the actions.
 *
 * The speed shows at every size, as a menu of the speeds, which at Custom
 * offers a slider for its ball's speed beneath them; the name only for a
 * screen reader on a compact screen. From the width the actions keep their
 * labels at, the figures are the level, the score, the lives as the balls
 * still to play, each the fuzzball the field draws, and the streak's
 * multiplier while it counts; below it, the score and the lives alone, the
 * lives as a number beside a ball, since a score runs to six figures and
 * the lives to six.
 *
 * On a compact screen, Pause and New game stay, and Sound, Levels, How to
 * play and Settings move into the overflow menu, as on the narrowest the
 * link home does too.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarChoiceComponent,
    BarOverflowComponent,
    BarPauseComponent,
    BarSoundComponent,
    FuzzballComponent,
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

  protected readonly speeds = SPEED_CHOICES;

  /** The bounds and steps of Custom's slider. */
  protected readonly customRange = CUSTOM_PERCENT;

  /** Custom's ball speed while the run is at Custom, as its slider shows it and reads it; else null. */
  protected readonly customSpeed = computed(() => {
    const value = this.game.customPercent();
    return value === null
      ? null
      : {
          value,
          shown: `${String(value)}%`,
          valueText: formatCustomPercent(value),
        };
  });

  /** Whether the bar has room for the level, the balls and the streak. */
  protected readonly fitsEveryFigure = computed(
    () => !this.viewport.isCompact() && this.viewport.fitsActionLabels(),
  );

  /** A ball for each life the run has. */
  protected readonly balls = computed(() =>
    Array.from({ length: this.game.lives() }, (_, i) => i),
  );

  /** The lives as words, since the balls are pictures. */
  protected readonly livesText = computed(() =>
    count(this.game.lives(), "life", "lives"),
  );

  /** The run's score, grouped in thousands. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** How many times a hit scores, as "×2", while a streak makes it more than once; else null. */
  protected readonly streak = computed(() => {
    const times = this.game.multiplier();
    return times > 1 ? `×${String(times)}` : null;
  });

  /** Whether the player wants sound. */
  protected readonly sound = computed(() => this.settings.settings().sound);

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() => {
    const actions: readonly BarOverflowAction<MenuAction>[] = [
      soundMenuAction(this.sound()),
      { id: "levels", label: "Levels", icon: "grid" },
      { id: "help", label: "How to play", icon: "help" },
      { id: "settings", label: "Settings", icon: "settings" },
    ];
    return this.viewport.barHome() === "none" ? withHomeLink(actions) : actions;
  });

  /**
   * Goes on with the paused level and hands the board the focus, which a
   * press on Resume from the keyboard took away.
   */
  protected resume(): void {
    this.game.resume();
    this.handBack.emit();
  }

  /** Turns the sound on or off, which the settings keep. */
  protected toggleSound(): void {
    this.settings.update({ sound: !this.sound() });
  }

  /** Starts a run at the speed chosen from the badge, asking first. */
  protected changeSpeed(speed: Speed): void {
    void this.game.changeSpeed(speed);
  }

  /** Sets Custom's ball speed, as the menu's slider says. */
  protected setCustomPercent(percent: number): void {
    this.game.setCustomPercent(percent);
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
