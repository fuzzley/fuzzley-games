import { Component, inject } from "@angular/core";
import { ThemeService } from "../../service/theme.service";
import { HeaderBarComponent } from "../header_bar/header_bar.component";
import { SettingsDrawerComponent } from "../settings_drawer/settings_drawer.component";
import { VictoryOverlayComponent } from "../victory_overlay/victory_overlay.component";
import { ConfirmationDialogComponent } from "../confirmation_dialog/confirmation_dialog.component";
import { GameCanvasComponent } from "../game_canvas/game_canvas.component";

/**
 * The main container/shell component of the Solitaire application.
 * Composes the child presentational/overlay components (HeaderBar, SettingsDrawer,
 * VictoryOverlay, and ConfirmationDialog) and manages the visibility toggle for
 * the SettingsDrawer.
 */
@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    GameCanvasComponent,
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

  /** Tracks whether the side settings drawer overlay is open. */
  showSettings = false;

  /** Toggles the display state of the settings drawer. */
  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }
}
