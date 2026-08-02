import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { CardTransfer } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import {
  collectCompletedRuns,
  flipExposedTop,
} from "@/games/common/completed_runs";
import { dealScorpionLayout } from "./scorpion_deal";
import {
  STOCK_PILE_ID,
  ScorpionRole,
  scorpionZoneSpecs,
} from "./scorpion_zones";

/** How many columns the stock deals onto: the first three, one card each. */
export const STOCK_DEAL_COLUMN_COUNT = 3;

/**
 * A game of Scorpion.
 *
 * A Spider and Yukon hybrid: it collects King-to-Ace runs like Spider, but it
 * lifts cards like Yukon. Any face-up card can be picked up along with the whole
 * jumble sitting on it, so a column is never stuck — the question is only ever
 * whether the card at the bottom of what you are lifting has somewhere to land.
 * In exchange the landing is strict, same-suit only, where Spider takes any
 * descending card at all.
 *
 * A completed run leaves the board as soon as the move that finished it lands.
 * That is not a move the player made, and it is not a separate action either:
 * one undo takes both back, which is why an applied move records a list of
 * transfers rather than a single from-and-to.
 */
export class ScorpionGame extends DealtTableGame {
  /** The three-card pile that deals itself out in one press. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four piles completed runs go to. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * @param cardIds The card identities to deal from. Defaults to one standard
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => scorpionZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Only a column will take a card; a foundation is never a destination a
      // player can choose.
      autoMoveRoles: [ScorpionRole.TABLEAU],
      winsWhenAllCardsIn: ScorpionRole.FOUNDATION,
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(ScorpionRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(ScorpionRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealScorpionLayout(deck, this.tableaus, this.stock);
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may whenever it still holds cards.
   *
   * Deliberately *not* Spider's rule, which also refuses while a column is
   * empty. Scorpion has no such restriction — an empty column here is filled by
   * a King you chose to move there, and the three stock cards are the only cards
   * in the game you never get a say about. Anyone reading this alongside
   * `SpiderGame.canDeal` should know the omission is the rule, not a copy that
   * lost a clause.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty;
  }

  /**
   * Deals the whole stock: one card face up onto each of the first three
   * columns.
   *
   * All three at once, and once only — there is no draw and no recycle, so this
   * is the single moment in a game of Scorpion when cards arrive from outside
   * the tableau. Recorded as one action, so a single undo takes the whole lot
   * back.
   */
  public dealStock(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.state.moves++;
    const transfers: CardTransfer[] = [];
    for (const tableau of this.tableaus.slice(0, STOCK_DEAL_COLUMN_COUNT)) {
      const card = this.stock.topCard;
      if (!card) break;
      this.stock.removeCard(card);
      card.faceUp = true;
      tableau.addCard(card);
      transfers.push({
        cardIds: [card.id],
        fromPileId: this.stock.id,
        toPileId: tableau.id,
        faceUpBefore: false,
      });
    }

    // A dealt card can complete a run, and can uncover one buried under the
    // column it lands on top of.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    this.recordTransfers("deal", [...transfers, ...collected.transfers], {
      flippedCardIds: collected.flippedCardIds,
    });
    // Dealing the stock can finish the last run, so the win is checked here as
    // well as after a move: this is an action the engine's move path never sees.
    this.checkWinCondition();
    return true;
  }

  // --- What a Scorpion move does beyond moving its cards ---

  /** @inheritDoc */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const flipped =
      move.sourcePile.role === ScorpionRole.TABLEAU
        ? flipExposedTop(move.sourcePile)
        : undefined;
    // Collected after the flip, because taking a run off can expose another
    // card, and every card this move turned over has to be recorded together
    // for undo to turn them all back down.
    const collected = collectCompletedRuns(this.tableaus, this.foundations);
    return {
      scoreDelta: 0,
      flippedCardIds: [
        ...(flipped ? [flipped.id] : []),
        ...collected.flippedCardIds,
      ],
      followUpTransfers: collected.transfers,
    };
  }
}
