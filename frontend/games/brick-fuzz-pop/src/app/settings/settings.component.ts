import { Component, inject, input, output } from "@angular/core";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import {
  AIMINGS,
  type Aiming,
  FLIGHT_SPEEDS,
  type FlightSpeed,
  SettingsService,
} from "./settings.service";

/** What the drawer says of each way a pointer may aim. */
const AIMING_INFO: Readonly<Record<Aiming, Omit<ChoiceOption<Aiming>, "id">>> =
  {
    byPointer: {
      name: "By the pointer",
      detail: "A finger pulls back, and a mouse points and holds.",
    },
    pullBack: {
      name: "Pull back",
      detail:
        "Press anywhere on the field and drag away from the aim: the longer the pull, the more charge. Let go to fly.",
    },
    pointAndHold: {
      name: "Point and hold",
      detail:
        "Point where to aim, then hold to charge, up to five and down again. Let go to fly.",
    },
  };

/** The ways a pointer may aim, as the drawer offers them. */
const AIMING_CHOICES: readonly ChoiceOption<Aiming>[] = AIMINGS.map((id) => ({
  id,
  ...AIMING_INFO[id],
}));

/** What the drawer says of each of the flight's speeds. */
const FLIGHT_SPEED_INFO: Readonly<
  Record<FlightSpeed, Omit<ChoiceOption<FlightSpeed>, "id">>
> = {
  normal: {
    name: "Normal",
    detail: "Every bounce easy to follow.",
  },
  fast: {
    name: "Fast",
    detail: "Quicker, for a wall you know well.",
  },
};

/** The flight's speeds, as the drawer offers them. */
const FLIGHT_SPEED_CHOICES: readonly ChoiceOption<FlightSpeed>[] =
  FLIGHT_SPEEDS.map((id) => ({ id, ...FLIGHT_SPEED_INFO[id] }));

/**
 * Shows the settings in a drawer: how a pointer aims, the flight's speed,
 * whether a long flight speeds up by itself, the guide, the sound, and the
 * palette.
 *
 * None of them costs the run anything, since the rules decide a round as it
 * is released whatever the flight looks like, so each applies at once.
 */
@Component({
  selector: "app-settings",
  imports: [ChoiceListComponent, SettingsDrawerComponent, ThemePickerComponent],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  private readonly store = inject(SettingsService);

  protected readonly settings = this.store.settings;

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  protected readonly aimings = AIMING_CHOICES;

  protected readonly flightSpeeds = FLIGHT_SPEED_CHOICES;

  /** Says how a finger and a mouse aim. */
  protected chooseAiming(aiming: Aiming): void {
    this.store.update({ aiming });
  }

  /** Says how fast a flight plays back. */
  protected chooseFlightSpeed(flightSpeed: FlightSpeed): void {
    this.store.update({ flightSpeed });
  }

  /** Has a long flight speed up by itself or not, as its checkbox says. */
  protected setSpeedUpLongFlights(speedUpLongFlights: boolean): void {
    this.store.update({ speedUpLongFlights });
  }

  /** Shows the guide or hides it, as its checkbox says. */
  protected setGuide(guide: boolean): void {
    this.store.update({ guide });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }
}
