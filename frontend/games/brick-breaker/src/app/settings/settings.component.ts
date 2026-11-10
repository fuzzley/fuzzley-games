import { Component, computed, inject, input, output } from "@angular/core";
import { DEBUG_MENU, DebugTuningComponent } from "@fz/game-ui/debug_menu";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { formatCustomPercent } from "../../rules/run/describe";
import {
  CUSTOM_PERCENT,
  SPEED_INFO,
  type Speed,
  customFactor,
} from "../../rules/speed";
import {
  TOUCH_STEERINGS,
  type TouchSteering,
} from "../../view/steering/steering";
import { GameService } from "../play/game.service";
import { SPEED_CHOICES } from "./choices";
import {
  BALL_SPEED_SLIDER,
  formatScale,
  speedLines,
  unitsOf,
} from "./debug_tuning";
import { SettingsService } from "./settings.service";

/** What the drawer says of each way a finger may steer the paddle. */
const TOUCH_INFO: Readonly<
  Record<TouchSteering, Omit<ChoiceOption<TouchSteering>, "id">>
> = {
  drag: {
    name: "Drag",
    detail:
      "The paddle moves as far as your finger does, from anywhere on the field.",
  },
  follow: {
    name: "Follow the finger",
    detail: "The paddle goes wherever your finger is.",
  },
};

/** The ways a finger may steer the paddle, as the drawer offers them. */
const TOUCH_CHOICES: readonly ChoiceOption<TouchSteering>[] =
  TOUCH_STEERINGS.map((id) => ({ id, ...TOUCH_INFO[id] }));

/**
 * Shows the settings in a drawer: the speed, and the ball's at Custom, how a
 * finger steers the paddle, the sound, and the palette, and where
 * `DEBUG_MENU` offers it the debug menu (`<fz-debug-tuning>`), the ball's
 * speed to try.
 *
 * Choosing a speed starts a new run, after asking if one is under way, so
 * the speeds are radios the arrow keys move between without choosing. The
 * rest cost the run nothing, and apply at once.
 */
@Component({
  selector: "app-settings",
  imports: [
    ChoiceListComponent,
    DebugTuningComponent,
    SettingsDrawerComponent,
    ThemePickerComponent,
  ],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  private readonly game = inject(GameService);
  private readonly store = inject(SettingsService);

  protected readonly settings = this.store.settings;

  /**
   * Whether to offer the debug menu, as a development build does, and a
   * production one at `?debug`.
   */
  protected readonly debugMenu = inject(DEBUG_MENU);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  protected readonly speeds = SPEED_CHOICES;

  /** The run's speed, the one the speeds check. */
  protected readonly speed = this.game.speed;

  /** The bounds and steps of Custom's slider. */
  protected readonly customRange = CUSTOM_PERCENT;

  /** Custom's ball speed while the run is at Custom, and how it reads, else null. */
  protected readonly customSpeed = computed(() => {
    const value = this.game.customPercent();
    return value === null
      ? null
      : { value, valueText: formatCustomPercent(value) };
  });

  protected readonly touchSteerings = TOUCH_CHOICES;

  /**
   * The debug menu's slider, at the ball's speed as it scales it, how that
   * reads, and what it comes to at the run's speed.
   */
  protected readonly debugSliders = computed(() => {
    const value = this.game.ballSpeedScale();
    const speed = this.game.speed();
    const { name, base, top } = SPEED_INFO[speed];
    const scaled = value * customFactor(speed, this.settings().customPercent);
    return [
      {
        ...BALL_SPEED_SLIDER,
        value,
        valueText: formatScale(value),
        description:
          `At ${name}, the ball serves at ${unitsOf(base * scaled)} and ` +
          `climbs to ${unitsOf(top * scaled)} units a second, before a ` +
          `level's pace and what a capsule does to it.`,
      },
    ];
  });

  /** The ball's speed as the debug menu scales it, as the lines of `speed.ts` it would replace. */
  protected readonly debugLines = computed(() =>
    speedLines(this.game.ballSpeedScale()),
  );

  /** Starts a run at the speed chosen, unless it is the speed in use. */
  protected async chooseSpeed(speed: Speed): Promise<void> {
    if (speed === this.game.speed()) return;
    await this.game.changeSpeed(speed);
  }

  /** Sets Custom's ball speed, as its slider says. */
  protected setCustomPercent(percent: number): void {
    this.game.setCustomPercent(percent);
  }

  /** Says how a finger steers the paddle. */
  protected chooseTouch(touch: TouchSteering): void {
    this.store.update({ touch });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }

  /** Scales the ball's speed, as the debug menu's slider says. */
  protected setBallSpeedScale(scale: number): void {
    this.game.setBallSpeedScale(scale);
  }

  /** Puts the ball's speed back to the speed's own, as Reset the numbers asks. */
  protected resetBallSpeed(): void {
    this.game.setBallSpeedScale(1);
  }
}
