import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { TableGame } from "@/engine/tableau/table_game";
import { FreeCellDealer } from "./freecell_deal";
import {
  FreeCellRole,
  FreeCellVariant,
  freeCellZoneSpecs,
} from "./freecell_zones";

/** Lifecycle events a FreeCell game emits. */
export type FreeCellEvents = {
  /** Emitted when every card has reached a foundation. */
  "game-won": undefined;
  /** Emitted when the game is restarted or a new game is dealt. */
  "game-reset": undefined;
};

/**
 * A game of FreeCell.
 *
 * Notable mostly for what it does not have. There is no stock, so nothing draws
 * and nothing recycles. Every card is dealt face up, so nothing is ever turned
 * over and there is no bonus for doing so. There is no score at all — FreeCell
 * is played against the deal, not for points.
 *
 * What is left is a board, the rules its zones declare, and a win condition,
 * which is the measure of how much {@link TableGame} carries on its own.
 *
 * Also plays Baker's Game, which differs only in what its columns build by. It
 * gets its own catalog entry but not its own class: a separate module would
 * duplicate six files in order to change two rules.
 */
export class FreeCellGame extends TableGame<FreeCellEvents> {
  /** The four single-card holding cells. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The eight columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  private initialDeck: PlayingCard[] = [];
  private readonly dealer: FreeCellDealer;

  /** Whether to deal a nearly finished board, for verification. */
  public almostWin = false;

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param variant The column rules to play by. A constructor parameter rather
   *   than a field because the zones closure is built from it during `super`,
   *   before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    variant: FreeCellVariant = FreeCellVariant.FREECELL,
  ) {
    const registry = new CardRegistry();
    super({
      zones: () => freeCellZoneSpecs(variant),
      registry,
      // A foundation is always best; a cell is a last resort, since parking a
      // card there is what a player is trying to avoid.
      autoMoveRoles: [
        FreeCellRole.FOUNDATION,
        FreeCellRole.TABLEAU,
        FreeCellRole.CELL,
      ],
    });

    this.dealer = new FreeCellDealer(registry, cardIds, random);
    this.cells = this.pilesOfRole(FreeCellRole.CELL);
    this.foundations = this.pilesOfRole(FreeCellRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(FreeCellRole.TABLEAU);
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

    if (this.almostWin) {
      this.dealer.dealAlmostWin(this.foundations, this.tableaus);
    } else {
      this.dealer.dealOpeningLayout(createDeck(), this.tableaus);
    }

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
    if (this.cardsInPlay > 0 && onFoundations === this.cardsInPlay) {
      this.emit("game-won", undefined);
    }
  }
}
