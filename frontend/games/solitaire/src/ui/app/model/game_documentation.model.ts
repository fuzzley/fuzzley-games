/** Describes a screenshot shown at the top of a game's rules page. */
export interface DocScreenshot {
  /**
   * The image's relative URL, such as
   * `./docs/screenshots/klondike/preview.webp`.
   */
  readonly url: string;
  /** Human-readable caption explaining what the screenshot demonstrates. */
  readonly caption: string;
  /** Alt text for screen readers and accessibility. */
  readonly altText: string;
}

/** Sums up a game at the top of its rules page. */
export interface GameSummaryDoc {
  /**
   * The decks, the draw and the redeals, such as `1 deck. Draw 1 or Draw 3.`,
   * or empty where the line isn't written yet, which hides it.
   */
  readonly facts: string;
  /** How the game is won, in one sentence. */
  readonly goal: string;
}

/** Explains a game's piles and its moves, and what is particular to it. */
export interface DetailedRulesDoc {
  /** One line for each pile on the table, a label and what it is. */
  readonly layout: readonly string[];
  /** What a player can pick up, where it can go and how the piles build. */
  readonly moves: readonly string[];
  /** What is different in this game or trips players up, if anything. */
  readonly goodToKnow?: readonly string[];
}

/** Explains one choice of a rule option. */
export interface GameOptionDocChoice {
  /** The option value matching GameOptionChoice.value in the catalog. */
  readonly value: number;
  /** What this choice changes, compared with the game the player knows. */
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
  /** The fact line and the goal. */
  readonly summary: GameSummaryDoc;
  /** The layout, the moves and what is good to know. */
  readonly detailedRules: DetailedRulesDoc;
  /** Explanations for user-configurable settings and variants. */
  readonly settingsAndVariants: readonly GameOptionDoc[];
}
