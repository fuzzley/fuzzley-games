import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { TableGame } from "@/engine/tableau/table_game";
import { EightOffDealer } from "./eight_off_deal";
import { EightOffRole, eightOffZoneSpecs } from "./eight_off_zones";

/** Lifecycle events an Eight Off game emits. */
export type EightOffEvents = {
  /** Emitted when every card has reached a foundation. */
  "game-won": undefined;
  /** Emitted when the game is restarted or a new game is dealt. */
  "game-reset": undefined;
};

/**
 * A game of Eight Off.
 *
 * FreeCell's shape with three rules changed: twice as many cells, columns that
 * build down in suit rather than in alternating colours, and empty columns that
 * take only a King. The first makes it easier, the second and third make it
 * harder, and between them almost every deal is winnable with care.
 *
 * None of that is written here. It is declared by the zones and the placement
 * rules; what is left in this class is a board, a deal and a win condition —
 * which, as with FreeCell, is the measure of how much {@link TableGame} carries
 * on its own.
 */
export class EightOffGame extends TableGame<EightOffEvents> {
  /** The eight single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The eight columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private initialDeck: PlayingCard[] = [];
  private readonly dealer: EightOffDealer;

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    const registry = new CardRegistry();
    super({
      zones: () => eightOffZoneSpecs(),
      registry,
      // A foundation is always best and a cell is the last resort, since
      // parking a card there is precisely what a player is trying to avoid.
      autoMoveRoles: [
        EightOffRole.FOUNDATION,
        EightOffRole.TABLEAU,
        EightOffRole.CELL,
      ],
    });

    this.dealer = new EightOffDealer(registry, cardIds, random);
    this.cells = this.pilesOfRole(EightOffRole.CELL);
    this.foundations = this.pilesOfRole(EightOffRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(EightOffRole.TABLEAU);
  }

  /** Shuffles the deck and deals a fresh board. */
  public startNewGame(): void {
    this.beginGame(() => {
      const deck = this.dealer.createShuffledDeck();
      this.initialDeck = [...deck];
      return deck;
    });
  }

  /** Restarts the game using the exact same deal. */
  public restartGame(): void {
    this.beginGame(() => this.reuseInitialDeck());
  }

  private beginGame(createDeck: () => PlayingCard[]): void {
    this.state.moves = 0;
    this.clearHistory();
    this.resetPiles();

    this.dealer.dealOpeningLayout(createDeck(), this.tableaus, this.cells);

    this.emit("game-reset", undefined);
  }

  private reuseInitialDeck(): PlayingCard[] {
    if (this.initialDeck.length === 0) {
      this.initialDeck = [...this.dealer.createShuffledDeck()];
    }
    return [...this.initialDeck];
  }

  /** @inheritDoc */
  protected override afterMove(): void {
    let onFoundations = 0;
    for (const foundation of this.foundations) {
      onFoundations += foundation.size;
    }
    // Counted against the cards actually in play rather than a hardcoded 52, so
    // a short injected deck still reaches a coherent end.
    if (this.cardsInPlay > 0 && onFoundations === this.cardsInPlay) {
      this.emit("game-won", undefined);
    }
  }
}
