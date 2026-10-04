import { CardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { CardTransfer } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { ActionKind } from "@/games/common/action_kinds";
import { DeckOptions } from "@/games/common/deck_options";
import { discardPairEffects } from "@/games/common/pair_removal";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import { recycleMarker } from "@/games/common/zone_presets";
import {
  DEFAULT_PYRAMID_GOAL,
  DEFAULT_PYRAMID_PASSES,
  PyramidGoal,
  PyramidPasses,
} from "./pyramid_rules";
import {
  DISCARD_PILE_ID,
  HAND_PILE_ID,
  PyramidRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  pyramidZoneSpecs,
} from "./pyramid_zones";

/** Configures a Pyramid game. */
export interface PyramidOptions extends DeckOptions {
  /** When the game is won. */
  readonly goal?: PyramidGoal;
  /** How many times the stock may be gone through. */
  readonly passes?: PyramidPasses;
}

/**
 * Plays Pyramid: a pyramid of twenty-eight cards cleared by pairing free
 * cards that total thirteen, with a stock turned one card at a time.
 */
export class PyramidGame extends DealtTableGame {
  /** The face-down stock. */
  public readonly stock: CardPile<PlayingCard>;
  /** The card just turned. */
  public readonly hand: CardPile<PlayingCard>;
  /** The turned cards that found no pair. */
  public readonly waste: CardPile<PlayingCard>;
  /** Where pairs and Kings go. */
  public readonly discard: CardPile<PlayingCard>;
  /** The pyramid's places, row by row from the top. */
  public readonly places: readonly CardPile<PlayingCard>[];

  /** When the game is won. */
  public readonly goal: PyramidGoal;
  /** How many times the stock may be gone through. */
  public readonly passes: PyramidPasses;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    goal = DEFAULT_PYRAMID_GOAL,
    passes = DEFAULT_PYRAMID_PASSES,
  }: PyramidOptions = {}) {
    super({
      zones: pyramidZoneSpecs(passes),
      deck: { cardIds, random },
      // A double press sends a King away, or pairs a card with the first free
      // partner.
      autoMoveRoles: [
        PyramidRole.DISCARD,
        PyramidRole.PYRAMID,
        PyramidRole.HAND,
        PyramidRole.WASTE,
      ],
      // Deliberately absent: Relaxed Pyramid is won with cards left in the
      // stock. See `isWon`.
    });

    this.goal = goal;
    this.passes = passes;
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.hand = this.requirePile(HAND_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.discard = this.requirePile(DISCARD_PILE_ID);
    this.places = this.pilesOfRole(PyramidRole.PYRAMID);
    this.markPile(this.stock, () =>
      recycleMarker({
        usable:
          this.recyclesRemaining > 0 &&
          !(this.stock.isEmpty && !this.canRecycle),
        remaining: this.recyclesRemaining,
        allowed: this.passes - 1,
      }),
    );
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    if (!deal.dealEach(this.places, true)) return;
    deal.dealRest(this.stock, false);
  }

  /**
   * Sends the pair the move made to the discard.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return discardPairEffects(this.tabletop, move, this.discard);
  }

  /**
   * Returns whether the game is won: every card discarded, or in Relaxed
   * Pyramid the pyramid cleared.
   *
   * @inheritDoc
   */
  protected override isWon(): boolean {
    if (this.cardsInPlay === 0) return false;
    return this.goal === PyramidGoal.PYRAMID_ONLY
      ? this.places.every((place) => place.isEmpty)
      : this.discard.size === this.cardsInPlay;
  }

  // --- The stock ---

  /** How many more times the stock may be turned back over. */
  public get recyclesRemaining(): number {
    return Math.max(0, this.passes - 1 - this.timesApplied(ActionKind.RECYCLE));
  }

  /**
   * Turns the next card into the hand, moving the card held there to the
   * waste, or once the stock is out turns the waste back over if a pass is
   * left.
   */
  public drawCardsFromStock(): void {
    if (!this.stock.isEmpty) {
      this.commitAction(ActionKind.DRAW, [
        ...this.discardHand(),
        ...drawToWaste(this.tabletop, this.stock, this.hand, 1),
      ]);
    } else if (this.canRecycle) {
      this.commitAction(ActionKind.RECYCLE, [
        ...this.discardHand(),
        ...recycleWasteToStock(this.tabletop, this.waste, this.stock),
      ]);
    }
  }

  /** Whether the empty stock can be refilled from the hand and the waste. */
  private get canRecycle(): boolean {
    return (
      this.recyclesRemaining > 0 && !(this.waste.isEmpty && this.hand.isEmpty)
    );
  }

  /** Moves the card in the hand, if any, onto the waste. */
  private discardHand(): CardTransfer[] {
    const held = this.hand.topCard;
    return held ? [this.tabletop.relocate([held], this.waste)] : [];
  }
}
