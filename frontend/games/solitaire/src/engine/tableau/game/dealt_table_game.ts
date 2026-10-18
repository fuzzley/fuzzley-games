import { PlayingCard } from "@/engine/core/card/playing_card";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { Deal } from "../dealing/deal";
import { DeckSource, DeckSourceOptions } from "../dealing/deck_source";
import { GameSnapshot } from "../session/game_snapshot";
import { PlayableGame } from "../session/playable_game";
import { resolveSnapshot } from "../session/snapshot_resolution";
import { TableGame, TableGameEvents, TableGameOptions } from "./table_game";

/** Configures a game that deals itself from a deck. */
export interface DealtTableGameOptions extends Omit<
  TableGameOptions,
  "registry"
> {
  /** The cards to deal, how they are shuffled, and how they lie. */
  readonly deck: DeckSourceOptions;
}

/**
 * Deals a table game from a deck and replays that deal on a restart, leaving
 * each game only to say where the cards go.
 */
export abstract class DealtTableGame<
  EventMap extends Record<string, unknown> & TableGameEvents = TableGameEvents,
>
  extends TableGame<EventMap>
  implements PlayableGame
{
  /** The cards this game deals from. */
  private readonly deck: DeckSource;

  /** The deal a restart replays, in dealt order. */
  private initialDeck: PlayingCard[] = [];

  constructor(options: DealtTableGameOptions) {
    const { cardIds, random, dealsFaceUp } = options.deck;
    const registry = new CardRegistry();
    super({ ...options, registry });
    this.deck = new DeckSource(registry, cardIds, random, dealsFaceUp);
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

  /** Captures the board, score, history and deal. */
  public snapshot(): GameSnapshot {
    return {
      piles: this.piles.map((pile) => ({
        id: pile.id,
        cards: pile
          .getCards()
          .map((card) => ({ id: card.id, faceUp: card.faceUp })),
      })),
      score: this.state.score,
      history: this.appliedHistory,
      deal: this.initialDeck.map((card) => card.id),
    };
  }

  /**
   * Puts the game back as a snapshot describes it, and announces a reset so a
   * view redraws.
   *
   * @throws Error, leaving the game as it was, when the snapshot names a pile
   *   or card this game lacks, or does not hold every card exactly once.
   */
  public restore(snapshot: GameSnapshot): void {
    const { board, deal } = resolveSnapshot(snapshot, this);

    this.resetPiles();
    for (const { pile, cards } of board) {
      for (const { card, faceUp } of cards) {
        this.tabletop.place(card, pile, faceUp);
      }
    }
    this.resetHistory(snapshot.history, snapshot.score);
    this.initialDeck = deal;
    this.emit("game-reset", undefined);
  }

  /** Returns the score a fresh deal starts at. */
  protected initialScore(): number {
    return 0;
  }

  /** Clears the board, score, move count and history, then deals again. */
  private beginGame(createDeck: () => PlayingCard[]): void {
    this.resetHistory([], this.initialScore());
    this.resetPiles();
    this.dealBoard(new Deal(createDeck(), this.tabletop));
    this.emit("game-reset", undefined);
  }

  /**
   * Returns a copy of the stored deal for {@link dealBoard} to drain, turned
   * back to the side the deck deals, shuffling one first if there is none.
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
   * The piles and history are already empty when it runs.
   */
  protected abstract dealBoard(deal: Deal): void;
}
