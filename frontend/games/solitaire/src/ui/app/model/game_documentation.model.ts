/**
 * Category or context of a documentation screenshot visual aid.
 */
export type ScreenshotType = 'overview' | 'rule_detail' | 'variant';

/**
 * Metadata for a screenshot embedded in a game's documentation.
 */
export interface DocScreenshot {
  /** Relative URL path to the screenshot image (e.g. '/docs/screenshots/klondike/overview.png'). */
  readonly url: string;
  /** Human-readable caption explaining what the screenshot demonstrates. */
  readonly caption: string;
  /** Alt text for screen readers and accessibility. */
  readonly altText: string;
  /** Type tag identifying the section or feature illustrated. */
  readonly type?: ScreenshotType;
}

/**
 * High-level summary and win condition for a game.
 */
export interface GameSummaryDoc {
  /** The primary objective of the game (e.g. move all cards to foundations). */
  readonly objective: string;
  /** Clear criteria for winning the game. */
  readonly winCondition: string;
  /** Brief 2-3 sentence overview introducing the game style and flow. */
  readonly quickOverview: string;
}

/**
 * Detailed explanation of layout, movement, sequence building, and special mechanics.
 */
export interface DetailedRulesDoc {
  /** Overview of board areas (Tableau, Foundations, Stock, Waste, FreeCells, Reserves). */
  readonly layout: readonly string[];
  /** Rules governing how cards and stacks are grabbed and moved. */
  readonly cardMovement: readonly string[];
  /** Rules for building sequences on tableau columns and foundations. */
  readonly sequenceBuilding: readonly string[];
  /** Game-specific mechanics (e.g. stock recycle limits, supermove staging limit formulas). */
  readonly specialRules?: readonly string[];
}

/**
 * Explanation of a game option / variant setting available to players.
 */
export interface GameOptionDocChoice {
  /** Label of the choice (e.g. 'Draw 1', '4 Suits', 'Kings Only'). */
  readonly label: string;
  /** Detailed explanation of how this choice affects gameplay and difficulty. */
  readonly effect: string;
}

export interface GameOptionDoc {
  /** The option id matching a GameOptionSpec in the catalog. */
  readonly optionId: string;
  /** Title of the option shown to players. */
  readonly label: string;
  /** High-level description of what changing this setting alters. */
  readonly description: string;
  /** Explanations for each available choice. */
  readonly choicesExplanation: readonly GameOptionDocChoice[];
}

/**
 * Complete documentation structure for a game in fSolitaire.
 */
export interface GameDocumentation {
  /** Stable identifier matching CatalogEntry.id. */
  readonly gameId: string;
  /** Human-readable game title. */
  readonly title: string;
  /** Link to Wikipedia article for this game, if available. */
  readonly wikipediaUrl?: string;
  /** Visual screenshots showcasing board layout, mechanics, and variants. */
  readonly screenshots: readonly DocScreenshot[];
  /** Summary and win condition. */
  readonly summary: GameSummaryDoc;
  /** Full detailed rules. */
  readonly detailedRules: DetailedRulesDoc;
  /** Explanations for user-configurable settings and variants. */
  readonly settingsAndVariants: readonly GameOptionDoc[];
}
