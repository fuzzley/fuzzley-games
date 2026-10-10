import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { Deal } from "@/engine/tableau/dealing/deal";
import { DealtTableGame } from "@/engine/tableau/dealt_table_game";
import {
  CardTransfer,
  MoveEffects,
  ResolvedMove,
} from "@/engine/tableau/moves/move";
import { flipExposedTop } from "@/games/common/completed_runs";
import { ActionKind } from "@/games/common/action_kinds";
import { DeckOptions } from "@/games/common/deck_options";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import { recycleMarker } from "@/games/common/zone_presets";
import { dealCanfieldLayout } from "./canfield_deal";
import {
  CanfieldVariantRules,
  DEFAULT_CANFIELD_VARIANT,
  canfieldRules,
} from "./canfield_rules";
import {
  CanfieldRole,
  CanfieldVariant,
  RESERVE_PILE_ID,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  canfieldZoneSpecs,
} from "./canfield_zones";

/** Configures a game of the Canfield family. */
export interface CanfieldOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: CanfieldVariant;
}

/**
 * Plays Canfield or one of its family: four columns fed from a thirteen-card
 * reserve, foundations that start on a rank the deal chooses, and a stock
 * drawn onto a waste.
 */
export class CanfieldGame extends DealtTableGame {
  /** The face-down stock. */
  public readonly stock: ReadonlyCardPile<PlayingCard>;
  /** The face-up waste. */
  public readonly waste: ReadonlyCardPile<PlayingCard>;
  /** The thirteen cards dealt aside. */
  public readonly reserve: ReadonlyCardPile<PlayingCard>;
  /** The four suit foundations. */
  public readonly foundations: readonly ReadonlyCardPile<PlayingCard>[];
  /** The four columns. */
  public readonly tableaus: readonly ReadonlyCardPile<PlayingCard>[];

  /** Which of the family is being played. */
  public readonly variant: CanfieldVariant;

  private readonly rules: CanfieldVariantRules;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random,
    variant = DEFAULT_CANFIELD_VARIANT,
  }: CanfieldOptions = {}) {
    super({
      zones: canfieldZoneSpecs(variant),
      deck: { cardIds, random },
      autoMoveRoles: [CanfieldRole.FOUNDATION, CanfieldRole.TABLEAU],
      winsWhenAllCardsIn: CanfieldRole.FOUNDATION,
    });

    this.variant = variant;
    this.rules = canfieldRules(variant);
    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.reserve = this.requirePile(RESERVE_PILE_ID);
    this.foundations = this.pilesOfRole(CanfieldRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(CanfieldRole.TABLEAU);
    this.markPile(this.stock, () =>
      recycleMarker({
        usable: this.rules.maxRecycles > 0 && !this.isSpentStock(),
        remaining: this.recyclesRemaining,
        allowed: this.rules.maxRecycles,
      }),
    );
  }

  /** @inheritDoc */
  protected override dealBoard(deal: Deal): void {
    dealCanfieldLayout(this.rules, deal, this);
  }

  // --- The stock ---

  /** How many more times the waste may be recycled, which may be Infinity. */
  public get recyclesRemaining(): number {
    return Math.max(
      0,
      this.rules.maxRecycles - this.timesApplied(ActionKind.RECYCLE),
    );
  }

  /**
   * Draws from the stock onto the waste, or recycles the waste once the stock
   * is empty and a recycle is left.
   */
  public drawCardsFromStock(): void {
    if (!this.stock.isEmpty) {
      this.commitAction(
        ActionKind.DRAW,
        drawToWaste(
          this.tabletop,
          this.stock,
          this.waste,
          this.rules.drawCount,
        ),
      );
    } else if (!this.waste.isEmpty && this.recyclesRemaining > 0) {
      this.commitAction(
        ActionKind.RECYCLE,
        recycleWasteToStock(this.tabletop, this.waste, this.stock),
      );
    }
  }

  /** Returns whether the stock is empty with nothing left to recycle into it. */
  private isSpentStock(): boolean {
    return (
      this.stock.isEmpty && (this.waste.isEmpty || this.recyclesRemaining === 0)
    );
  }

  // --- What a move does beyond moving its cards ---

  /**
   * Turns up the reserve's new top card, and fills a space the move opened
   * from the reserve, where the variant does so.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const flippedCardIds: string[] = [];
    const followUpTransfers: CardTransfer[] = [];

    if (move.sourcePile === this.reserve) {
      const flipped = flipExposedTop(this.reserve);
      if (flipped) flippedCardIds.push(flipped.id);
    }

    const filler = this.reserve.topCard;
    if (
      this.rules.reserveFillsSpaces &&
      move.sourcePile.role === CanfieldRole.TABLEAU &&
      move.sourcePile.isEmpty &&
      filler
    ) {
      followUpTransfers.push(this.tabletop.relocate([filler], move.sourcePile));
      const flipped = flipExposedTop(this.reserve);
      if (flipped) flippedCardIds.push(flipped.id);
    }

    return { scoreDelta: 0, flippedCardIds, followUpTransfers };
  }
}
