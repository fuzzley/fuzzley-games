/** Says how many cards a draw turns over. */
export type DrawCount = 1 | 3;

/** The draw mode a new game starts in. */
export const DEFAULT_DRAW_COUNT: DrawCount = 3;

/**
 * Holds the Klondike rules a player can choose.
 *
 * An object because the zones are built from it during `super` and must keep
 * reading a draw count that can change afterwards. It does not save itself;
 * the catalog does that for every game's options.
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
