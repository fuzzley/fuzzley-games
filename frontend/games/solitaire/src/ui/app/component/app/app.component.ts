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
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  /** Whether the game rail is expanded, which the board lays itself out around. */
  protected readonly menu = inject(GameMenuService);

  private readonly presentation = inject(PresentationSettingsService);
  private readonly catalog = inject(GameCatalogService);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  /** Tracks whether the side settings drawer overlay is open. */
  protected readonly showSettings = signal(false);

  constructor() {
    // The page follows the felt.
    //
    // The header is translucent and blurred across the full width, but the
    // board it blurs stops at the game rail — so left of the rail it was
    // sampling a document with no background at all, which resolved to the
    // UA's white and showed as a pale band up the side of the wordmark.
    // Mirroring the chosen felt onto the root gives the header one continuous
    // colour to sample, and makes the strip behind the rail read as table
    // rather than as paper.
    //
    // Written to the DOM rather than bound in the template because the element
    // that needs it is the document root, which is outside this component's
    // view — and it has to be the root for the browser to propagate the colour
    // to the viewport canvas.
    effect(() => {
      this.document.documentElement.style.setProperty(
        "--table-felt",
        this.presentation.backgroundColor(),
      );
    });

    // The tab says which game is on the table.
    //
    // Which game that is, is the whole of this application's navigable state,
    // and everywhere else it is already answered: the URL names it, the rail
    // marks it, the header prints it when it has the room. The title is what
    // answers it for a bookmark, a history entry and a second tab of the same
    // application — none of which can see any of those.
    //
    // Game first, because a tab strip crops from the right.
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
