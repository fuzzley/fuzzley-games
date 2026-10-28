import { Component, computed, inject, output } from "@angular/core";
import {
  type BarOverflowAction,
  BarOverflowComponent,
  type BarOverflowItem,
  withHomeLink,
} from "@fz/game-ui/bar_overflow";
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { SPEED_INFO } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { SettingsService } from "../settings/settings.service";

/** Where the link home leads: the Fuzzley Games site, which serves this game. */
const HOME_HREF = "/";

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "help" | "settings";

/** Describes the Pause button as the run stands. */
interface PauseButton {
  readonly label: string;
  readonly icon: IconName;
  /** Whether it does anything: there is a run under way or paused. */
  readonly able: boolean;
}

/**
 * Shows the game bar: the link home, the game's name and speed, the score
 * and the best, and the actions. The speed shows at every size; the name
 * only for a screen reader on a compact screen.
 *
 * On a compact screen, Pause and New Game stay, and Sound, How to play and
 * Settings move into the overflow menu, as on the narrowest the link home
 * does too.
 */
@Component({
  selector: "app-bar",
  imports: [BarOverflowComponent, GameBarComponent, IconComponent],
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

  protected readonly homeHref = HOME_HREF;

  protected readonly speed = computed(
    () => SPEED_INFO[this.game.run().speed].name,
  );

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
      { id: "help", label: "How to play", icon: "help" },
      { id: "settings", label: "Settings", icon: "settings" },
    ];
    return this.viewport.barHome() === "none"
      ? withHomeLink(actions, HOME_HREF)
      : actions;
  });

  /**
   * Keeps the focus on the board through a press with a pointer, so a run
   * under way isn't paused by the board losing it.
   */
  protected keepFocus(event: PointerEvent): void {
    event.preventDefault();
  }

  /**
   * Pauses the run, or goes on with a paused one and hands the board the
   * focus, which a press from the keyboard took away.
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
