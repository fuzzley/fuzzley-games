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
 * A solitaire that exists only to be run by the engine.
 *
 * Every engine test needs *a* game to drive, and Klondike used to be it — which
 * left `test/engine` importing `@/games/klondike` in seven files, so the tier
 * boundary the lint config calls "enforced, not asserted" held for `src` and
 * quietly did not for the tests. Worse, it made the engine's specs break
 * whenever Klondike changed, which is precisely backwards.
 *
 * Shaped like a conventional solitaire on purpose: a stock that draws into a
 * waste, foundations built up, columns fanned down, and a card turned over when
 * a move exposes it. That covers the cases the engine has to handle — a pile
 * that is clickable but not draggable, one drawn face-down whatever its cards
 * say, one with no placeholder behind it, and a fan that expands under the
 * pointer — without being any game in particular.
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
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; a partial set exercises short-deck handling.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param drawCount How many cards a draw turns over. A constructor parameter
   *   because the zones are built from it during `super`.
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
   * Draws from the stock onto the waste, or recycles the waste when the stock
   * has run out. Does nothing when both are empty.
   */
  public drawCardsFromStock(): void {
    if (this.stock.isEmpty && this.waste.isEmpty) {
      return;
    }

    this.state.moves++;
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

    this.recordTransfers("draw", [
      {
        // Reversed: the cards came off the top of the stock, so the order they
        // were drawn in is the opposite of the order they sat in.
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

    this.recordTransfers("recycle", [
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
    // Spelled out rather than borrowed from `games/common`: a fixture the
    // engine's own tests run on must not reach into the tier above it, or the
    // boundary it exists to protect is breached by the thing protecting it.
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
