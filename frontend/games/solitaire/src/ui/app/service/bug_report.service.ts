import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";
import { GamePosition, encodePosition } from "../model/game_position";
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
  gameState: "game-state",
} as const;

/** The game-state field when not even the board fits in the link. */
const GAME_STATE_TOO_LARGE = "The game state was too large to attach.";

/** What a bug report says about the game on the table, before it is linked. */
export interface BugReportDraft {
  readonly game: string;
  readonly environment: string;
  readonly position: GamePosition;
}

/** Builds the link to a new GitHub bug report, with the game attached. */
@Injectable({ providedIn: "root" })
export class BugReportService {
  private readonly config = inject(BUG_REPORT_CONFIG);
  private readonly catalog = inject(GameCatalogService);
  private readonly presentation = inject(PresentationSettingsService);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  /** Describes the game on the table, reading signals a caller can follow. */
  draft(): BugReportDraft {
    return {
      game: this.describeGame(),
      environment: this.describeEnvironment(),
      position: {
        gameId: this.catalog.selectedId(),
        options: this.catalog.optionValues(),
        snapshot: this.catalog.session().game.snapshot(),
      },
    };
  }

  /**
   * The address of a new bug report carrying the draft, with as much of the
   * undo history as fits in {@link BugReportConfig.maxUrlChars}.
   */
  async issueUrl(draft: BugReportDraft): Promise<string> {
    const url = new URL(this.config.newIssueUrl);
    url.searchParams.set("template", this.config.template);
    url.searchParams.set(BUG_REPORT_FIELDS.game, draft.game);
    url.searchParams.set(BUG_REPORT_FIELDS.environment, draft.environment);
    url.searchParams.set(
      BUG_REPORT_FIELDS.gameState,
      await this.fitGameState(url, draft.position),
    );
    return url.toString();
  }

  /** The game-state field, keeping the newest history that fits in the link. */
  private async fitGameState(
    url: URL,
    position: GamePosition,
  ): Promise<string> {
    const total = position.snapshot.history.length;
    const whole = await this.describeGameState(position, total);
    if (this.fits(url, whole)) return whole;

    let best = GAME_STATE_TOO_LARGE;
    let low = 0;
    let high = total - 1;
    while (low <= high) {
      const kept = Math.floor((low + high) / 2);
      const field = await this.describeGameState(position, kept);
      if (this.fits(url, field)) {
        best = field;
        low = kept + 1;
      } else {
        high = kept - 1;
      }
    }
    return best;
  }

  /** A summary line, then the position with its newest `kept` actions. */
  private async describeGameState(
    position: GamePosition,
    kept: number,
  ): Promise<string> {
    const { history } = position.snapshot;
    const snapshot = {
      ...position.snapshot,
      history: history.slice(history.length - kept),
    };
    const encoded = await encodePosition({ ...position, snapshot });
    return [
      `Score ${snapshot.score} · ${snapshot.moves} moves · ${kept} of ${history.length} undo steps`,
      "",
      "```",
      encoded,
      "```",
    ].join("\n");
  }

  /** Whether the link stays within the limit with this game-state field. */
  private fits(url: URL, gameState: string): boolean {
    const probe = new URL(url);
    probe.searchParams.set(BUG_REPORT_FIELDS.gameState, gameState);
    return probe.toString().length <= this.config.maxUrlChars;
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
