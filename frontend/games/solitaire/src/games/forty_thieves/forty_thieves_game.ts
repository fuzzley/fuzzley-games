import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipOnlyEffects } from "@/games/common/move_effects";
import { drawToWaste } from "@/games/common/stock_pile";
import { DeckOptions } from "@/games/common/deck_options";
import {
  FORTY_THIEVES_TWO_DECKS,
  dealFortyThievesLayout,
} from "./forty_thieves_deal";
import {
  DEFAULT_FORTY_THIEVES_VARIANT,
  FortyThievesVariant,
} from "./forty_thieves_rules";
import {
  FortyThievesRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  fortyThievesZoneSpecs,
} from "./forty_thieves_zones";
import { ActionKind } from "@/games/common/action_kinds";

/** How many cards a draw turns over: one, in every game of the family. */
export const DRAW_COUNT = 1;

/** Configures a game of the Forty Thieves family. */
export interface FortyThievesOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: FortyThievesVariant;
}

/**
 * Plays Forty Thieves or one of its variants: two decks, eight foundations, and
 * a stock drawn one card at a time that is never recycled.
 */
export class FortyThievesGame extends DealtTableGame {
  /** The face-down stock, drawn one card at a time and never recycled. */
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up waste holding drawn cards. */
  public readonly waste: CardPile<PlayingCard>;
  /** The eight foundation piles, two per suit. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The columns, however many this variant lays out. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /**
   * Which of the family is being played, public because the board factory
   * reads the board's width from it.
   */
  public readonly variant: FortyThievesVariant;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = deckCardIds(FORTY_THIEVES_TWO_DECKS),
    random = Math.random,
    variant = DEFAULT_FORTY_THIEVES_VARIANT,
  }: FortyThievesOptions = {}) {
    super({
      zones: fortyThievesZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // Foundations only: which column a card goes to is most of the player's
      // decision.
      autoMoveRoles: [FortyThievesRole.FOUNDATION],
      winsWhenAllCardsIn: FortyThievesRole.FOUNDATION,
    });

    this.variant = variant;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.foundations = this.pilesOfRole(FortyThievesRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(FortyThievesRole.TABLEAU);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    dealFortyThievesLayout(
      deck,
      this.foundations,
      this.tableaus,
      this.stock,
      this.variant,
    );
  }

  // --- The stock ---

  /** Whether the stock has a card left to turn, as it is never recycled. */
  public get canDraw(): boolean {
    return !this.stock.isEmpty;
  }

  /** Turns a card from the stock onto the waste, returning whether it could. */
  public drawCard(): boolean {
    if (!this.canDraw) {
      return false;
    }

    this.commitAction(
      ActionKind.DRAW,
      drawToWaste(this.tabletop, this.stock, this.waste, DRAW_COUNT),
    );
    return true;
  }

  // --- What a Forty Thieves move does beyond moving its cards ---

  /**
   * Turns over the card the move exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return flipOnlyEffects(move, FortyThievesRole.TABLEAU);
  }
}
