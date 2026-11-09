import { Component, computed, inject, output } from "@angular/core";
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
import { IconComponent } from "@fz/ui/icon";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";

/** The speeds the badge offers, each with what it is like. */
const SPEED_CHOICES: readonly BarChoiceOption<Speed>[] = SPEEDS.map((id) => ({
  id,
  name: SPEED_INFO[id].name,
  detail: SPEED_INFO[id].says,
}));

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "help" | "settings";

/**
 * Shows the game bar: the link home, the game's name and speed, the score
 * and the best, and the actions. The speed shows at every size, as a menu of
 * the speeds; the name only for a screen reader on a compact screen.
 *
 * On a compact screen, Pause and New game stay, and Sound, How to play and
 * Settings move into the overflow menu, as on the narrowest the link home
 * does too.
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
  ],
  host: {
    "[class.compact]": "viewport.isCompact()",
    "[class.rail]": 'viewport.barPlacement() === "end"',
  },
  templateUrl: "./bar.component.html",
  styleUrl: "./bar.component.scss",
})
export class BarComponent {
  protected readonly game = inject(GameService);
  protected readonly viewport = inject(GameViewportService);
  private readonly settings = inject(SettingsService);

  /** Emitted when the player asks how to play. */
  readonly openHelp = output();

  /** Emitted when the player asks for the settings. */
  readonly openSettings = output();

  /** Emitted when the board should take the focus, as a run goes on. */
  readonly handBack = output();

  protected readonly speeds = SPEED_CHOICES;

  protected readonly sound = computed(() => this.settings.settings().sound);

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() => {
    const actions: readonly BarOverflowAction<MenuAction>[] = [
      soundMenuAction(this.sound()),
      { id: "help", label: "How to play", icon: "help" },
      { id: "settings", label: "Settings", icon: "settings" },
    ];
    return this.viewport.barHome() === "none" ? withHomeLink(actions) : actions;
  });

  /**
   * Goes on with the paused run and hands the board the focus, which a
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

  /** Carries out the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "sound":
        this.toggleSound();
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
