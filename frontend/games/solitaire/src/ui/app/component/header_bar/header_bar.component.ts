import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from "@angular/core";
import {
  type BarOverflowAction,
  BarOverflowComponent,
  type BarOverflowItem,
} from "@fz/game-ui/bar_overflow";
import {
  type BarHome,
  type BarPlacement,
  GameBarComponent,
} from "@fz/game-ui/game_bar";
import { IconComponent } from "@fz/ui/icon";
import { GameMetricsService } from "../../service/game_metrics.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameViewportService } from "@fz/game-ui/viewport";
import { BugReportService } from "../../service/bug_report.service";
import { GameBrowserService } from "../../service/game_browser.service";
import { PresentationSettingsService } from "../../service/presentation_settings.service";

/** Where the link home leads: the Fuzzley Games site, which serves this game. */
const HOME_HREF = "/";

/** Names an action the overflow menu offers. */
type MenuAction = "restart" | "rules" | "bug" | "settings";

/** The overflow menu's actions, in order. */
const OVERFLOW_ACTIONS: readonly BarOverflowAction<MenuAction>[] = [
  { id: "restart", label: "Restart", icon: "restart" },
  { id: "rules", label: "How to Play", icon: "help" },
  { id: "bug", label: "Report a Bug", icon: "bug" },
  { id: "settings", label: "Settings", icon: "settings" },
];

/**
 * Shows the game bar: the link home, the game on the table, its score, time
 * and moves, and the actions that act on it.
 *
 * On a compact screen, restart, the rules, bug reports and settings move into
 * the overflow menu, and on the narrowest the link home does too.
 */
@Component({
  selector: "app-header-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BarOverflowComponent, GameBarComponent, IconComponent],
  templateUrl: "./header_bar.component.html",
  styleUrl: "./header_bar.component.scss",
})
export class HeaderBarComponent {
  protected readonly metrics = inject(GameMetricsService);
  protected readonly lifecycle = inject(GameLifecycleService);
  protected readonly docService = inject(GameDocumentationService);
  protected readonly viewport = inject(GameViewportService);
  protected readonly browser = inject(GameBrowserService);

  private readonly catalog = inject(GameCatalogService);
  private readonly bugReport = inject(BugReportService);
  private readonly presentation = inject(PresentationSettingsService);

  /** Emitted when the user requests to open the settings panel. */
  readonly openSettings = output();

  protected readonly homeHref = HOME_HREF;

  /** The name of the game on the table. */
  protected readonly gameName = computed(() => this.catalog.selectedEntry.name);

  /** What a screen reader calls the switcher: the game, then what it does. */
  protected readonly switcherLabel = computed(
    () => `${this.gameName()}, choose a game`,
  );

  /** The switcher's tooltip, which teaches its keyboard shortcut. */
  protected readonly switcherTitle = `Choose a game (${this.browser.shortcutLabel})`;

  private readonly stockOnLeft = computed(
    () => this.presentation.resolvedArrangement().stockSide === "left",
  );

  /**
   * Across the top of a roomy screen, along the bottom of a phone held upright,
   * where every action is under the thumb, and down the side of a phone on its
   * side, which leaves the board the whole height of a short screen. The rail
   * stands on the side away from the stock.
   */
  protected readonly placement = computed<BarPlacement>(() => {
    switch (this.viewport.formFactor()) {
      case "roomy":
        return "top";
      case "phone-portrait":
        return "bottom";
      case "phone-landscape":
        return this.stockOnLeft() ? "end" : "start";
    }
  });

  /** With the stock at the left, the bar on an upright phone swaps ends. */
  protected readonly reversed = computed(
    () => this.placement() === "bottom" && this.stockOnLeft(),
  );

  protected readonly home = computed<BarHome>(() => {
    if (!this.viewport.fitsHomeButton()) return "none";
    return this.viewport.fitsWordmark() && !this.viewport.isCompact()
      ? "wordmark"
      : "icon";
  });

  /** The overflow menu, led by the link home where the bar has no room for it. */
  protected readonly overflowItems = computed<
    readonly BarOverflowItem<MenuAction>[]
  >(() => {
    if (this.home() !== "none") return OVERFLOW_ACTIONS;
    const [first, ...rest] = OVERFLOW_ACTIONS;
    return [
      {
        id: "home",
        label: "Fuzzley Games",
        icon: "home",
        href: HOME_HREF,
      },
      ...(first ? [{ ...first, startsGroup: true }] : []),
      ...rest,
    ];
  });

  /** Carries out the action chosen from the overflow menu. */
  protected chooseFromMenu(id: MenuAction): void {
    switch (id) {
      case "restart":
        this.restart();
        break;
      case "rules":
        this.openHelp();
        break;
      case "bug":
        this.reportBug();
        break;
      case "settings":
        this.openSettings.emit();
        break;
    }
  }

  /** Deals the same game again, or asks first if there is one to lose. */
  protected restart(): void {
    void this.lifecycle.restartGame();
  }

  /** Deals a new game, or asks first if there is one to lose. */
  protected newGame(): void {
    void this.lifecycle.startNewGame();
  }

  /** Opens the rules for the game on the table. */
  protected openHelp(): void {
    this.docService.openHelp();
  }

  /** Opens a new bug report about the game on the table, in a new tab. */
  protected reportBug(): void {
    void this.bugReport.openReport();
  }
}
