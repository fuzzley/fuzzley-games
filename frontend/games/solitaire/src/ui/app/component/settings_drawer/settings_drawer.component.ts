import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from "@angular/core";
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
}
