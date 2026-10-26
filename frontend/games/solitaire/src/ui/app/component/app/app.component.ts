import { DOCUMENT } from "@angular/common";
import { Component, effect, inject, signal } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterOutlet } from "@angular/router";
import { ConfirmDialogComponent } from "@fz/ui/confirm";
import { GameCatalogService } from "../../service/game_catalog.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";
import { HeaderBarComponent } from "../header_bar/header_bar.component";
import { SettingsDrawerComponent } from "../settings_drawer/settings_drawer.component";
import { VictoryOverlayComponent } from "../victory_overlay/victory_overlay.component";
import { GameHelpModalComponent } from "../game_help_modal/game_help_modal.component";
import { GameBrowserComponent } from "../game_browser/game_browser.component";
import { GameBrowserService } from "../../service/game_browser.service";

/**
 * Composes the chrome around the routed board: header, game browser, settings
 * drawer, help modal, victory card and confirmation prompt.
 */
@Component({
  selector: "app-root",
  host: {
    // Ctrl or Command with K opens the game browser from anywhere.
    "(document:keydown)": "browser.openOnShortcut($event)",
  },
  imports: [
    RouterOutlet,
    GameBrowserComponent,
    HeaderBarComponent,
    SettingsDrawerComponent,
    GameHelpModalComponent,
    VictoryOverlayComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  protected readonly browser = inject(GameBrowserService);

  private readonly presentation = inject(PresentationSettingsService);
  private readonly catalog = inject(GameCatalogService);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  /** Whether the settings drawer is open. */
  protected readonly showSettings = signal(false);

  constructor() {
    // Paint the page with the felt, so the translucent header blurs table
    // rather than white wherever the canvas leaves the page bare. It is set on
    // the document root, outside this view, so the colour reaches the viewport.
    effect(() => {
      this.document.documentElement.style.setProperty(
        "--table-felt",
        this.presentation.backgroundColor(),
      );
    });

    // Tint the browser's own toolbar, the address bar on a phone, with the
    // felt, which a player may have chosen apart from the palette.
    effect(() => {
      const felt = this.presentation.backgroundColor();
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", felt);
    });

    // Say which side the stock is on, on the screen as it is now, on the
    // document root, where the board's stylesheet reads it: a stock at the left
    // stands the rail on a sideways phone at the right, so the board keeps
    // clear of that edge instead.
    effect(() => {
      this.document.documentElement.dataset["stockSide"] =
        this.presentation.resolvedArrangement().stockSide;
    });

    // Name the game in the tab title, first because a tab strip crops from the
    // right.
    effect(() => {
      this.title.setTitle(
        `${this.catalog.selectedEntry.name} · Solitaire Collection`,
      );
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
