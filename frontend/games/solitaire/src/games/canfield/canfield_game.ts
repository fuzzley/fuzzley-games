import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { readNumber, readObject } from "@/engine/core/common/json_reader";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove, CardTransfer } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { flipExposedTop } from "@/games/common/completed_runs";
import { DeckOptions } from "@/games/common/deck_options";
import { drawToWaste, recycleWasteToStock } from "@/games/common/stock_pile";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
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

/** Holds what the game keeps outside its piles, for a snapshot. */
interface CanfieldExtra {
  /** How many times the waste has been turned back onto the stock. */
  readonly recycleCount: number;
}

/** Reads a snapshot's extra state as Canfield's. */
function readCanfieldExtra(value: unknown): CanfieldExtra {
  const extra = readObject(value, "extra");
  return { recycleCount: readNumber(extra.recycleCount, "extra.recycleCount") };
}

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
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up waste. */
  public readonly waste: CardPile<PlayingCard>;
  /** The thirteen cards dealt aside. */
  public readonly reserve: CardPile<PlayingCard>;
  /** The four suit foundations. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The four columns. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Which of the family is being played. */
  public readonly variant: CanfieldVariant;

  private readonly rules: CanfieldVariantRules;
  private recycleCount = 0;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = DEFAULT_CANFIELD_VARIANT,
  }: CanfieldOptions = {}) {
    super({
      zones: canfieldZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
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
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    this.recycleCount = 0;
    dealCanfieldLayout(this.rules, deck, this);
  }

  // --- The stock ---

  /** How many more times the waste may be recycled, which may be Infinity. */
  public get recyclesRemaining(): number {
    return Math.max(0, this.rules.maxRecycles - this.recycleCount);
  }

  /**
   * Draws from the stock onto the waste, or recycles the waste once the stock
   * is empty and a recycle is left.
   */
  public drawCardsFromStock(): void {
    if (!this.stock.isEmpty) {
      this.commitAction(
        "draw",
        drawToWaste(this.stock, this.waste, this.rules.drawCount),
      );
    } else if (!this.waste.isEmpty && this.recyclesRemaining > 0) {
      this.recycleCount++;
      this.commitAction("recycle", recycleWasteToStock(this.waste, this.stock));
    }
  }

  /**
   * Returns the plain outline for the empty stock once a press would do
   * nothing, and a pip per recycle left when the recycles are counted.
   *
   * @inheritDoc
   */
  public override pileBackgroundKey(
    pile: CardPile<PlayingCard>,
  ): string | undefined {
    if (pile !== this.stock) {
      return super.pileBackgroundKey(pile);
    }
    if (this.isSpentStock()) {
      return CLOSED_STOCK_PLACEHOLDER;
    }
    const allowed = this.rules.maxRecycles;
    return Number.isFinite(allowed) && allowed > 0
      ? recyclePipsPlaceholder(this.recyclesRemaining, allowed)
      : super.pileBackgroundKey(pile);
  }

  /**
   * Returns false for the empty stock once a press would recycle nothing.
   *
   * @inheritDoc
   */
  public override isEmptySlotActionable(pile: CardPile<PlayingCard>): boolean {
    return (
      !(pile === this.stock && this.isSpentStock()) &&
      super.isEmptySlotActionable(pile)
    );
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
      this.reserve.removeCard(filler);
      move.sourcePile.addCard(filler);
      followUpTransfers.push({
        cardIds: [filler.id],
        fromPileId: this.reserve.id,
        toPileId: move.sourcePile.id,
        faceUpBefore: true,
      });
      const flipped = flipExposedTop(this.reserve);
      if (flipped) flippedCardIds.push(flipped.id);
    }

    return { scoreDelta: 0, flippedCardIds, followUpTransfers };
  }

  /** @inheritDoc */
  protected override afterUndo(move: AppliedMove): void {
    if (move.kind === "recycle") {
      // So the player gets the spent recycle back with the board.
      this.recycleCount--;
    }
  }

  /** @inheritDoc */
  protected override saveExtra(): CanfieldExtra {
    return { recycleCount: this.recycleCount };
  }

  /** @inheritDoc */
  protected override restoreExtra(extra: unknown): void {
    this.recycleCount = readCanfieldExtra(extra).recycleCount;
  }
}
