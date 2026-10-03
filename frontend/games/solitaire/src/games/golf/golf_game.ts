import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { DeckOptions } from "@/games/common/deck_options";
import { drawToWaste } from "@/games/common/stock_pile";
import { dealGolfLayout } from "./golf_deal";
import { DEFAULT_GOLF_VARIANT } from "./golf_rules";
import {
  FOUNDATION_PILE_ID,
  GolfRole,
  GolfVariant,
  STOCK_PILE_ID,
  golfZoneSpecs,
} from "./golf_zones";

/** Configures a game of the Golf family. */
export interface GolfOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: GolfVariant;
}

/**
 * Plays Golf or Putt Putt: seven open columns cleared onto one foundation, a
 * rank up or down at a time, with a stock turned onto it when play is stuck.
 */
export class GolfGame extends DealtTableGame {
  /** The face-down stock, turned onto the foundation one card at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The single foundation, which is also the waste. */
  public readonly foundation: CardPile<PlayingCard>;
  /** The seven columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = DEFAULT_GOLF_VARIANT,
  }: GolfOptions = {}) {
    super({
      zones: golfZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      autoMoveRoles: [GolfRole.FOUNDATION],
      // Deliberately absent: the game is won by clearing the columns, with
      // cards still in the stock. See `isWon`.
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.foundation = this.requirePile(FOUNDATION_PILE_ID);
    this.tableaus = this.pilesOfRole(GolfRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealGolfLayout(deck, this.tableaus, this.foundation, this.stock);
  }

  /** Whether the stock has a card left to turn, as it is never recycled. */
  public get canDraw(): boolean {
    return !this.stock.isEmpty;
  }

  /**
   * Turns a card from the stock onto the foundation, returning whether it
   * could.
   */
  public drawCard(): boolean {
    if (!this.canDraw) {
      return false;
    }

    this.commitAction("draw", drawToWaste(this.stock, this.foundation, 1));
    return true;
  }

  /**
   * Returns whether every column has been cleared.
   *
   * @inheritDoc
   */
  protected override isWon(): boolean {
    return this.cardsInPlay > 0 && this.tableaus.every((pile) => pile.isEmpty);
  }
}
