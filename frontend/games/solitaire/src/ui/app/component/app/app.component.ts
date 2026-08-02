import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { HeaderBarComponent } from "../header_bar/header_bar.component";
import { SettingsDrawerComponent } from "../settings_drawer/settings_drawer.component";
import { VictoryOverlayComponent } from "../victory_overlay/victory_overlay.component";
import { ConfirmationDialogComponent } from "../confirmation_dialog/confirmation_dialog.component";
import { GameHelpModalComponent } from "../game_help_modal/game_help_modal.component";
import { GameMenuComponent } from "../game_menu/game_menu.component";
import { GameMenuService } from "../../service/game_menu.service";

/**
 * The main container/shell component of the Solitaire application.
 *
 * Composes the chrome around the board — header, game rail, settings drawer,
 * help modal, victory card and confirmation prompt — and lays itself out
 * around the routed board.
 */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    GameMenuComponent,
    HeaderBarComponent,
    SettingsDrawerComponent,
    GameHelpModalComponent,
    VictoryOverlayComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  /** Whether the game rail is expanded, which the board lays itself out around. */
  protected readonly menu = inject(GameMenuService);

  /** Tracks whether the side settings drawer overlay is open. */
  protected readonly showSettings = signal(false);

  /** Opens the settings drawer. */
  protected openSettings(): void {
    this.showSettings.set(true);
  }

  /** Closes the settings drawer. */
  protected closeSettings(): void {
    this.showSettings.set(false);
  }
}
