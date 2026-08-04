import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { deckCardIds } from "@/engine/core/card/deck";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { shuffle } from "@/engine/core/random/shuffle";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { AppliedMove, CardTransfer } from "@/engine/tableau/move";
import { ResolvedMove } from "@/engine/tableau/table_game";
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

/**
 * How many redeals a game allows.
 *
 * Two is the usual figure, and it is what keeps the game a puzzle rather than a
 * grind: with unlimited redeals almost any deal comes out eventually, and with
 * none most deals are dead within a dozen moves.
 */
export const MAX_REDEALS = 2;

/**
 * A game of Montana, also played as Gaps.
 *
 * Forty-eight cards laid in a grid of four rows by thirteen, with four gaps
 * where the Aces would have been. A gap is filled by the card that continues the
 * run to its left — same suit, one rank up — and the game is won when every row
 * reads Two through King in a single suit.
 *
 * It is the odd one out here in almost every way. There is no stock, no
 * foundation and no tableau; there are no runs to build and nothing is ever
 * stacked, because every one of the fifty-two positions holds at most one card.
 * A move does not put a card *on* another card, it puts a card *somewhere*, and
 * whether that somewhere will have it depends on the cell to its left.
 *
 * Two consequences run through the code below. The placement rule has to see a
 * pile that is not its own target, which is what the board query on a rule's
 * context is for. And the win is an arrangement rather than a gathering, so
 * `winsWhenAllCardsIn` cannot express it and this game announces its own win.
 */
export class MontanaGame extends DealtTableGame {
  /** The fifty-two grid positions, row-major. */
  public readonly cells: readonly CardPile<PlayingCard>[];

  private redealsUsed = 0;
  private readonly random: () => number;

  /**
   * @param cardIds The card identities to deal from. Defaults to a deck without
   *   its Aces; injectable so a test can supply a shorter one.
   * @param random Source of randomness, injectable for a fixed deal. Held as
   *   well as handed to the deck, because the gaps are placed by it too.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = deckCardIds(MONTANA_DECK),
    random: () => number = Math.random,
  ) {
    super({
      zones: () => montanaZoneSpecs(),
      // Dealt face up: the whole position is visible from the first move.
      deck: new DeckSource(new CardRegistry(), cardIds, random, true),
      // A card's only legal home is a gap that wants it, so sending it there on
      // a double press is exactly right — there is no column to fling it at.
      autoMoveRoles: [MontanaRole.CELL],
      // Deliberately absent: this game is won by arrangement, not by gathering
      // cards into a role. See `afterMove`.
    });

    this.random = random;
    this.cells = this.pilesOfRole(MontanaRole.CELL);
  }

  /** @inheritDoc */
  protected override dealBoard(deck: PlayingCard[]): void {
    // Zeroed here rather than in a hook of its own: how many redeals have been
    // spent is part of the board being dealt.
    this.redealsUsed = 0;
    dealMontanaLayout(deck, this.cells, this.random);
  }

  /** The grid as rows, left to right within each. */
  public get rows(): readonly (readonly CardPile<PlayingCard>[])[] {
    return rowsOf(this.cells);
  }

  // --- The win ---

  /**
   * Announces the win when the grid comes out in order.
   *
   * Every other game here names a role that must hold every card and lets the
   * engine count. Montana's cards never leave their role, so there is nothing to
   * count and the check has to look at the shape of the board instead.
   *
   * @inheritDoc
   */
  protected override afterMove(move: ResolvedMove): void {
    void move;
    if (isMontanaSolved(this.rows)) {
      this.emit("game-won", undefined);
    }
  }

  // --- The redeal ---

  /** How many redeals the player has left. */
  public get redealsRemaining(): number {
    return Math.max(0, MAX_REDEALS - this.redealsUsed);
  }

  /**
   * Whether a redeal is available: one must be left, and it must have something
   * to do.
   *
   * A board already in order has nothing to gather, and redealing it would spend
   * a redeal to shuffle an empty set — so the button refuses rather than
   * quietly wasting one.
   */
  public get canRedeal(): boolean {
    return this.redealsRemaining > 0 && this.gatherable().length > 0;
  }

  /**
   * Gathers every card that is not in its final place, shuffles them, and lays
   * them back out after each row's settled run.
   *
   * Recorded as a single action — one transfer per card that actually moved — so
   * one undo takes the whole redeal back. That is a great many transfers for one
   * press, which is exactly why an applied move records a list of them rather
   * than a single from-and-to.
   *
   * @returns True if a redeal happened.
   */
  public redeal(): boolean {
    if (!this.canRedeal) {
      return false;
    }

    this.redealsUsed++;
    this.state.moves++;

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

    this.recordTransfers("redeal", transfers);
    return true;
  }

  /** @inheritDoc */
  protected override afterUndo(move: AppliedMove): void {
    if (move.kind === "redeal") {
      // So the player gets the spent redeal back with the board.
      this.redealsUsed--;
    }
  }

  /**
   * Every card that a redeal would pick up: those outside their row's settled
   * run.
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
