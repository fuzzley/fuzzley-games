import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard, Rank } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { readNumber, readObject } from "@/engine/core/common/json_reader";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove, CardTransfer } from "@/engine/tableau/move";

import { DeckOptions } from "@/games/common/deck_options";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
import {
  dealMontanaFamilyLayout,
  redealArrangement,
  rowsOf,
} from "./montana_deal";
import {
  DEFAULT_MAX_REDEALS,
  DEFAULT_MONTANA_VARIANT,
  MaxRedeals,
  MontanaRole,
  isMontanaSolved,
  montanaColumnCount,
  montanaDeck,
  montanaFirstRank,
  settledPrefixLength,
} from "./montana_rules";
import {
  MontanaVariant,
  REDEAL_PILE_ID,
  montanaZoneSpecs,
} from "./montana_zones";
import { itemAt } from "@/engine/core/common/item_at";

/** Holds what Montana keeps outside its piles, for a snapshot. */
interface MontanaExtra {
  /** How many of the game's redeals have been spent. */
  readonly redealsUsed: number;
}

/** Reads a snapshot's extra state as Montana's. */
function readMontanaExtra(value: unknown): MontanaExtra {
  const extra = readObject(value, "extra");
  return { redealsUsed: readNumber(extra.redealsUsed, "extra.redealsUsed") };
}

/** Configures a game of the Montana family. */
export interface MontanaOptions extends DeckOptions {
  /** Which game of the family to play. */
  readonly variant?: MontanaVariant;
  /** How many redeals the game allows: three makes Montana Addiction. */
  readonly maxRedeals?: MaxRedeals;
}

/**
 * Plays Montana, also called Gaps, or Blue Moon or Red Moon: cards in a grid
 * of four rows, where each gap takes the card that continues the run to its
 * left.
 */
export class MontanaGame extends DealtTableGame {
  /** The grid positions, row-major. */
  public readonly cells: readonly CardPile<PlayingCard>[];

  /** Which of the family is being played. */
  public readonly variant: MontanaVariant;

  /** How many redeals the game allows. */
  public readonly maxRedeals: MaxRedeals;

  /** The rank every row starts with. */
  private readonly firstRank: Rank;

  private redealsUsed = 0;
  private readonly random: () => number;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * Its `random` shuffles redeals as well as the deck.
   */
  constructor({
    variant = DEFAULT_MONTANA_VARIANT,
    cardIds = deckCardIds(montanaDeck(variant)),
    random = Math.random,
    maxRedeals = DEFAULT_MAX_REDEALS,
  }: MontanaOptions = {}) {
    super({
      zones: montanaZoneSpecs(variant, maxRedeals),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A card fits at most one gap, so auto-moving it guesses nothing.
      autoMoveRoles: [MontanaRole.CELL],
      // Deliberately absent: this game is won by arrangement, not by gathering
      // cards into a role. See `isWon`.
    });

    this.random = random;
    this.variant = variant;
    this.maxRedeals = maxRedeals;
    this.firstRank = montanaFirstRank(variant);
    this.cells = this.pilesOfRole(MontanaRole.CELL);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    this.redealsUsed = 0;
    dealMontanaFamilyLayout(this.variant, deck, this.rows);
  }

  /** The grid as rows, left to right within each. */
  public get rows(): readonly (readonly CardPile<PlayingCard>[])[] {
    return rowsOf(this.cells, montanaColumnCount(this.variant));
  }

  // --- The win ---

  /**
   * Returns whether the grid has come out in order, which is how Montana is
   * won.
   */
  protected override isWon(): boolean {
    return isMontanaSolved(this.rows, this.firstRank);
  }

  // --- The redeal ---

  /** How many redeals the player has left. */
  public get redealsRemaining(): number {
    return Math.max(0, this.maxRedeals - this.redealsUsed);
  }

  /**
   * Whether a redeal is available: one must be left, and it must have something
   * to do.
   */
  public get canRedeal(): boolean {
    return this.redealsRemaining > 0 && this.gatherable().length > 0;
  }

  /**
   * Shuffles every card not yet in its final place back out after each row's
   * settled run, as one undoable action, and returns whether it could.
   */
  public redeal(): boolean {
    if (!this.canRedeal) {
      return false;
    }

    this.redealsUsed++;

    const shuffled = this.gatherable();
    shuffle(shuffled, this.random);
    const arrangement = redealArrangement(this.rows, shuffled, this.firstRank);

    // Every card comes off the board before any goes back, so a cell being
    // vacated and filled in the same pass cannot collide.
    const origin = new Map<string, CardPile<PlayingCard>>();
    for (const cell of this.cells) {
      const card = cell.topCard;
      if (!card) continue;
      origin.set(card.id, cell);
      cell.removeCard(card);
    }

    const transfers: CardTransfer[] = [];
    arrangement.forEach((card, index) => {
      if (!card) return;
      const cell = itemAt(this.cells, index);
      cell.addCard(card);

      const from = origin.get(card.id);
      // A card that came back to the cell it started in did not move, and
      // recording it would only make undo do redundant work.
      if (!from || from.id === cell.id) return;
      transfers.push({
        cardIds: [card.id],
        fromPileId: from.id,
        toPileId: cell.id,
        faceUpBefore: true,
      });
    });

    this.commitAction("redeal", transfers);
    return true;
  }

  /**
   * Returns the redeal marker's pips while it can redeal, and the plain
   * outline once a press would do nothing.
   *
   * @inheritDoc
   */
  public override pileBackgroundKey(
    pile: CardPile<PlayingCard>,
  ): string | undefined {
    if (pile.id !== REDEAL_PILE_ID) {
      return super.pileBackgroundKey(pile);
    }
    return this.canRedeal
      ? recyclePipsPlaceholder(this.redealsRemaining, this.maxRedeals)
      : CLOSED_STOCK_PLACEHOLDER;
  }

  /**
   * Returns whether the redeal marker would redeal if pressed.
   *
   * @inheritDoc
   */
  public override isEmptySlotActionable(pile: CardPile<PlayingCard>): boolean {
    return pile.id === REDEAL_PILE_ID
      ? this.canRedeal
      : super.isEmptySlotActionable(pile);
  }

  /** @inheritDoc */
  protected override afterUndo(move: AppliedMove): void {
    if (move.kind === "redeal") {
      // So the player gets the spent redeal back with the board.
      this.redealsUsed--;
    }
  }

  /** @inheritDoc */
  protected override saveExtra(): MontanaExtra {
    return { redealsUsed: this.redealsUsed };
  }

  /** @inheritDoc */
  protected override restoreExtra(extra: unknown): void {
    this.redealsUsed = readMontanaExtra(extra).redealsUsed;
  }

  /**
   * Returns every card a redeal would pick up: those outside their row's
   * settled run.
   */
  private gatherable(): PlayingCard[] {
    return this.rows.flatMap((row) =>
      row
        .slice(settledPrefixLength(row, this.firstRank))
        .map((cell) => cell.topCard)
        .filter((card): card is PlayingCard => card !== undefined),
    );
  }
}
