import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { ThemeService } from "../../service/theme.service";
import { HeaderBarComponent } from "../header_bar/header_bar.component";
import { SettingsDrawerComponent } from "../settings_drawer/settings_drawer.component";
import { VictoryOverlayComponent } from "../victory_overlay/victory_overlay.component";
import { ConfirmationDialogComponent } from "../confirmation_dialog/confirmation_dialog.component";
import { GameCanvasComponent } from "../game_canvas/game_canvas.component";
import { GameMenuComponent } from "../game_menu/game_menu.component";
import { GameMenuService } from "../../service/game_menu.service";

/**
 * The main container/shell component of the Solitaire application.
 * Composes the child presentational/overlay components (HeaderBar, SettingsDrawer,
 * VictoryOverlay, and ConfirmationDialog) and manages the visibility toggle for
 * the SettingsDrawer.
 */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GameCanvasComponent,
    GameMenuComponent,
    HeaderBarComponent,
    SettingsDrawerComponent,
    VictoryOverlayComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  /** Reference to the ThemeService for binding the background color class to the layout. */
  protected readonly theme = inject(ThemeService);

  /** Whether the game rail is expanded, which the board lays itself out around. */
  protected readonly menu = inject(GameMenuService);

  /** Tracks whether the side settings drawer overlay is open. */
  readonly showSettings = signal(false);

  /** Opens the settings drawer. */
  openSettings(): void {
    this.showSettings.set(true);
  }

  /** Closes the settings drawer. */
  closeSettings(): void {
    this.showSettings.set(false);
  }
}
