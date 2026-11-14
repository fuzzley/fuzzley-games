import {
  Component,
  ViewContainerRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  outputBinding,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { AnnouncerComponent, AnnouncerService } from "@fz/ui/announcer";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { onDemand } from "../on_demand";
import { LOAD_DEBUG_MENU } from "../tokens";
import {
  AIMINGS,
  type Aiming,
  FLIGHT_SPEEDS,
  type FlightSpeed,
  SettingsService,
} from "./settings.service";

/** What the announcer says when the debug menu couldn't be loaded. */
export const MENU_FAILED_WORDS =
  "The debug menu couldn't be loaded. Check the connection, then open the settings again.";

/** What the drawer says of each way a pointer may aim. */
const AIMING_INFO: Readonly<Record<Aiming, Omit<ChoiceOption<Aiming>, "id">>> =
  {
    pointAndHold: {
      name: "Point and hold",
      detail:
        "Point where to aim, then hold to charge, up to five and down again. Let go to fly.",
    },
    pullBack: {
      name: "Pull back",
      detail:
        "Press anywhere on the field and drag away from the aim: the longer the pull, the more charge. Let go to fly.",
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
 * palette; and, where `DEBUG_MENU` offers it, the debug menu
 * (`<app-debug-menu>`) below them, loaded once the drawer is first drawn
 * (`onDemand()`), so a page that doesn't offer it never loads it, saying it
 * loads meanwhile; one that fails to load the announcer says so, if the
 * drawer is open, and the drawer tries again as it next opens.
 *
 * None of the settings costs the run anything, since the rules decide a
 * round as it is released whatever the flight looks like, so each applies
 * at once. The debug menu's numbers and open levels can cost it its
 * records, as the menu says.
 */
@Component({
  selector: "app-settings",
  imports: [
    AnnouncerComponent,
    ChoiceListComponent,
    SettingsDrawerComponent,
    ThemePickerComponent,
  ],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.scss",
})
export class SettingsComponent {
  private readonly store = inject(SettingsService);
  private readonly announcer = inject(AnnouncerService);

  protected readonly settings = this.store.settings;

  /**
   * Whether to offer the debug menu, as a development build does, and a
   * production one at `?debug`.
   */
  private readonly debugMenu = inject(DEBUG_MENU);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close. */
  readonly closed = output();

  /** Emitted at the debug menu's Play the certificate, as the menu plays it. */
  readonly playCertificate = output();

  protected readonly aimings = AIMING_CHOICES;

  protected readonly flightSpeeds = FLIGHT_SPEED_CHOICES;

  /** Where the debug menu goes, below the settings. */
  private readonly menuHost = viewChild.required("menuHost", {
    read: ViewContainerRef,
  });

  /** Loads the debug menu, a chunk of its own, and puts it below the settings. */
  private readonly loadMenu = onDemand(
    inject(LOAD_DEBUG_MENU),
    () => this.menuHost(),
    [
      outputBinding("playCertificate", () => {
        this.playCertificate.emit();
      }),
    ],
  );

  /** Whether the debug menu is loading, which the drawer says where it goes. */
  protected readonly menuLoading = signal(false);

  /** Whether the debug menu is in the drawer, loaded, so opening it loads nothing. */
  private menuMade = false;

  constructor() {
    if (!this.debugMenu) return;
    afterNextRender(() => {
      void this.showMenu();
    });
    // A menu that failed to load is tried again as the drawer opens.
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        void this.showMenu();
      });
    });
  }

  /**
   * Loads the debug menu, unless it is loaded or loading, and says so if it
   * can't be, once the drawer is open: shut, the player asked for nothing.
   */
  private async showMenu(): Promise<void> {
    if (this.menuMade || this.menuLoading()) return;
    this.menuLoading.set(true);
    this.menuMade = await this.loadMenu();
    this.menuLoading.set(false);
    if (!this.menuMade && this.open()) this.announcer.say(MENU_FAILED_WORDS);
  }

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
