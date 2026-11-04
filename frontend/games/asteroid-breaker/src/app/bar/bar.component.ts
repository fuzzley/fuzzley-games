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
import { GameBarComponent } from "@fz/game-ui/game_bar";
import { GameViewportService } from "@fz/game-ui/viewport";
import { IconComponent, type IconName } from "@fz/ui/icon";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import { PilotComponent } from "../pilot/pilot.component";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";

/** Where the link home leads: the Fuzzley Games site, which serves this game. */
const HOME_HREF = "/";

/** The speeds the badge offers, each with what it is like. */
const SPEED_CHOICES: readonly BarChoiceOption<Speed>[] = SPEEDS.map((id) => ({
  id,
  name: SPEED_INFO[id].name,
  detail: SPEED_INFO[id].says,
}));

/** Names an action the overflow menu offers. */
type MenuAction = "sectors" | "help" | "settings";

/** Describes the Pause button as the wave stands. */
interface PauseButton {
  readonly label: string;
  readonly icon: IconName;
  /** Whether it does anything: there is a wave in play or paused. */
  readonly able: boolean;
}

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
 * On a compact screen, Pause and New game stay, and Sectors, How to play
 * and Settings move into the overflow menu, as on the narrowest the link
 * home does too.
 */
@Component({
  selector: "app-bar",
  imports: [
    BarChoiceComponent,
    BarOverflowComponent,
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

  /** Emitted when the player asks for the sectors, to start at one. */
  readonly openSectors = output();

  /** Emitted when the player asks how to play. */
  readonly openHelp = output();

  /** Emitted when the player asks for the settings. */
  readonly openSettings = output();

  /** Emitted when the board should take the focus, as a wave goes on. */
  readonly handBack = output();

  protected readonly homeHref = HOME_HREF;

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
      { id: "sectors", label: "Sectors", icon: "grid" },
      { id: "help", label: "How to play", icon: "help" },
      { id: "settings", label: "Settings", icon: "settings" },
    ];
    return this.viewport.barHome() === "none"
      ? withHomeLink(actions, HOME_HREF)
      : actions;
  });

  /**
   * Keeps the focus on the board through a press with a pointer, so a wave
   * in play isn't paused by the board losing it.
   */
  protected keepFocus(event: PointerEvent): void {
    event.preventDefault();
  }

  /**
   * Pauses the wave in play, or goes on with a paused one and hands the
   * board the focus, which a press from the keyboard took away.
   */
  protected togglePause(): void {
    const outcome = this.game.outcome();
    if (outcome === "playing") {
      this.game.pause();
    } else if (outcome === "paused") {
      this.game.resume();
      this.handBack.emit();
    }
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
