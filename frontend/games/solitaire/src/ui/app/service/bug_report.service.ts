import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { BUG_REPORT_CONFIG } from "../provider/bug_report_config";
import { GameCatalogService } from "./game_catalog.service";
import { PresentationSettingsService } from "./presentation_settings.service";
import { ThemeService } from "./theme.service";

/**
 * The issue form fields the application fills in, by the `id` each has in
 * `.github/ISSUE_TEMPLATE/bug_report.yml`.
 */
export const BUG_REPORT_FIELDS = {
  game: "game",
  environment: "environment",
} as const;

/** Builds the link to a new GitHub bug report, with the game described. */
@Injectable({ providedIn: "root" })
export class BugReportService {
  private readonly config = inject(BUG_REPORT_CONFIG);
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  /** The address of a new bug report describing the game on the table. */
  issueUrl(): string {
    const url = new URL(this.config.newIssueUrl);
    url.searchParams.set("template", this.config.template);
    url.searchParams.set(BUG_REPORT_FIELDS.game, this.describeGame());
    url.searchParams.set(
      BUG_REPORT_FIELDS.environment,
      this.describeEnvironment(),
    );
    return url.toString();
  }

  /** The game and its player-facing rules: `Klondike · Draw Mode: Draw 3`. */
  private describeGame(): string {
    const values = this.catalog.optionValues();
    const rules = this.catalog.ruleOptions().map((option) => {
      const value = values[option.id];
      const chosen = option.choices.find((choice) => choice.value === value);
      return `${option.label}: ${chosen?.label ?? value}`;
    });
    return [this.catalog.selectedEntry.name, ...rules].join(" · ");
  }

  /** The build, browser and presentation settings, as a Markdown list. */
  private describeEnvironment(): string {
    const view = this.document.defaultView;
    const browser = view
      ? [
          `- Browser: ${view.navigator.userAgent}`,
          `- Window: ${view.innerWidth}×${view.innerHeight} at ${view.devicePixelRatio}× pixel ratio`,
        ]
      : [];
    return [
      `- Build: ${this.config.commit ?? "local build"}`,
      ...browser,
      `- Cards: ${this.presentation.cardDeck()} deck, ${this.presentation.cardBackStyle()} back, ${this.theme.selectedTheme()} felt`,
    ].join("\n");
  }
}
