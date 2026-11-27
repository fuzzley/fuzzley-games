import { Component, inject, input, output } from "@angular/core";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { SPEEDS, type Speed } from "../../view/timeline/pace";
import { SettingsService } from "./settings.service";
import { SPEED_NAMES } from "./speed_names";

/** What the drawer says under each speed's name. */
const SPEED_DETAILS: Readonly<Record<Speed, string>> = {
  normal: "Easy to follow every bunch.",
  fast: "Quicker, for levels you know well.",
};

/** Each speed, as the drawer offers it. */
const SPEED_CHOICES: readonly ChoiceOption<Speed>[] = SPEEDS.map((id) => ({
  id,
  name: SPEED_NAMES[id],
  detail: SPEED_DETAILS[id],
}));

/**
 * Shows the settings in a drawer (`<fz-settings-drawer>`): the speed a
 * move plays at (C6), Less motion (C7), the sound and the palette, each
 * taken at once and kept for the next visit.
 */
@Component({
  selector: "app-settings",
  imports: [ChoiceListComponent, SettingsDrawerComponent, ThemePickerComponent],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  protected readonly store = inject(SettingsService);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  protected readonly speeds = SPEED_CHOICES;

  /** Sets how fast a move plays. */
  protected chooseSpeed(speed: Speed): void {
    this.store.update({ speed });
  }

  /** Turns Less motion on or off, as its checkbox says. */
  protected setLessMotion(lessMotion: boolean): void {
    this.store.update({ lessMotion });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }
}
