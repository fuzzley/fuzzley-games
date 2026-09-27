import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { readNumber, readObject } from "@/engine/core/common/json_reader";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove, CardTransfer } from "@/engine/tableau/move";

import { DeckOptions } from "@/games/common/deck_options";
import {
  MONTANA_DECK,
  dealMontanaLayout,
  redealArrangement,
  rowsOf,
} from "./montana_deal";
import {
  MontanaRole,
  isMontanaSolved,
  settledPrefixLength,
} from "./montana_rules";
import { montanaZoneSpecs } from "./montana_zones";

/** How many redeals a game allows. */
export const MAX_REDEALS = 2;

/** Holds what Montana keeps outside its piles, for a snapshot. */
interface MontanaExtra {
  /** How many of the {@link MAX_REDEALS} redeals have been spent. */
  readonly redealsUsed: number;
}

/** Reads a snapshot's extra state as Montana's. */
function readMontanaExtra(value: unknown): MontanaExtra {
  const extra = readObject(value, "extra");
  return { redealsUsed: readNumber(extra.redealsUsed, "extra.redealsUsed") };
}

/**
 * Plays Montana, also called Gaps: forty-eight cards in a four-by-thirteen
 * grid, where each gap takes the card that continues the run to its left.
 */
export class MontanaGame extends DealtTableGame {
  /** The fifty-two grid positions, row-major. */
  public readonly cells: readonly CardPile<PlayingCard>[];

  private redealsUsed = 0;
  private readonly random: () => number;

  /**
   * Creates a game whose piles are empty until the first deal.
   *
   * Its `random` places the gaps and shuffles redeals as well as the deck.
   */
  constructor({
    cardIds = deckCardIds(MONTANA_DECK),
    random = Math.random,
  }: DeckOptions = {}) {
    super({
      zones: montanaZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A card fits at most one gap, so auto-moving it guesses nothing.
      autoMoveRoles: [MontanaRole.CELL],
      // Deliberately absent: this game is won by arrangement, not by gathering
      // cards into a role. See `isWon`.
    });

    this.random = random;
    this.cells = this.pilesOfRole(MontanaRole.CELL);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    this.redealsUsed = 0;
    dealMontanaLayout(deck, this.cells, this.random);
  }

  /** The grid as rows, left to right within each. */
  public get rows(): readonly (readonly CardPile<PlayingCard>[])[] {
    return rowsOf(this.cells);
  }

  // --- The win ---

  /**
   * Returns whether the grid has come out in order, which is how Montana is
   * won.
   */
  protected override isWon(): boolean {
    return isMontanaSolved(this.rows);
  }

  // --- The redeal ---

  /** How many redeals the player has left. */
  public get redealsRemaining(): number {
    return Math.max(0, MAX_REDEALS - this.redealsUsed);
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
    const arrangement = redealArrangement(this.cells, shuffled);

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
      const cell = this.cells[index];
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
        .slice(settledPrefixLength(row))
        .map((cell) => cell.topCard)
        .filter((card): card is PlayingCard => card !== undefined),
    );
  }
}
