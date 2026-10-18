import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { GameMetricsService } from "../../service/game_metrics.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { GameCatalogService } from "../../service/game_catalog.service";
import { ViewportService } from "../../service/viewport.service";
import { BugReportService } from "../../service/bug_report.service";
import { GameBrowserService } from "../../service/game_browser.service";

/**
 * Shows the game on the table, its score, time and moves, and the actions
 * that act on it.
 *
 * On a narrow screen, restart, the rules, bug reports and settings move into
 * an overflow menu.
 */
@Component({
  selector: "app-header-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  // Escape closes the overflow menu from anywhere in the header, since the
  // panel itself cannot take focus.
  host: { "(keydown.escape)": "closeMenu()" },
  templateUrl: "./header_bar.component.html",
  styleUrl: "./header_bar.component.scss",
})
export class HeaderBarComponent {
  protected readonly metrics = inject(GameMetricsService);
  protected readonly lifecycle = inject(GameLifecycleService);
  protected readonly docService = inject(GameDocumentationService);
  protected readonly viewport = inject(ViewportService);
  protected readonly browser = inject(GameBrowserService);

  private readonly catalog = inject(GameCatalogService);
  private readonly bugReport = inject(BugReportService);

  /**
   * The button the overflow menu hangs from, so that dismissing the menu can
   * put focus back where it was opened from rather than dropping it on the
   * document.
   */
  private readonly menuToggle =
    viewChild<ElementRef<HTMLButtonElement>>("menuToggle");

  /** The first action inside the overflow menu, while there is one. */
  private readonly firstMenuItem =
    viewChild<ElementRef<HTMLButtonElement>>("firstMenuItem");

  /** Emitted when the user requests to open the settings panel. */
  readonly openSettings = output();

  /** The name of the game on the table. */
  protected readonly gameName = computed(() => this.catalog.selectedEntry.name);

  /** What a screen reader calls the switcher: the game, then what it does. */
  protected readonly switcherLabel = computed(
    () => `${this.gameName()}, choose a game`,
  );

  /** The switcher's tooltip, which teaches its keyboard shortcut. */
  protected readonly switcherTitle = `Choose a game (${this.browser.shortcutLabel})`;

  private readonly menuOpen = signal(false);

  /** Whether the overflow menu is showing. */
  protected readonly isMenuOpen = this.menuOpen.asReadonly();

  constructor() {
    // Close the menu once a wider window puts its actions back in the bar.
    effect(() => {
      if (!this.viewport.isCompact()) {
        this.menuOpen.set(false);
      }
    });

    // Focus the menu as it opens, since it is rendered after the header rather
    // than beside its button. A pointer user sees no focus ring from this.
    effect(() => {
      this.firstMenuItem()?.nativeElement.focus();
    });
  }

  /** Opens the overflow menu if it is closed, and closes it if it is not. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /**
   * Dismisses the overflow menu, if it is open, and returns focus to the
   * button that opened it.
   */
  protected closeMenu(): void {
    if (!this.menuOpen()) return;

    this.menuOpen.set(false);
    this.menuToggle()?.nativeElement.focus();
  }

  /** Deals the same game again, or asks first if there is one to lose. */
  protected restart(): void {
    this.closeMenu();
    void this.lifecycle.restartGame();
  }

  /** Deals a new game, or asks first if there is one to lose. */
  protected newGame(): void {
    void this.lifecycle.startNewGame();
  }

  /** Opens the rules for the game on the table. */
  protected openHelp(): void {
    this.closeMenu();
    this.docService.openHelp();
  }

  /** Asks for the settings drawer, from the overflow menu. */
  protected showSettings(): void {
    this.closeMenu();
    this.openSettings.emit();
  }

  /** Opens a new bug report about the game on the table, in a new tab. */
  protected reportBug(): void {
    this.closeMenu();
    void this.bugReport.openReport();
  }
}
