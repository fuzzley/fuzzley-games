import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { dealRowFromStock } from "@/games/common/row_deal";
import { dealAcesUpLayout } from "./aces_up_deal";
import { AcesUpSpaces, DEFAULT_ACES_UP_SPACES } from "./aces_up_rules";
import {
  AcesUpRole,
  DISCARD_PILE_ID,
  STOCK_PILE_ID,
  acesUpZoneSpecs,
} from "./aces_up_zones";
import { ActionKind } from "@/games/common/action_kinds";

/** Configures an Aces Up game. */
export interface AcesUpOptions extends DeckOptions {
  /** What may fill an empty column. */
  readonly spaces?: AcesUpSpaces;
}

/**
 * Plays Aces Up: four columns dealt a card at a time, where a card goes to the
 * discard while a higher card of its suit shows, until only the Aces are left.
 */
export class AcesUpGame extends DealtTableGame {
  /** The face-down cards still to deal. */
  public readonly stock: ReadonlyCardPile<PlayingCard>;
  /** The four columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];
  /** Where beaten cards go. */
  public readonly discard: ReadonlyCardPile<PlayingCard>;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    spaces = DEFAULT_ACES_UP_SPACES,
  }: AcesUpOptions = {}) {
    super({
      zones: acesUpZoneSpecs(spaces),
      deck: { cardIds, random },
      // The discard first; a card it will not take can only go to a space.
      autoMoveRoles: [AcesUpRole.DISCARD, AcesUpRole.TABLEAU],
      // Deliberately absent: the Aces stay behind, so the game is won by what
      // is left rather than by gathering every card. See `isWon`.
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.tableaus = this.pilesOfRole(AcesUpRole.TABLEAU);
    this.discard = this.requirePile(DISCARD_PILE_ID);
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealAcesUpLayout(deal, this.tableaus, this.stock);
  }

  /** Whether the stock has cards left to deal. */
  public get canDeal(): boolean {
    return !this.stock.isEmpty;
  }

  /** Deals a card onto every column, returning whether there were any. */
  public deal(): boolean {
    if (!this.canDeal) {
      return false;
    }

    this.commitAction(
      ActionKind.DEAL,
      dealRowFromStock(this.tabletop, this.stock, this.tableaus),
    );
    return true;
  }

  /**
   * Returns whether everything but the Aces has been discarded.
   *
   * @inheritDoc
   */
  protected override isWon(): boolean {
    return (
      this.cardsInPlay > 0 &&
      this.stock.isEmpty &&
      this.tableaus.every((pile) =>
        pile.getCards().every((card) => card.rank === Rank.ACE),
      )
    );
  }
}
