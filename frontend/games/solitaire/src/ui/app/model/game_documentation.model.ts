/** Describes a screenshot shown at the top of a game's rules page. */
export interface DocScreenshot {
  /**
   * The image's relative URL, such as
   * `./docs/screenshots/klondike/overview.png`.
   */
  readonly url: string;
  /** Human-readable caption explaining what the screenshot demonstrates. */
  readonly caption: string;
  /** Alt text for screen readers and accessibility. */
  readonly altText: string;
}

/** Summarises a game and says how it is won. */
export interface GameSummaryDoc {
  /** The primary objective of the game (e.g. move all cards to foundations). */
  readonly objective: string;
  /** Clear criteria for winning the game. */
  readonly winCondition: string;
  /** Brief 2-3 sentence overview introducing the game style and flow. */
  readonly quickOverview: string;
}

/** Explains a game's layout, how cards move, how they build, and any extras. */
export interface DetailedRulesDoc {
  /** The areas of the board, such as the tableau, foundations and stock. */
  readonly layout: readonly string[];
  /** Rules governing how cards and stacks are grabbed and moved. */
  readonly cardMovement: readonly string[];
  /** Rules for building sequences on tableau columns and foundations. */
  readonly sequenceBuilding: readonly string[];
  /** Rules particular to the game, such as recycle limits or supermove size. */
  readonly specialRules?: readonly string[];
}

/** Explains one choice of a rule option. */
export interface GameOptionDocChoice {
  /** The option value matching GameOptionChoice.value in the catalog. */
  readonly value: number;
  /** Detailed explanation of how this choice affects gameplay and difficulty. */
  readonly effect: string;
}

/**
 * Explains the choices of one rule option.
 *
 * Its label and description come from the option's `GameOptionSpec` in the
 * catalog.
 */
export interface GameOptionDoc {
  /** The option id matching a GameOptionSpec in the catalog. */
  readonly optionId: string;
  /** Explanations for each available choice value. */
  readonly choicesExplanation: readonly GameOptionDocChoice[];
}

/** Holds a game's rules page. */
export interface GameDocumentation {
  /** Human-readable game title (e.g. 'Klondike Solitaire'). */
  readonly title: string;
  /** Link to Wikipedia article for this game, if available. */
  readonly wikipediaUrl?: string;
  /** Hero screenshot showcasing board layout. */
  readonly screenshot?: DocScreenshot;
  /** Summary and win condition. */
  readonly summary: GameSummaryDoc;
  /** Full detailed rules. */
  readonly detailedRules: DetailedRulesDoc;
  /** Explanations for user-configurable settings and variants. */
  readonly settingsAndVariants: readonly GameOptionDoc[];
}
