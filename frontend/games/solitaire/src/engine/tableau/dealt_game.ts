import { CardPile } from "@/engine/core/card/card_pile";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DeckSource } from "./deck_source";
import { GameSnapshot, PileSnapshot } from "./game_snapshot";
import { AppliedMove } from "./move";
import { TableGame, TableGameEvents, TableGameOptions } from "./table_game";

/** How to build a game that deals itself from a deck. */
export interface DealtTableGameOptions extends Omit<
  TableGameOptions,
  "registry"
> {
  /** The cards to deal, and the state they arrive in. */
  readonly deck: DeckSource;
}

/**
 * A table game dealt from a deck, with the new-game and restart cycle written
 * once.
 *
 * Every game had its own copy of this, and the copies had drifted: the same
 * five steps in the same order, but one resetting a score the game never used,
 * another turning the reused deck face down and another not, and the win check
 * spelled three different ways. None of that was a decision — it was six
 * transcriptions of one idea.
 *
 * What actually differs between games is where the cards go, so that is the one
 * thing left abstract. A game says how to deal a board; the order of operations
 * around it, the deck kept aside so a restart replays the same game, and the
 * announcement afterwards all belong here.
 */
export abstract class DealtTableGame<
  EventMap extends Record<string, unknown> & TableGameEvents = TableGameEvents,
