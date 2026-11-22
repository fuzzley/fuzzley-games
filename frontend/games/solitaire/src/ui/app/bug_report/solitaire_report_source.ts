import { Injectable, type Provider, inject } from "@angular/core";
import {
  BUG_REPORT_SOURCE,
  type BugReportSource,
  type ReportState,
} from "@fz/game-ui/bug_report";
import {
  POSITION_TAG,
  readGamePosition,
  reportedPosition,
} from "../model/game_position";
import { GameCatalogService } from "../service/game_catalog.service";
import { GameLifecycleService } from "../service/game_lifecycle.service";
import { PresentationSettingsService } from "../service/presentation_settings.service";

/**
 * Says what the Solitaire Collection puts in a bug report, and takes one
 * back: the game on the table, its rules and its position, which shrinks to
 * fit the link by its undo history, the newest kept.
 */
@Injectable({ providedIn: "root" })
export class SolitaireReportSource implements BugReportSource {
  private readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);
  private readonly presentation = inject(PresentationSettingsService);

  /** The name the build's `game.json` gives the collection. */
  readonly title = "Solitaire Collection";
  readonly tag = POSITION_TAG;

  /**
   * Returns the game on the table and the rules a player chose, as
   * "Klondike · Draw: Draw 3".
   */
  game(): string {
    const values = this.catalog.optionValues();
    const rules = this.catalog.ruleOptions().map((option) => {
      const value = values[option.id];
      const chosen = option.choices.find((choice) => choice.value === value);
      return `${option.label}: ${chosen?.label ?? value}`;
    });
    return [this.catalog.selectedEntry.name, ...rules].join(" · ");
  }

  /** Returns the cards and the felt on the table, in one line. */
  settings(): readonly string[] {
    const { presentation } = this;
    return [
      `Cards: ${presentation.cardDeck()} deck (${presentation.cardStyle()} style), ${presentation.cardBackStyle()} back, ${presentation.felt()} felt`,
    ];
  }

  /** Takes the game on the table, its rules and its position. */
  capture(): ReportState {
    return reportedPosition({
      gameId: this.catalog.selectedId(),
      options: this.catalog.optionValues(),
      snapshot: this.catalog.session().game.snapshot(),
    });
  }

  /**
   * Puts a reported game on the table, asking first where a game is in
   * progress; resolves to whether it did.
   *
   * @throws Error naming the first part of the position that is malformed,
   *   or the game or rule this build lacks, before asking anything, or the
   *   pile or card the game lacks.
   */
  async load(state: unknown): Promise<boolean> {
    return this.lifecycle.loadPosition(readGamePosition(state));
  }
}

/**
 * Returns the provider that has the Solitaire Collection take bug reports.
 */
export function provideSolitaireReports(): Provider {
  return { provide: BUG_REPORT_SOURCE, useExisting: SolitaireReportSource };
}
