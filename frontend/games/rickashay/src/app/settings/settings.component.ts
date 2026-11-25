import {
  Component,
  ViewContainerRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  outputBinding,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import type { PointerAiming } from "@fz/brick-wall/view/aim_settings";
import { isOneOf } from "@fz/core/records";
import { DEBUG_MENU } from "@fz/game-ui/debug_menu";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { AnnouncerComponent, AnnouncerService } from "@fz/ui/announcer";
import { onDemand } from "@fz/ui/on_demand";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import {
  FLIGHT_PACE,
  FLIGHT_SPEEDS,
  type FlightSpeed,
} from "../../view/play/pace";
import { LOAD_DEBUG_MENU } from "../tokens";
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

/** What the announcer says when the debug menu couldn't be loaded. */
export const MENU_FAILED_WORDS =
  "The debug menu couldn't be loaded. Check your connection and open Settings again.";

/** What the drawer says under Fast-forward, from the pace. */
const FAST_FORWARD = `Plays every shot ${String(FLIGHT_PACE.fastForward)} times as fast, until you turn it off. Same as the Fast-forward button.`;

/**
 * Shows the settings in a drawer (`<fz-settings-drawer>`): how a pointer
 * aims, whether only the bar's Release lets a shot fly, how many turns
 * the guide follows a shot to, the flight's speed and fast-forward, the
 * sound, and the palette; and, where `DEBUG_MENU` offers it, the debug
 * menu (`<app-debug-menu>`) below them, loaded once the drawer is first
 * drawn (`onDemand()`), so a page that doesn't offer it never loads it,
 * saying it loads meanwhile; one that fails to load the announcer says so,
 * if the drawer is open, and the drawer tries again as it next opens.
 *
 * None of the settings costs the run anything, since the rules decide a
 * round as it is released, whatever the flight looks like, so each
 * applies at once, and each is kept for the next visit. The debug menu's
 * numbers and open levels can cost it its records, as the menu says.
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

  /** Emitted when the drawer asks to close, or once the debug menu has put a reported state in play. */
  readonly closed = output();

  /** Emitted at the debug menu's Play the certificate or Play the rally line, as the menu plays it. */
  readonly playLine = output();

  /** Where the debug menu goes, below the settings. */
  private readonly menuHost = viewChild.required("menuHost", {
    read: ViewContainerRef,
  });

  /** Loads the debug menu, a chunk of its own, and puts it below the settings. */
  private readonly loadMenu = onDemand(
    inject(LOAD_DEBUG_MENU),
    () => this.menuHost(),
    [
      outputBinding("playLine", () => {
        this.playLine.emit();
      }),
      outputBinding("loaded", () => {
        this.closed.emit();
      }),
    ],
  );

  /** Whether the debug menu is loading, which the drawer says where it goes. */
  protected readonly menuLoading = signal(false);

  /** Whether the debug menu is in the drawer, loaded, so opening it loads nothing. */
  private menuMade = false;

  protected readonly aimings = AIMING_CHOICES;

  protected readonly guides = GUIDE_CHOICES;

  protected readonly speeds = SPEED_CHOICES;

  protected readonly fastForward = FAST_FORWARD;

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

  /** The guide's length in use, as its choice's id. */
  protected readonly guide = computed(() => String(this.settings().guideTurns));

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
