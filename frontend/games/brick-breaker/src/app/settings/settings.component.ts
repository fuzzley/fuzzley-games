import { Component, computed, inject, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { RadioGroupDirective } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import {
  CUSTOM_PERCENT,
  SPEEDS,
  SPEED_INFO,
  type Speed,
  customFactor,
} from "../../rules/speed";
import { TOUCH_STEERINGS, type TouchSteering } from "../../view/steering";
import { GameService } from "../play/game.service";
import { DEBUG_MENU } from "../tokens";
import { SettingsService } from "./settings.service";

/** Describes one choice of a setting, as the drawer offers it. */
interface ChoiceInfo {
  readonly name: string;
  readonly says: string;
}

/** What the drawer says of each way a finger may steer the paddle. */
const TOUCH_INFO: Readonly<Record<TouchSteering, ChoiceInfo>> = {
  drag: {
    name: "Drag",
    says: "The paddle moves as far as your finger does, from anywhere on the field.",
  },
  follow: {
    name: "Follow the finger",
    says: "The paddle goes wherever your finger is.",
  },
};

/** Returns a speed in units a second as the debug menu writes it, to a tenth. */
function unitsOf(speed: number): string {
  return String(Math.round(speed * 10) / 10);
}

/**
 * Shows the settings in a drawer: the speed, and the ball's at Custom, how a
 * finger steers the paddle, the sound, and the palette, and in a
 * development build the ball's speed to try.
 *
 * Choosing a speed starts a new run, after asking if one is under way, so
 * the speeds are radios the arrow keys move between without choosing. The
 * rest cost the run nothing, and apply at once.
 */
@Component({
  selector: "app-settings",
  imports: [
    DialogComponent,
    IconComponent,
    RadioGroupDirective,
    ThemePickerComponent,
  ],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  private readonly game = inject(GameService);
  private readonly store = inject(SettingsService);

  protected readonly settings = this.store.settings;

  /** Whether to offer the debug menu, as a development build does. */
  protected readonly debugMenu = inject(DEBUG_MENU);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  protected readonly speeds = computed(() => {
    const current = this.game.speed();
    return SPEEDS.map((id) => ({
      id,
      name: SPEED_INFO[id].name,
      says: SPEED_INFO[id].says,
      checked: id === current,
    }));
  });

  /** The bounds and steps of Custom's slider. */
  protected readonly customRange = CUSTOM_PERCENT;

  /** Custom's ball speed while the run is at Custom, and how it reads, else null. */
  protected readonly customSpeed = computed(() => {
    if (this.game.speed() !== "custom") return null;
    const value = this.settings().customPercent;
    return { value, valueText: `${String(value)}% of Normal` };
  });

  protected readonly touchSteerings = computed(() => {
    const current = this.settings().touch;
    return TOUCH_STEERINGS.map((id) => ({
      id,
      ...TOUCH_INFO[id],
      checked: id === current,
    }));
  });

  /** The ball's speed as the debug menu scales it, and what it comes to at the run's speed. */
  protected readonly ballSpeedScale = computed(() => {
    const value = this.game.ballSpeedScale();
    const speed = this.game.speed();
    const { name, base, top } = SPEED_INFO[speed];
    const scaled = value * customFactor(speed, this.settings().customPercent);
    const scale = `×${value.toFixed(2)}`;
    return {
      value,
      scale,
      says:
        `${scale}: at ${name}, the ball serves at ${unitsOf(base * scaled)} ` +
        `and climbs to ${unitsOf(top * scaled)} units a second, before a ` +
        `level's pace and what a capsule does to it.`,
    };
  });

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
}