> extends TableGame<EventMap> {
  /** The cards this game deals from. */
  protected readonly deck: DeckSource;

  /**
   * The deal a restart replays.
   *
   * Held in dealt order rather than as a seed, because a card is a persistent
   * instance shared with its sprite: the same objects go back on the table,
   * turned back to the side the deck deals.
   */
  private initialDeck: PlayingCard[] = [];

  constructor(options: DealtTableGameOptions) {
    super({ ...options, registry: options.deck.registry });
    this.deck = options.deck;
  }

  /** Shuffles the deck and deals a fresh board. */
  public startNewGame(): void {
    this.beginGame(() => {
      const deck = this.deck.createShuffledDeck();
      this.initialDeck = [...deck];
      return deck;
    });
  }

  /** Deals the same game again from the start. */
  public restartGame(): void {
    this.beginGame(() => this.reuseInitialDeck());
  }

  // --- Snapshots ---

  /** Captures the board, score, history, deal and game's extra state. */
  public snapshot(): GameSnapshot {
    return {
      piles: this.piles.map((pile) => ({
        id: pile.id,
        cards: pile
          .getCards()
          .map((card) => ({ id: card.id, faceUp: card.faceUp })),
      })),
      score: this.state.score,
      moves: this.state.moves,
      history: this.appliedHistory,
      deal: this.initialDeck.map((card) => card.id),
      extra: this.saveExtra(),
    };
  }

  /**
   * Puts the game back as a snapshot describes it, and announces a reset so a
   * view redraws.
   *
   * @throws Error, leaving the game as it was, when the snapshot names a pile
   *   or card this game lacks, does not hold every card exactly once, or
   *   carries extra state the game rejects.
   */
  public restore(snapshot: GameSnapshot): void {
    const board = this.resolveBoard(snapshot.piles);
    const deal = this.resolveDeal(snapshot.deal);
    this.checkHistory(snapshot.history);
    this.restoreExtra(snapshot.extra);

    this.resetPiles();
    for (const { pile, cards } of board) {
      for (const { card, faceUp } of cards) {
        card.faceUp = faceUp;
        pile.addCard(card);
      }
    }
    this.state.score = snapshot.score;
    this.state.moves = snapshot.moves;
    this.replaceHistory(snapshot.history);
    this.initialDeck = deal;
    this.emit("game-reset", undefined);
  }

  /** State this game keeps outside its piles, for a snapshot. None by default. */
  protected saveExtra(): unknown {
    return null;
  }

  /**
   * Restores what {@link saveExtra} saved. Runs before the board changes, so
   * throwing rejects the snapshot and leaves the game as it was.
   */
  protected restoreExtra(extra: unknown): void {
    void extra;
  }

  /** The snapshot's piles as this game's own, holding every card once. */
  private resolveBoard(piles: readonly PileSnapshot[]) {
    this.checkEveryCardOnce(
      piles.flatMap((pile) => pile.cards.map((card) => card.id)),
      "board",
    );
    return piles.map((pile) => ({
      pile: this.resolvePile(pile.id),
      cards: pile.cards.map(({ id, faceUp }) => ({
        card: this.resolveCard(id),
        faceUp,
      })),
    }));
  }

  /** The snapshot's deal as this game's cards; empty if it has none. */
  private resolveDeal(cardIds: readonly string[]): PlayingCard[] {
    if (cardIds.length > 0) this.checkEveryCardOnce(cardIds, "deal");
    return cardIds.map((id) => this.resolveCard(id));
  }

  /** Throws unless every pile and card the history names is this game's. */
  private checkHistory(history: readonly AppliedMove[]): void {
    for (const move of history) {
      for (const transfer of move.transfers) {
        this.resolvePile(transfer.fromPileId);
        this.resolvePile(transfer.toPileId);
        transfer.cardIds.forEach((id) => this.resolveCard(id));
      }
      move.flippedCardIds.forEach((id) => this.resolveCard(id));
    }
  }

  /** Throws unless the ids are distinct and as many as the cards in play. */
  private checkEveryCardOnce(cardIds: readonly string[], part: string): void {
    const distinct = new Set(cardIds).size;
    if (distinct !== cardIds.length) {
      throw new Error(`The snapshot's ${part} lists a card twice.`);
    }
    if (distinct !== this.cardsInPlay) {
      throw new Error(
        `The snapshot's ${part} holds ${distinct} cards; this game has ${this.cardsInPlay}.`,
      );
    }
  }

  private resolvePile(pileId: string): CardPile<PlayingCard> {
    const pile = this.getPileById(pileId);
    if (!pile) throw new Error(`This game has no pile "${pileId}".`);
    return pile;
  }

  private resolveCard(cardId: string): PlayingCard {
    const card = this.getCardById(cardId);
    if (!card) throw new Error(`This game has no card "${cardId}".`);
    return card;
  }

  /**
   * Clears the board and deals it again.
   *
   * The score and the move count go back to zero whether or not the game keeps
   * a score, so a restart can never inherit one. The history is dropped rather
   * than unwound: there is nothing before a new deal to undo back to.
   */
  private beginGame(createDeck: () => PlayingCard[]): void {
    this.state.score = 0;
    this.state.moves = 0;
    this.clearHistory();
    this.resetPiles();
    this.dealBoard(createDeck());
    this.emit("game-reset", undefined);
  }

  /**
   * The stored deal, turned back to the side the deck deals.
   *
   * Lazily shuffles one the first time, so restarting before ever having dealt
   * is a new game rather than an empty board.
   *
   * Handed out as a copy, because {@link dealBoard} is free to drain what it is
   * given and every game's deal does exactly that. Passing the stored array
   * itself emptied it on the first restart, so the second restart found nothing
   * to replay and quietly dealt a freshly shuffled game instead.
   */
  private reuseInitialDeck(): PlayingCard[] {
    if (this.initialDeck.length === 0) {
      this.initialDeck = [...this.deck.createShuffledDeck()];
    }
    return this.deck.reset([...this.initialDeck]);
  }

  /**
   * Lays the deck out into the opening position for this game.
   *
   * Called with the piles already empty and the history already cleared, so an
   * implementation only has to place cards. Anything else a fresh board needs
   * reset — a recycle count, say — belongs here too.
   *
   * @param deck The cards to deal, which an implementation is free to drain.
   */
  protected abstract dealBoard(deck: PlayingCard[]): void;
}
