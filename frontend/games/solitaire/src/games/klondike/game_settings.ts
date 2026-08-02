/** How many cards are drawn from the stock pile per draw action. */
export type DrawCount = 1 | 3;

/** The draw mode a new game starts in. */
export const DEFAULT_DRAW_COUNT: DrawCount = 3;

/**
 * Developer/debug only settings, grouped separately.
 */
export class DebugSettings {
  private almostWinValue: boolean;

  constructor(almostWin = false) {
    this.almostWinValue = almostWin;
  }

  /** Whether to deal a nearly finished board, for verification. */
  get almostWin(): boolean {
    return this.almostWinValue;
  }

  /** Chooses whether the next deal is an almost-win board. */
  setAlmostWin(enabled: boolean): void {
    this.almostWinValue = enabled;
  }
}

/**
 * The Klondike rules a player can choose.
 *
 * A plain value object, read synchronously at the moment it matters: the zones
 * closure reads the draw count when the board is built, and the dealer reads
 * the debug flag when a game is dealt. Nothing follows these over time.
 *
 * It deliberately neither loads nor saves. {@link GameCatalogService} owns
 * persistence for every game's options — including Klondike's — and deals a
 * fresh game whenever one changes, so a second copy here would be a second
 * source of truth for the same two values. It was also written to
 * `fsolitaire-settings`, the key the presentation settings migrate away from,
 * and so overwrote the very blob that migration reads.
 */
export class GameSettings {
  private drawCountValue: DrawCount;

  /** Nested developer/debug settings. */
  readonly debug: DebugSettings;

  constructor(drawCount: DrawCount = DEFAULT_DRAW_COUNT, almostWin = false) {
    this.drawCountValue = drawCount;
    this.debug = new DebugSettings(almostWin);
  }

  /** How many cards a draw turns over. */
  get drawCount(): DrawCount {
    return this.drawCountValue;
  }

  /** Chooses how many cards a draw turns over. */
  setDrawCount(count: DrawCount): void {
    this.drawCountValue = count;
  }
}
