import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterOutlet } from "@angular/router";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";
import { HeaderBarComponent } from "../header_bar/header_bar.component";
import { SettingsDrawerComponent } from "../settings_drawer/settings_drawer.component";
import { VictoryOverlayComponent } from "../victory_overlay/victory_overlay.component";
import { ConfirmationDialogComponent } from "../confirmation_dialog/confirmation_dialog.component";
import { GameHelpModalComponent } from "../game_help_modal/game_help_modal.component";
import { GameMenuComponent } from "../game_menu/game_menu.component";
import { GameMenuService } from "../../service/game_menu.service";

/**
 * Composes the chrome around the routed board: header, game rail, settings
 * drawer, help modal, victory card and confirmation prompt.
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
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  /** The game rail's state, which the board lays itself out around. */
  protected readonly menu = inject(GameMenuService);

  private readonly presentation = inject(PresentationSettingsService);
  private readonly catalog = inject(GameCatalogService);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  /** Whether the settings drawer is open. */
  protected readonly showSettings = signal(false);

  constructor() {
    // Paint the page with the felt, so the translucent header blurs table
    // rather than white where the board stops at the rail. It is set on the
    // document root, outside this view, so the colour reaches the viewport.
    effect(() => {
      this.document.documentElement.style.setProperty(
        "--table-felt",
        this.presentation.backgroundColor(),
      );
    });

    // Name the game in the tab title, first because a tab strip crops from the
    // right.
    effect(() => {
      this.title.setTitle(`${this.catalog.selectedEntry.name} · fSolitaire`);
    });
  }

  /** Opens the settings drawer. */
  protected openSettings(): void {
    this.showSettings.set(true);
  }

  /** Closes the settings drawer. */
  protected closeSettings(): void {
    this.showSettings.set(false);
  }
}
