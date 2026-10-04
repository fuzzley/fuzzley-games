import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { MoveEffects, ResolvedMove } from "@/engine/tableau/table_game";
import { DeckOptions } from "@/games/common/deck_options";
import { discardPairEffects } from "@/games/common/pair_removal";
import { recycleMarker } from "@/games/common/zone_presets";
import { DEFAULT_MONTE_CARLO_VARIANT } from "./monte_carlo_rules";
import {
  DISCARD_PILE_ID,
  MonteCarloRole,
  MonteCarloVariant,
  STOCK_PILE_ID,
  monteCarloZoneSpecs,
} from "./monte_carlo_zones";
import { ActionKind } from "@/games/common/action_kinds";

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
    // Consolidating is never counted, only possible or not.
    this.markPile(this.stock, () =>
      recycleMarker({
        usable: this.canConsolidate,
        remaining: Infinity,
        allowed: Infinity,
      }),
    );
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
    return discardPairEffects(this.tabletop, move, this.discard);
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

    // In reading order, each cell holding at most one card.
    const remaining = this.cells.flatMap((cell) => [...cell.getCards()]);
    const transfers = this.tabletop.rearrange(
      new Map(
        this.cells.map((cell, index) => {
          const card = remaining[index];
          return [cell, card ? [card] : []];
        }),
      ),
    );

    for (const cell of this.cells.slice(remaining.length)) {
      const dealt = this.stock.topCard;
      if (!dealt) break;
      transfers.push(this.tabletop.relocate([dealt], cell, { faceUp: true }));
    }

    this.commitAction(ActionKind.CONSOLIDATE, transfers);
    return true;
  }
}
