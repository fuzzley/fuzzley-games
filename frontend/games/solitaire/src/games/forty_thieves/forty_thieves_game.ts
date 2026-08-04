import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipExposedTop } from "@/games/common/completed_runs";
import { drawToWaste } from "@/games/common/stock_pile";
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

/** How many cards a draw turns over: one, in every game of the family. */
export const DRAW_COUNT = 1;

/**
 * A game of Forty Thieves, Josephine or Rank and File.
 *
 * Two decks across ten columns of four, eight foundations, and a stock that
 * turns one card at a time onto a waste — **and never takes it back**. That last
 * point is the whole character of the family. Klondike's stock is a resource to
 * be cycled and reconsidered; this one is a countdown. Every card drawn is a
 * card that must be placed now or left buried under the next one, and when the
 * sixty-four are gone they are gone.
 *
 * The three variants differ in what a column accepts, what may be lifted from
 * one, and how much of the deal is buried. All of that is declared by the zones
 * and the placement rules, so nothing below this line knows which is being
 * played.
 *
 * There is no score: like FreeCell and the Yukon family, the game is played
 * against the deal.
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
   * Which of the family is being played.
   *
   * Public because the board has to know: three of the five variants sit on
   * boards of different widths, and the board factory is handed only the game.
   * Nothing in the rules reads it — those are declared by the zones.
   */
  public readonly variant: FortyThievesVariant;

  /**
   * @param cardIds The card identities to deal from. Defaults to two full
   *   decks; injectable so a test can supply a shorter one.
   * @param random Source of shuffle randomness, injectable for a fixed deal.
   * @param variant Which of the three games to play. A constructor parameter
   *   rather than a field because the zones are built from it during `super`,
   *   before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = deckCardIds(FORTY_THIEVES_TWO_DECKS),
    random: () => number = Math.random,
    variant: FortyThievesVariant = DEFAULT_FORTY_THIEVES_VARIANT,
  ) {
    super({
      zones: () => fortyThievesZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // A foundation and nothing else. A column would often take the card too,
      // but auto-moving to one means picking a column on the player's behalf
      // when which column it goes to is most of the decision.
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
    dealFortyThievesLayout(deck, this.tableaus, this.stock, this.variant);
  }

  // --- The stock ---

  /**
   * Whether the stock has a card left to turn.
   *
   * There is no second clause, and that is the point: no recycle, so an empty
   * stock is the end of the stock rather than the end of a pass through it.
   */
  public get canDraw(): boolean {
    return !this.stock.isEmpty;
  }

  /**
   * Turns one card from the stock onto the waste.
   *
   * @returns True if a card was drawn.
   */
  public drawCard(): boolean {
    if (!this.canDraw) {
      return false;
    }

    this.state.moves++;
    this.recordTransfers(
      "draw",
      drawToWaste(this.stock, this.waste, DRAW_COUNT),
    );
    return true;
  }

  // --- What a Forty Thieves move does beyond moving its cards ---

  /**
   * Turns over the card the move exposed.
   *
   * The only effect a move has, and only Rank and File ever has one to turn: the
   * other two deal every card face up, so this is a no-op there rather than a
   * branch on the variant.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const flipped =
      move.sourcePile.role === FortyThievesRole.TABLEAU
        ? flipExposedTop(move.sourcePile)
        : undefined;
    return {
      scoreDelta: 0,
      flippedCardIds: flipped ? [flipped.id] : [],
    };
  }
}
