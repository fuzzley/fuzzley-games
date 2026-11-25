import { Component, computed, inject, input, output } from "@angular/core";
import type { PointerAiming } from "@fz/brick-wall/view/aim_settings";
import { BugReportLoaderComponent } from "@fz/game-ui/bug_report";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { isOneOf } from "@fz/core/records";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import {
  FLIGHT_PACE,
  FLIGHT_SPEEDS,
  type FlightSpeed,
} from "../../view/play/pace";
import { AIMING_NAMES, SPEED_NAMES, guideName } from "./setting_names";
import { AIMINGS, GUIDE_TURNS, SettingsService } from "./settings.service";

/** What the drawer says under each way a pointer may aim. */
const AIMING_DETAILS: Readonly<Record<PointerAiming, string>> = {
  pointAndHold: "Point where to aim. Let go to shoot.",
  pullBack:
    "Drag from anywhere, away from where you want to shoot. Let go to shoot.",
};

/** The ways a pointer may aim, as the drawer offers them. */
const AIMING_CHOICES: readonly ChoiceOption<PointerAiming>[] = AIMINGS.map(
  (id) => ({ id, name: AIMING_NAMES[id], detail: AIMING_DETAILS[id] }),
);

/** The guide's lengths, as the drawer offers them, each by its turns written out, as a choice's id is a string. */
const GUIDE_CHOICES: readonly ChoiceOption[] = GUIDE_TURNS.map((turns) => ({
  id: String(turns),
  name: guideName(turns),
}));

/** What the drawer says under each of the flight's speeds. */
const SPEED_DETAILS: Readonly<Record<FlightSpeed, string>> = {
  normal: "Easy to follow every bounce.",
  fast: "Quicker, for a wall you know well.",
};

/** The flight's speeds, as the drawer offers them. */
const SPEED_CHOICES: readonly ChoiceOption<FlightSpeed>[] = FLIGHT_SPEEDS.map(
  (id) => ({ id, name: SPEED_NAMES[id], detail: SPEED_DETAILS[id] }),
);

/** What the drawer says under Fast-forward, from the pace. */
const FAST_FORWARD = `Plays every shot ${String(FLIGHT_PACE.fastForward)} times as fast, until you turn it off. Same as the Fast-forward button.`;

/**
 * Shows the settings in a drawer (`<fz-settings-drawer>`): how a pointer
 * aims, whether only the bar's Release lets a shot fly, how many turns
 * the guide follows a shot to, the flight's speed and fast-forward, the
 * sound, and the palette; and, where the game offers its debug menu, the
 * loader of a reported game state.
 *
 * None of the settings costs the run anything, since the rules decide a
 * round as it is released, whatever the flight looks like, so each
 * applies at once, and each is kept for the next visit.
 */
@Component({
  selector: "app-settings",
  imports: [
    BugReportLoaderComponent,
    ChoiceListComponent,
    SettingsDrawerComponent,
    ThemePickerComponent,
  ],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  private readonly store = inject(SettingsService);

  protected readonly settings = this.store.settings;

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close, or once a reported state loaded is in play. */
  readonly closed = output();

  protected readonly aimings = AIMING_CHOICES;

  protected readonly guides = GUIDE_CHOICES;

  protected readonly speeds = SPEED_CHOICES;

  protected readonly fastForward = FAST_FORWARD;

  /** The guide's length in use, as its choice's id. */
  protected readonly guide = computed(() => String(this.settings().guideTurns));

  /** Says how a finger and a mouse aim. */
  protected chooseAiming(aiming: PointerAiming): void {
    this.store.update({ aiming });
  }

  /** Has only the bar's Release let a shot fly, or a press let go too, as its checkbox says. */
  protected setReleaseByButton(releaseByButton: boolean): void {
    this.store.update({ releaseByButton });
  }

  /** Says how many turns the guide follows a shot to, as the choice's id writes them. */
  protected chooseGuide(id: string): void {
    const guideTurns = Number(id);
    if (isOneOf(guideTurns, GUIDE_TURNS)) this.store.update({ guideTurns });
  }

  /** Says how fast a flight plays back. */
  protected chooseSpeed(flightSpeed: FlightSpeed): void {
    this.store.update({ flightSpeed });
  }

  /** Turns fast-forward on or off, as its checkbox says. */
  protected setFastForward(fastForward: boolean): void {
    this.store.update({ fastForward });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }
}
