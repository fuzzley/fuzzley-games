import { Component, inject, input, output } from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";
import { ThemeService } from "../../service/theme.service";
import { DebugPanelComponent } from "../debug_panel/debug_panel.component";

/**
 * Controls the settings side drawer overlay.
 * Exposes UI configurations including draw mode (Draw 1 vs Draw 3), card back
 * designs, and table felt background theme options.
 */
@Component({
  selector: "app-settings-drawer",
  standalone: true,
  imports: [DebugPanelComponent],
  templateUrl: "./settings_drawer.component.html",
  styleUrl: "./settings_drawer.component.css",
})
export class SettingsDrawerComponent {
  protected readonly session = inject(GameSessionService);
  protected readonly themeService = inject(ThemeService);

  /** Exposes build mode configuration to conditional UI rendering. */
  protected readonly isDevMode = import.meta.env.DEV;

  /** Whether the side settings drawer is visible. */
  readonly open = input<boolean>(false);

  /** Emitted when the user requests to close the settings drawer. */
  readonly close = output();

  /**
   * Sets the game draw mode (Draw 1 or Draw 3).
   * Note: Changing draw mode prompts for confirmation and restarts the game session.
   */
  setDrawMode(mode: 1 | 3): void {
    this.session.setDrawMode(mode);
  }

  /** Sets the visual styling of card back covers. */
  setCardBack(style: "card-back-blue" | "card-back-red"): void {
    this.session.setCardBack(style);
  }

  /** Sets the table theme key, which updates background color values. */
  setTheme(themeKey: string): void {
    this.themeService.setTheme(themeKey);
  }
}
