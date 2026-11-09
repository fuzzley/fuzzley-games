import { Component, inject, input, output } from "@angular/core";
import { SettingsDrawerComponent } from "@fz/game-ui/settings_drawer";
import { ChoiceListComponent } from "@fz/ui/radio_group";
import { ThemePickerComponent } from "@fz/ui/theme";
import type { Level } from "../../rules/difficulty";
import { GameService } from "../play/game.service";
import { LEVEL_CHOICES } from "./choices";
import { SettingsService } from "./settings.service";

/** Names an assist, a setting the player turns on or off mid-game. */
type Assist = "markMistakes" | "clearNotes";

/**
 * Shows the settings in a drawer: the level, the assists, and the palette.
 *
 * Choosing a level deals a new puzzle, after asking if a game is under way,
 * so the levels are radios the arrow keys move between without choosing.
 * The assists cost the game nothing, so they are plain checkboxes.
 */
@Component({
  selector: "app-settings",
  imports: [ChoiceListComponent, SettingsDrawerComponent, ThemePickerComponent],
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

  protected readonly levels = LEVEL_CHOICES;

  /** Deals a puzzle at the level chosen, unless it is the level in use. */
  protected async chooseLevel(level: Level): Promise<void> {
    if (level === this.settings().level) return;
    await this.game.changeLevel(level);
  }

  /** Turns an assist on or off as its checkbox says. */
  protected setAssist(assist: Assist, on: boolean): void {
    const change: Partial<Record<Assist, boolean>> = {};
    change[assist] = on;
    this.store.update(change);
  }
}
