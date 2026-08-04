import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { dealRowFromStock } from "@/games/common/row_deal";
import { dealEasthavenLayout } from "./easthaven_deal";
import {
  EasthavenRole,
  STOCK_PILE_ID,
  easthavenZoneSpecs,
} from "./easthaven_zones";

/**
 * A game of Easthaven.
 *
 * Spider's stock bolted to Klondike's objective. Seven columns of three build
 * down in alternating colours, cards reach the four foundations because the
 * player put them there, and a press of the stock deals a card onto every
 * column at once rather than turning one into a waste.
 *
 * The two halves make each other harder. Klondike survives Kings-only spaces
 * because its stock keeps offering fresh cards whatever the board looks like;
 * Spider survives its row deal because any card may start a column. Easthaven
 * takes the strict half of each, and the result is a game that can be lost
 * outright rather than merely stalled — see {@link canDeal}.
 *
 * There is no score, as there is none in FreeCell or the Yukon family: the game
 * is played against the deal, so a move earns nothing and turning a card over
 * earns nothing either.
 */
export class EasthavenGame extends DealtTableGame {
  /** The face-down pile that deals a row at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * @param cardIds The card identities to deal from. Defaults to a full 52-card
   *   deck; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    random: () => number = Math.random,
  ) {
    super({
      zones: () => easthavenZoneSpecs(),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // A foundation and nothing else. A column would take the card too, but
      // auto-moving to one means flinging a stack of unknown size at whichever
      // column happens to be declared first, which is never what was meant —
      // the same reasoning the Yukon family applies.
      autoMoveRoles: [EasthavenRole.FOUNDATION],
      winsWhenAllCardsIn: EasthavenRole.FOUNDATION,
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundations = this.pilesOfRole(EasthavenRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(EasthavenRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealEasthavenLayout(deck, this.tableaus, this.stock);
  }

  // --- The stock ---

  /**
   * Whether the stock may deal, which it may only when no column is empty.
   *
   * Spider's rule, kept — and unlike Spiderette, kept deliberately rather than
   * inherited. A card dealt onto an empty column is unrecoverable, and here the
   * consequence is sharper than in Spider: only a King may refill a space, so a
   * player holding an empty column and no free King has neither a move that
   * fills it nor a stock that will deal. That is a real way to lose Easthaven
   * rather than an oversight, and it is what the Kings-only column rule is for.
   */
  public get canDeal(): boolean {
    return !this.stock.isEmpty && this.tableaus.every((pile) => !pile.isEmpty);
  }

  /**
   * Deals one card face up onto each column, as far as the stock reaches.
   *
   * Recorded as one action, so a single undo takes the whole row back. The
   * stock holds 31 against seven columns, so the last deal is a short row of
   * three — no special case, because dealing stops when the stock runs out.
   *
   * No win check follows, unlike Spider's deal: a dealt card lands on a column,
   * never on a foundation, so no deal can be the move that finishes the game.
   */
  public dealRow(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.state.moves++;
    this.recordTransfers("deal", dealRowFromStock(this.stock, this.tableaus));
    return true;
  }

  // --- What an Easthaven move does beyond moving its cards ---

  /**
   * Turns over the card the move exposed.
   *
   * The only effect a move has. There is no score to change, and no completed
   * run to collect — a foundation here is filled a card at a time by the player,
   * so there is nothing for the game to notice on its behalf.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return flipOnlyEffects(move, EasthavenRole.TABLEAU);
  }
}
