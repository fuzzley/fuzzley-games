import { Component, computed, inject, input, output } from "@angular/core";
import { DialogComponent } from "@fz/ui/dialog";
import { IconComponent } from "@fz/ui/icon";
import { RadioGroupDirective } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { SPEEDS, SPEED_INFO, type Speed } from "../../rules/speed";
import { TOUCH_STEERINGS, type TouchSteering } from "../../view/steering";
import { GameService } from "../play/game.service";
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

/**
 * Shows the settings in a drawer: the speed, how a finger steers the
 * paddle, the sound, and the palette.
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

  protected readonly touchSteerings = computed(() => {
    const current = this.settings().touch;
    return TOUCH_STEERINGS.map((id) => ({
      id,
      ...TOUCH_INFO[id],
      checked: id === current,
    }));
  });

  /** Starts a run at the speed chosen, unless it is the speed in use. */
  protected async chooseSpeed(speed: Speed): Promise<void> {
    if (speed === this.game.speed()) return;
    await this.game.changeSpeed(speed);
  }

  /** Says how a finger steers the paddle. */
  protected chooseTouch(touch: TouchSteering): void {
    this.store.update({ touch });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }
}
