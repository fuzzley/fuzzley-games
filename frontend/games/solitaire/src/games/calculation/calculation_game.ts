import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { DeckOptions } from "@/games/common/deck_options";
import { drawToWaste } from "@/games/common/stock_pile";
import { dealCalculationLayout } from "./calculation_deal";
import { DEFAULT_CALCULATION_VARIANT } from "./calculation_rules";
import {
  CalculationRole,
  CalculationVariant,
  HAND_PILE_ID,
  STOCK_PILE_ID,
  calculationZoneSpecs,
} from "./calculation_zones";

/** Configures a game played on Calculation's board. */
export interface CalculationOptions extends DeckOptions {
  /** Which of the pair to play. */
  readonly variant?: CalculationVariant;
}

/**
 * Plays Calculation or Sir Tommy: the stock is turned a card at a time, and
 * each card goes to a foundation or is parked on one of four waste piles.
 */
export class CalculationGame extends DealtTableGame {
  /** The face-down stock, turned one card at a time. */
  public readonly stock: CardPile<PlayingCard>;
  /** The card turned and not yet placed. */
  public readonly hand: CardPile<PlayingCard>;
  /** The four foundations, in order of their interval. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The four waste piles. */
  public readonly wastes: readonly CardPile<PlayingCard>[];

  /** Which of the pair is being played. */
  public readonly variant: CalculationVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = DEFAULT_CALCULATION_VARIANT,
  }: CalculationOptions = {}) {
    super({
      zones: calculationZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Foundations only: which waste pile a card is parked on is the game.
      autoMoveRoles: [CalculationRole.FOUNDATION],
      winsWhenAllCardsIn: CalculationRole.FOUNDATION,
    });

    this.variant = variant;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.hand = this.requirePile(HAND_PILE_ID);
    this.foundations = this.pilesOfRole(CalculationRole.FOUNDATION);
    this.wastes = this.pilesOfRole(CalculationRole.WASTE);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealCalculationLayout(this.variant, deck, this.foundations, this.stock);
  }

  /**
   * Whether a card can be turned: the stock must have one, and the card turned
   * before it must have been placed.
   */
  public get canDraw(): boolean {
    return !this.stock.isEmpty && this.hand.isEmpty;
  }

  /** Turns a card from the stock into the hand, returning whether it could. */
  public drawCard(): boolean {
    if (!this.canDraw) {
      return false;
    }

    this.commitAction("draw", drawToWaste(this.stock, this.hand, 1));
    return true;
  }
}
