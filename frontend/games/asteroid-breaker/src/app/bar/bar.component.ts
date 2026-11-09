import { Component, computed, inject, output } from "@angular/core";
import { count, formatPoints } from "@fz/core/format";
import { BarChoiceComponent } from "@fz/game-ui/bar_choice";
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
import { IconComponent } from "@fz/ui/icon";
import type { Speed } from "../../rules/speed";
import { PilotComponent } from "../pilot/pilot.component";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";
import { SPEED_CHOICES } from "../settings/choices";
import { SettingsService } from "../settings/settings.service";

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "sectors" | "help" | "settings";

/**
 * Shows the game bar: the link home, the game's name and speed, the
 * figures, and the actions.
 *
 * The speed shows at every size, as a menu of the speeds; the name only for
 * a screen reader on a compact screen. From the width the actions keep
 * their labels at, the figures are the wave, the score, the ships as their
 * pilots, the one at the controls first, and the chain's multiplier while
 * it counts; below it, the score and the ships alone, the ships as a
 * number beside the pilot at the controls, since a score runs to six
 * figures.
 *
 * On a compact screen, Pause and New game stay, and Sound, Sectors, How to
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
    GameBarComponent,
    IconComponent,
    PilotComponent,
    PilotRowComponent,
  ],
  host: {
    "[class.score-and-ships]": "!fitsEveryFigure()",
    "[class.rail]": 'viewport.barPlacement() === "end"',
  },
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
})
export class BarComponent {
  protected readonly game = inject(GameService);
  protected readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService);

  /** Emitted when the player asks for the sectors, to start at one. */
  readonly openSectors = output();

  /** Emitted when the player asks how to play. */
  readonly openHelp = output();

  /** Emitted when the player asks for the settings. */
  readonly openSettings = output();

  /** Emitted when the board should take the focus, as a wave goes on. */
  readonly handBack = output();

  protected readonly speeds = SPEED_CHOICES;

  /** Whether the bar has room for the wave, the pilots and the chain. */
  protected readonly fitsEveryFigure = computed(
    () => !this.viewport.isCompact() && this.viewport.fitsActionLabels(),
  );

  /** The pilots of the run's ships, the one at the controls first. */
  protected readonly pilots = computed(() => this.game.crew().flying);

  /** The pilot at the controls, beside the ships' number, or null once none is left. */
  protected readonly atControls = computed(() => this.pilots()[0] ?? null);

  /** The ships as words, since the pilots are pictures. */
  protected readonly shipsText = computed(() =>
    count(this.game.ships(), "ship", "ships"),
  );

  /** The run's score, grouped in thousands. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** How many times a break scores, as "×2", while a chain makes it more than once; else null. */
  protected readonly chain = computed(() => {
    const times = this.game.chain();
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
      { id: "sectors", label: "Sectors", icon: "grid" },
      { id: "help", label: "How to play", icon: "help" },
      { id: "settings", label: "Settings", icon: "settings" },
    ];
    return this.viewport.barHome() === "none" ? withHomeLink(actions) : actions;
  });

  /**
   * Goes on with the paused wave and hands the board the focus, which a
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
      case "sectors":
        this.openSectors.emit();
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
