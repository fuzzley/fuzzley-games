import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { CardTransfer } from "@/engine/tableau/move";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { discardPairEffects } from "@/games/common/pair_removal";
import {
  CLOSED_STOCK_PLACEHOLDER,
  RECYCLING_STOCK_PLACEHOLDER,
} from "@/games/common/zone_presets";
import { DEFAULT_MONTE_CARLO_VARIANT } from "./monte_carlo_rules";
import {
  DISCARD_PILE_ID,
  MonteCarloRole,
  MonteCarloVariant,
  STOCK_PILE_ID,
  monteCarloZoneSpecs,
} from "./monte_carlo_zones";

/** Configures a game played on Monte Carlo's grid. */
export interface MonteCarloOptions extends DeckOptions {
  /** Which of the pair to play. */
  readonly variant?: MonteCarloVariant;
}

/**
 * Plays Monte Carlo or Monte Carlo Thirteens: pairs of touching cards are
 * discarded from a five-by-five grid, which is then closed up and refilled
 * from the stock.
 */
export class MonteCarloGame extends DealtTableGame {
  /** The face-down cards that refill the grid. */
  public readonly stock: CardPile<PlayingCard>;
  /** The grid, row by row. */
  public readonly cells: readonly CardPile<PlayingCard>[];
  /** Where the pairs go. */
  public readonly discard: CardPile<PlayingCard>;

  /** Creates a game whose piles are empty until the first deal. */
  constructor({
    cardIds = ALL_PLAYING_CARD_IDS,
    random = Math.random,
    variant = DEFAULT_MONTE_CARLO_VARIANT,
  }: MonteCarloOptions = {}) {
    super({
      zones: monteCarloZoneSpecs(variant),
      deck: new DeckSource(new CardRegistry(), cardIds, random),
      // A double press pairs a card with the first touching partner, or in
      // Thirteens sends a King away on its own.
      autoMoveRoles: [MonteCarloRole.CELL, MonteCarloRole.DISCARD],
      winsWhenAllCardsIn: MonteCarloRole.DISCARD,
    });

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.cells = this.pilesOfRole(MonteCarloRole.CELL);
    this.discard = this.requirePile(DISCARD_PILE_ID);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    for (const cell of this.cells) {
      const card = deck.pop();
      if (!card) return;
      card.faceUp = true;
      cell.addCard(card);
    }

    let card = deck.pop();
    while (card) {
      card.faceUp = false;
      this.stock.addCard(card);
      card = deck.pop();
    }
  }

  /**
   * Sends the pair the move made to the discard.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    return discardPairEffects(move, this.discard);
  }

  // --- Consolidating ---

  /**
   * Whether consolidating would change anything: a gap with a card after it,
   * or a gap the stock can fill.
   */
  public get canConsolidate(): boolean {
    const firstGap = this.cells.findIndex((cell) => cell.isEmpty);
    if (firstGap === -1) return false;
    return (
      !this.stock.isEmpty ||
      this.cells.slice(firstGap).some((cell) => !cell.isEmpty)
    );
  }

  /**
   * Slides every card left in the grid towards the top left, in reading order,
   * then deals the stock into the cells left at the end, as one undoable
   * action, and returns whether there was anything to do.
   */
  public consolidate(): boolean {
    if (!this.canConsolidate) {
      return false;
    }

    // Every card comes off the grid before any goes back, so a cell being
    // vacated and filled in the same pass cannot collide.
    const remaining: { card: PlayingCard; from: CardPile<PlayingCard> }[] = [];
    for (const cell of this.cells) {
      const card = cell.topCard;
      if (!card) continue;
      remaining.push({ card, from: cell });
      cell.removeCard(card);
    }

    const transfers: CardTransfer[] = [];
    for (const [index, cell] of this.cells.entries()) {
      const slid = remaining[index];
      if (slid) {
        cell.addCard(slid.card);
        if (slid.from !== cell) {
          transfers.push(transfer(slid.card, slid.from, cell, true));
        }
        continue;
      }

      const dealt = this.stock.topCard;
      if (!dealt) continue;
      this.stock.removeCard(dealt);
      dealt.faceUp = true;
      cell.addCard(dealt);
      transfers.push(transfer(dealt, this.stock, cell, false));
    }

    this.commitAction("consolidate", transfers);
    return true;
  }

  /**
   * Returns the recycle arrow on the stock's slot while consolidating would do
   * something, and the plain outline otherwise.
   *
   * @inheritDoc
   */
  public override pileBackgroundKey(
    pile: CardPile<PlayingCard>,
  ): string | undefined {
    if (pile !== this.stock) return super.pileBackgroundKey(pile);
    return this.canConsolidate
      ? RECYCLING_STOCK_PLACEHOLDER
      : CLOSED_STOCK_PLACEHOLDER;
  }

  /**
   * Returns whether the empty stock's slot would consolidate if pressed.
   *
   * @inheritDoc
   */
  public override isEmptySlotActionable(pile: CardPile<PlayingCard>): boolean {
    return pile === this.stock
      ? pile.isEmpty && this.canConsolidate
      : super.isEmptySlotActionable(pile);
  }
}

/** Returns a one-card transfer. */
function transfer(
  card: PlayingCard,
  from: CardPile<PlayingCard>,
  to: CardPile<PlayingCard>,
  faceUpBefore: boolean,
): CardTransfer {
  return {
    cardIds: [card.id],
    fromPileId: from.id,
    toPileId: to.id,
    faceUpBefore,
  };
}
