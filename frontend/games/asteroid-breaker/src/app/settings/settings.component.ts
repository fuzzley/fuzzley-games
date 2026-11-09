import { Component, inject, input, output } from "@angular/core";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { ChoiceListComponent, type ChoiceOption } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import type { Speed } from "../../rules/speed";
import { GameService } from "../play/game.service";
import { DEBUG_MENU } from "../tokens";
import { SPEED_CHOICES } from "./choices";
import { DebugTuningComponent } from "./debug_tuning.component";
import {
  DECK_SHOWINGS,
  type DeckShowing,
  SettingsService,
} from "./settings.service";

/** What the drawer says of each time the deck may show. */
const DECK_INFO: Readonly<
  Record<DeckShowing, Omit<ChoiceOption<DeckShowing>, "id">>
> = {
  auto: {
    name: "On a touch screen",
    detail:
      "The stick, Fire and Dash show beside the field where the screen takes a finger.",
  },
  always: {
    name: "Always",
    detail: "They show on every screen, and a mouse can press them.",
  },
  never: {
    name: "Never",
    detail: "The keys and the mouse fly the ship.",
  },
};

/** The times the deck may show, as the drawer offers them. */
const DECK_CHOICES: readonly ChoiceOption<DeckShowing>[] = DECK_SHOWINGS.map(
  (id) => ({ id, ...DECK_INFO[id] }),
);

/**
 * Shows the settings in a drawer: the speed, when the deck shows, which side
 * holds its stick, whether the ship fires by itself, haptics, the sound and
 * the palette, and where `DEBUG_MENU` offers it the debug menu
 * (`<app-debug-tuning>`), the numbers that set the feel, tuned on the field
 * in play.
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

  protected readonly deckChoices = DECK_CHOICES;

  /** Starts a run at the speed chosen, unless it is the speed in use. */
  protected async chooseSpeed(speed: Speed): Promise<void> {
    if (speed === this.game.speed()) return;
    await this.game.changeSpeed(speed);
  }

  /** Says when the deck shows. */
  protected chooseDeck(deck: DeckShowing): void {
    this.store.update({ deck });
  }

  /** Puts the stick on the right or the left, as its checkbox says. */
  protected setStickOnRight(stickOnRight: boolean): void {
    this.store.update({ stickOnRight });
  }

  /** Has the ship fire by itself, or as the player fires, as its checkbox says. */
  protected setFireByItself(fireByItself: boolean): void {
    this.store.update({ fireByItself });
  }

  /** Turns the haptics on or off, as their checkbox says. */
  protected setHaptics(haptics: boolean): void {
    this.store.update({ haptics });
  }

  /** Turns the sound on or off, as its checkbox says. */
  protected setSound(sound: boolean): void {
    this.store.update({ sound });
  }
}
