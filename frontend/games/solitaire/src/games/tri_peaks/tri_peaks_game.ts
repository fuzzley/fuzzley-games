import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/game/dealt_table_game";
import { MoveEffects } from "@/engine/tableau/moves/move";
import { isUncovered } from "@/engine/tableau/rules/grab";
import { DeckOptions } from "@/games/common/deck_options";
import { drawToWaste } from "@/games/common/stock_pile";
import { TriPeaksRole } from "./tri_peaks_rules";
import {
  BURIED_ROWS,
  PEAK_PLACES,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  peakPileId,
  triPeaksZoneSpecs,
} from "./tri_peaks_zones";
import { ActionKind } from "@/games/common/action_kinds";

/**
 * Plays TriPeaks: three overlapping peaks cleared onto one waste, a rank up or
 * down at a time round the corner, each card turning up as soon as nothing
 * covers it.
 */
export class TriPeaksGame extends DealtTableGame {
  /** The face-down stock, turned onto the waste one card at a time. */
  public readonly stock: ReadonlyCardPile<PlayingCard>;
  /** The single pile every card is played onto. */
  public readonly waste: ReadonlyCardPile<PlayingCard>;
  /** The places in the peaks, row by row from the tips. */
  public readonly places: readonly ReadonlyCardPile<PlayingCard>[];

  /** Creates a game whose piles are empty until the first deal. */
  constructor({ cardIds = ALL_PLAYING_CARD_IDS, random }: DeckOptions = {}) {
    super({
      zones: triPeaksZoneSpecs(),
      deck: { cardIds, random },
      autoMoveRoles: [TriPeaksRole.WASTE],
      // Deliberately absent: the game is won by clearing the peaks, with
      // cards still in the stock. See `isWon`.
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.places = PEAK_PLACES.map(({ row, index }) =>
      this.requirePile(peakPileId(row, index)),
    );
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    for (const [index, place] of this.places.entries()) {
      const buried = (PEAK_PLACES[index]?.row ?? 0) < BURIED_ROWS;
      if (!deal.dealTo(place, !buried)) return;
    }
    if (!deal.dealTo(this.waste, true)) return;
    deal.dealRest(this.stock, false);
  }

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
      drawToWaste(this.tabletop, this.stock, this.waste, 1),
    );
    return true;
  }

  /**
   * Turns up every face-down card in the peaks that nothing covers any more.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(): MoveEffects {
    const flippedCardIds: string[] = [];
    for (const [index, place] of this.places.entries()) {
      const card = place.topCard;
      const coveredBy = PEAK_PLACES[index]?.coveredBy ?? [];
      if (card && !card.faceUp && isUncovered(coveredBy, this.board)) {
        card.faceUp = true;
        flippedCardIds.push(card.id);
      }
    }
    return { scoreDelta: 0, flippedCardIds };
  }

  /**
   * Returns whether all three peaks have been cleared.
   *
   * @inheritDoc
   */
  protected override isWon(): boolean {
    return this.cardsInPlay > 0 && this.places.every((place) => place.isEmpty);
  }
}
