/** How many cards are drawn from the stock pile per draw action. */
export type DrawCount = 1 | 3;

/** The draw mode a new game starts in. */
export const DEFAULT_DRAW_COUNT: DrawCount = 3;

/**
 * The Klondike rules a player can choose.
 *
 * An object rather than a plain constructor argument because the zones are
 * built from the draw count during `super`, before the game's own fields
 * exist, and the closure that builds them has to keep reading a value that can
 * change afterwards. That is the whole reason this type exists — which is why
 * the debug aid that used to sit beside it is now a plain field on the game,
 * as it already was in FreeCell: it is read once, at deal time, and needs none
 * of this.
 *
 * It deliberately neither loads nor saves. {@link GameCatalogService} owns
 * persistence for every game's options — including Klondike's — and deals a
 * fresh game whenever one changes, so a second copy here would be a second
 * source of truth for the same value. It was also written to
 * `fsolitaire-settings`, the key the presentation settings migrate away from,
 * and so overwrote the very blob that migration reads.
 */
export class KlondikeSettings {
  private drawCountValue: DrawCount;

  constructor(drawCount: DrawCount = DEFAULT_DRAW_COUNT) {
    this.drawCountValue = drawCount;
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
