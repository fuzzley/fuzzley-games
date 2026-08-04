import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { AppliedMove, CardTransfer, relocatedCardIds } from "./move";

/**
 * What a history needs of the board to put an action back.
 *
 * Narrow on purpose: reversing a transfer is a matter of finding piles and
 * cards by id, and ordering the board is a matter of walking the piles. A
 * history that could do more than that would be deciding things that are the
 * game's to decide.
 */
export interface HistoryBoard {
  /** The pile with the given id, or undefined. */
  getPileById(pileId: string): CardPile<PlayingCard> | undefined;
  /** The card with the given id, or undefined. */
  getCardById(cardId: string): PlayingCard | undefined;
  /** Every pile on the board, in declaration order. */
  readonly piles: readonly CardPile<PlayingCard>[];
}

/**
 * Told which cards an action just moved from one pile to another, bottom-first
 * within each run it moved.
 *
 * The model relocates a card the instant the action is taken, while its sprite
 * is still back at the pile it left. A view listens so it can lift those cards
 * clear of the board until they have caught up.
 */
export type RelocationListener = (cardIds: readonly string[]) => void;

/**
 * The applied actions a game can take back, and the cards each one moved.
 *
 * Split out of {@link TableGame}, which had grown to hold the piles, the rules,
 * the move machinery, the interaction predicates and this all at once. Undo is
 * a self-contained concern: it is a stack of what happened and how to reverse
 * it, and it needs the board only to look pile and card ids back up.
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

  /**
   * Appends an applied action and announces the cards it relocated.
   *
   * Every action that moves cards between piles passes through here, which is
   * what makes it the one place a view has to listen to.
   */
  record(move: AppliedMove): void {
    this.applied.push(move);
    this.announce(move);
  }

  /**
   * Reverses the most recent action, restoring the piles and the face-up states
   * to what they were before it.
   *
   * Deliberately does *not* touch the score or the move count, and does not
   * announce: those belong to the game, which knows how its score is clamped
   * and has a hook to run first. The caller finishes the job with
   * {@link announce}.
   *
   * @returns The action reversed, or null when there is no history.
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

  /** Drops the whole history, for a new deal that nothing before it precedes. */
  clear(): void {
    this.applied.length = 0;
  }

  /**
   * Follows the cards each action relocates, including the ones undo puts back.
   *
   * @param listener Told which cards moved, bottom-first within each run as
   *   they now lie.
   * @returns Unsubscribes the listener.
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
   * Where every card in play now lies, as a rank that orders the whole board.
   *
   * Counted across the piles rather than within each one, so two cards in
   * different piles never share a rank — the same ordering the view builder
   * gives resting cards, so the two agree by construction. Built fresh per
   * announcement because that is the only thing it is for: an action has just
   * moved the cards it is about to describe.
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
