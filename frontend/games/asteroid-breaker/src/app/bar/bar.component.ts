import { Component, computed, inject, output } from "@angular/core";
import { formatPoints } from "@fz/core/format";
import { BarChoiceComponent } from "@fz/game-ui/bar_choice";
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
import { IconComponent } from "@fz/ui/icon";
import type { Speed } from "../../rules/speed";
import { STATIC_STEPS } from "../../rules/tuning";
import { crewLineOf, crewWords } from "../../view/crew_line";
import { FaceCamComponent } from "../face_cam/face_cam.component";
import { PilotRowComponent } from "../pilot/pilot_row.component";
import { GameService } from "../play/game.service";
import { SPEED_CHOICES } from "../settings/choices";
import { SettingsService } from "../settings/settings.service";

/** Names an action the overflow menu offers. */
type MenuAction = "sound" | "sectors" | "new-game" | "help" | "settings";

/** Each of static's pips, one for each multiplier up to its last step's. */
const PIPS = Array.from({ length: STATIC_STEPS[0].times }, (_, pip) => pip);

/**
 * Shows the game bar: the link home, the game's name and speed, the
 * figures, and the actions.
 *
 * The speed shows at every size, as a menu of the speeds; the name only for
 * a screen reader on a compact screen. The crew's figure leads with the
 * face cam, the pilot at the controls with the face and the fur the field
 * shows, and static's with how many times what is scored scores, as a
 * number and four pips. From the width the actions keep their labels at,
 * the figures are the wave, the score, the crew, each in tow and each
 * knocked loose beside the face cam, or, past three, a count of them
 * (`crewLineOf()`), and static, each a card; below it, the score, the crew
 * and static in one card, or stacked on a rail, the crew aboard a number
 * on the face cam, since a score runs to six figures.
 *
 * On a compact screen, Pause stays, and Sound, Sectors, New game, How to
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
    FaceCamComponent,
    IconComponent,
    PilotRowComponent,
  ],
  host: {
    "[class.three-figures]": "!fitsEveryFigure()",
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

  /** Whether the bar has room for the wave, and a card for each figure. */
  protected readonly fitsEveryFigure = computed(
    () => !this.viewport.isCompact() && this.viewport.fitsActionLabels(),
  );

  /** The pilot at the controls, in the face cam, or null once none is left. */
  protected readonly atControls = computed(() => this.game.crew().pilot);

  /** The crew beside the face cam, drawn or counted, where the bar has room for them. */
  protected readonly line = computed(() =>
    crewLineOf(this.game.crew().tow, this.game.loose()),
  );

  /**
   * The crew as words, since the pilots are pictures: how many ride in tow
   * where the bar draws them, or how many are aboard where it gives that
   * number on the face cam, and how many are knocked loose.
   */
  protected readonly crewText = computed(() =>
    crewWords(
      this.game.crew(),
      this.game.loose(),
      this.fitsEveryFigure() ? "line" : "aboard",
    ),
  );

  /** The run's score, grouped in thousands. */
  protected readonly score = computed(() => formatPoints(this.game.score()));

  /** How many times what is scored scores, as "×2". */
  protected readonly multiplier = computed(
    () => `×${String(this.game.multiplier())}`,
  );

  /** Whether each pip is lit: as many as the times what is scored scores. */
  protected readonly pips = computed(() => {
    const times = this.game.multiplier();
    return PIPS.map((pip) => pip < times);
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
      { id: "new-game", label: "New game", icon: "plus" },
      HELP_MENU_ACTION,
      SETTINGS_MENU_ACTION,
    ];
    return withHomeLink(actions, this.viewport.barHome());
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
      case "new-game":
        this.newGame();
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
