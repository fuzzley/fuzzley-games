import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from "@angular/core";
import { GameSessionService } from "../../service/game_session.service";
import { ThemeService } from "../../service/theme.service";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { DebugPanelComponent } from "../debug_panel/debug_panel.component";

/**
 * Controls the settings side drawer overlay.
 * Exposes UI configurations including draw mode (Draw 1 vs Draw 3), card back
 * designs, table felt background theme options, and quick game documentation access.
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
  protected readonly docService = inject(GameDocumentationService);

  /** Exposes build mode configuration to conditional UI rendering. */
  protected readonly isDevMode = import.meta.env.DEV;

  /** Title of the game currently active. */
  readonly activeGameTitle = computed(
    () => this.docService.activeGameDoc()?.title ?? "Solitaire",
  );

  /** Whether the side settings drawer is visible. */
  readonly open = input<boolean>(false);

  /** Emitted when the user asks to close the settings drawer. Named `closed`
   * rather than `close` so it cannot be confused with the native DOM event. */
  readonly closed = output();

  openRules(): void {
    this.closed.emit();
    this.docService.openHelp();
  }
}
