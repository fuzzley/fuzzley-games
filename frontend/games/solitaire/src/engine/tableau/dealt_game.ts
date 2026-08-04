import { PlayingCard } from "@/engine/core/card/playing_card";
import { DeckSource } from "./deck_source";
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
