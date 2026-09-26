import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { FakeRole, STOCK_PILE_ID, WASTE_PILE_ID, fakeZoneSpecs } from "./zones";

/** How many cards a draw turns over when nothing says otherwise. */
export const DEFAULT_DRAW_COUNT = 3;

/**
 * Plays a solitaire that exists only for the engine's tests, so they need not
 * import a real game from the tier above.
 *
 * Its stock, waste, foundations and fanned columns cover the piles the engine
 * has to handle without being any game in particular.
 */
export class FakeTableGame extends DealtTableGame {
  /** The face-down pile a press draws from. */
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up pile drawn cards land on. */
  public readonly waste: CardPile<PlayingCard>;
  /** The four piles built up by suit. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** How many cards a draw turns over. */
  public readonly drawCount: number;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * @param drawCount How many cards a draw turns over, passed in because the
   *   zones are built from it during `super`.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
    drawCount: number = DEFAULT_DRAW_COUNT,
  ) {
    super({
      zones: () => fakeZoneSpecs(drawCount),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      autoMoveRoles: [FakeRole.FOUNDATION, FakeRole.TABLEAU],
      winsWhenAllCardsIn: FakeRole.FOUNDATION,
    });

    this.drawCount = drawCount;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.foundations = this.pilesOfRole(FakeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(FakeRole.TABLEAU);
  }

  /**
   * Deals column i with i + 1 cards, only the last face up, and the remainder
   * face-down onto the stock.
   *
   * @inheritDoc
   */
  protected override dealBoard(deck: PlayingCard[]): void {
    for (let column = 0; column < this.tableaus.length; column++) {
      for (let depth = 0; depth <= column; depth++) {
        const card = deck.pop();
        if (!card) return;
        card.faceUp = depth === column;
        this.tableaus[column].addCard(card);
      }
    }
    while (deck.length > 0) {
      const card = deck.pop();
      if (!card) break;
      card.faceUp = false;
      this.stock.addCard(card);
    }
  }

  /**
   * Draws from the stock onto the waste, or recycles the waste once the stock
   * is empty.
   */
  public drawCardsFromStock(): void {
    if (this.stock.isEmpty && this.waste.isEmpty) {
      return;
    }

    if (this.stock.isEmpty) {
      this.recycleWaste();
      return;
    }

    const drawn: PlayingCard[] = [];
    for (let i = 0; i < Math.min(this.drawCount, this.stock.size); i++) {
      const top = this.stock.topCard;
      if (!top) break;
      this.stock.removeCard(top);
      top.faceUp = true;
      this.waste.addCard(top);
      drawn.push(top);
    }

    this.commitAction("draw", [
      {
        // Reversed into the order they sat in the stock, which a transfer
        // records.
        cardIds: drawn.reverse().map((card) => card.id),
        fromPileId: this.stock.id,
        toPileId: this.waste.id,
        faceUpBefore: false,
      },
    ]);
  }

  /** Puts the whole waste back onto the stock, face down. */
  private recycleWaste(): void {
    const recycled = [...this.waste.getCards()];
    let card = this.waste.topCard;
    while (card) {
      this.waste.removeCard(card);
      card.faceUp = false;
      this.stock.addCard(card);
      card = this.waste.topCard;
    }

    this.commitAction("recycle", [
      {
        cardIds: recycled.map((recycledCard) => recycledCard.id),
        fromPileId: this.waste.id,
        toPileId: this.stock.id,
        faceUpBefore: true,
      },
    ]);
  }

  /**
   * Turns over the card a move exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    // Not borrowed from `games/common`, which the engine's tests must not
    // import.
    const exposed =
      move.sourcePile.role === FakeRole.TABLEAU
        ? move.sourcePile.topCard
        : undefined;
    if (!exposed || exposed.faceUp) {
      return { scoreDelta: 0, flippedCardIds: [] };
    }

    exposed.faceUp = true;
    return { scoreDelta: 0, flippedCardIds: [exposed.id] };
  }
}
