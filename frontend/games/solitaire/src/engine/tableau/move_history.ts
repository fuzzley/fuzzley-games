import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { AppliedMove, CardTransfer, relocatedCardIds } from "./move";

/** Gives a history what it needs of the board to put an action back. */
export interface HistoryBoard {
  /** Returns the pile with the given id, or undefined. */
  getPileById(pileId: string): CardPile<PlayingCard> | undefined;
  /** Returns the card with the given id, or undefined. */
  getCardById(cardId: string): PlayingCard | undefined;
  /** Every pile on the board, in declaration order. */
  readonly piles: readonly CardPile<PlayingCard>[];
}

/**
 * Receives the cards an action just moved between piles, bottom first within
 * each run.
 */
export type RelocationListener = (cardIds: readonly string[]) => void;

/**
 * Records the actions a game can take back, and announces the cards each one
 * moves.
 */
export class MoveHistory {
  /** The applied actions, oldest first, that {@link takeBack} unwinds. */
  private readonly applied: AppliedMove[] = [];

  /** Followers of the cards each action relocates. */
  private readonly listeners = new Set<RelocationListener>();

  constructor(private readonly board: HistoryBoard) {}

  /** How many applied actions can still be taken back. */
  get depth(): number {
    return this.applied.length;
  }

  /** Whether there is an action {@link takeBack} can reverse. */
  get canUndo(): boolean {
    return this.applied.length > 0;
  }

  /** Appends an applied action and announces the cards it relocated. */
  record(move: AppliedMove): void {
    this.applied.push(move);
    this.announce(move);
  }

  /**
   * Reverses the most recent action's piles and face-up states, and returns
   * the action, or null if there is none.
   *
   * Leaves the score, the move count and {@link announce} to the caller.
   */
  takeBack(): AppliedMove | null {
    const last = this.applied.pop();
    if (!last) {
      return null;
    }

    // Turn exposed cards back down first: they are still in the piles the cards
    // are about to be put back on top of.
    for (const flippedId of last.flippedCardIds) {
      const flipped = this.board.getCardById(flippedId);
      if (flipped) {
        flipped.faceUp = false;
      }
    }

    // Reverse order, so a consequence is undone before its cause: a run that
    // left for a foundation comes back before the move that completed it.
    for (const transfer of [...last.transfers].reverse()) {
      this.reverseTransfer(transfer);
    }

    return last;
  }

  /** Returns the applied actions, oldest first. */
  entries(): readonly AppliedMove[] {
    return [...this.applied];
  }

  /** Replaces the history with the given actions, oldest first. */
  load(moves: readonly AppliedMove[]): void {
    this.applied.length = 0;
    this.applied.push(...moves);
  }

  /**
   * Follows the cards each action relocates, including those undo puts back,
   * and returns a function that stops following them.
   */
  onCardsRelocated(listener: RelocationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Tells the listeners which cards an action relocated, if it relocated any. */
  announce(move: AppliedMove): void {
    const order = this.boardOrder();
    const cardIds = relocatedCardIds(move, (cardId) => order.get(cardId) ?? -1);
    if (cardIds.length === 0) return;

    // A snapshot, so a listener that unsubscribes during dispatch does not
    // change who is notified for this action.
    for (const listener of [...this.listeners]) {
      listener(cardIds);
    }
  }

  /** Puts one transfer's cards back where they came from. */
  private reverseTransfer(transfer: CardTransfer): void {
    const fromPile = this.board.getPileById(transfer.fromPileId);
    const toPile = this.board.getPileById(transfer.toPileId);
    if (!fromPile || !toPile) return;

    // cardIds are in source order, so re-appending in that order restores the
    // pile exactly, whichever way the action itself moved them.
    for (const cardId of transfer.cardIds) {
      const card = this.board.getCardById(cardId);
      if (!card) continue;
      toPile.removeCard(card);
      card.faceUp = transfer.faceUpBefore;
      fromPile.addCard(card);
    }
  }

  /**
   * Returns where every card now lies, as a rank ordering the whole board the
   * same way the view builder orders resting cards.
   */
  private boardOrder(): Map<string, number> {
    const order = new Map<string, number>();
    for (const pile of this.board.piles) {
      for (const card of pile.getCards()) {
        order.set(card.id, order.size);
      }
    }
    return order;
  }
}
