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
import { onDemand } from "@fz/ui/on_demand";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import { SPEEDS, type Speed } from "../../view/timeline/pace";
import { LOAD_DEBUG_MENU } from "../debug/load_debug_menu";
import { SettingsService } from "./settings.service";
import { SPEED_NAMES } from "./speed_names";

/** What the announcer says when the debug menu couldn't be loaded. */
export const MENU_FAILED_WORDS =
  "The debug menu couldn't be loaded. Check your connection and open Settings again.";

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
 * taken at once and kept for the next visit; and, where `DEBUG_MENU`
 * offers it, the debug menu (`<app-debug-menu>`) below them, loaded once
 * the drawer is first drawn (`onDemand()`), so a page that doesn't offer
 * it never loads it, saying it loads meanwhile; one that fails to load the
 * announcer says so, if the drawer is open, and the drawer tries again as
 * it next opens.
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
  protected readonly store = inject(SettingsService);
  private readonly announcer = inject(AnnouncerService);

  /**
   * Whether to offer the debug menu, as a development build does, and a
   * production one at `?debug`.
   */
  private readonly debugMenu = inject(DEBUG_MENU);

  /** Whether the drawer is showing. */
  readonly open = input.required<boolean>();

  /** Emitted when the drawer asks to close, or once the debug menu has put a deal or a reported state in play. */
  readonly closed = output();

  /** Where the debug menu goes, below the settings. */
  private readonly menuHost = viewChild.required("menuHost", {
    read: ViewContainerRef,
  });

  /** Loads the debug menu, a chunk of its own, and puts it below the settings. */
  private readonly loadMenu = onDemand(
    inject(LOAD_DEBUG_MENU),
    () => this.menuHost(),
    [
      outputBinding("played", () => {
        this.closed.emit();
      }),
    ],
  );

  /** Whether the debug menu is loading, which the drawer says where it goes. */
  protected readonly menuLoading = signal(false);

  /** Whether the debug menu is in the drawer, loaded, so opening it loads nothing. */
  private menuMade = false;

  protected readonly speeds = SPEED_CHOICES;

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
