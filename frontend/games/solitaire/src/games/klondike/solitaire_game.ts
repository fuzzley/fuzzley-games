import { CardPile } from "@/engine/core/card/card_pile";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { DeckCardId, PlayingCard } from "@/engine/core/card/playing_card";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { AppliedMove } from "@/engine/tableau/move";
import {
  MoveEffects,
  ResolvedMove,
  TableGame,
} from "@/engine/tableau/table_game";
import { Dealer } from "./dealer";
import { GameEvents } from "./game_events";
import { GameSettings } from "./game_settings";
import {
  KlondikeRole,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  klondikeZoneSpecs,
} from "./klondike_zones";
import { ScoringPolicy } from "./scoring_policy";

/**
 * A standard Klondike Solitaire game.
 *
 * Everything true of any solitaire — the piles, whether a move is legal, undo,
 * auto-move — comes from {@link TableGame}. What is left here is Klondike
 * itself: the stock with its draw and recycle, the bonus for turning over a
 * card a move exposed, the scoring, and when the game has been won.
 */
export class SolitaireGame extends TableGame<GameEvents> {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock: CardPile<PlayingCard>;
  /** The face-up waste pile containing drawn cards. */
  public readonly waste: CardPile<PlayingCard>;
  /** The four suit foundation piles. */
  public readonly foundations: readonly CardPile<PlayingCard>[];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: readonly CardPile<PlayingCard>[];

  /** Observable user-configurable game settings. */
  public readonly settings: GameSettings;

  private recycleCount = 0;
  private initialDeck: PlayingCard[] = [];

  /** Deals cards into the board's piles for new and restarted games. */
  private readonly dealer: Dealer;

  /** The rules used to score moves, flips, and recycles. */
  private readonly scoring: ScoringPolicy;

  /**
   * Initializes the piles.
   *
   * @param cardIds The card identities to deal from. Defaults to a full
   *   standard 52-card deck. Injectable so tests can supply a partial or empty
   *   set to exercise short-deck handling through the public API.
   * @param scoring The scoring rules to apply. Injectable so an alternate
   *   ruleset can be supplied without touching the game logic.
   * @param settings The settings to play by. A constructor parameter rather
   *   than a field initializer because the zones are built from the draw mode
   *   during `super`, before this class's own fields exist.
   */
  constructor(
    cardIds: ReadonlyArray<DeckCardId> = ALL_PLAYING_CARD_IDS,
    scoring: ScoringPolicy = new ScoringPolicy(),
    settings: GameSettings = new GameSettings(),
  ) {
    const registry = new CardRegistry();
    super({
      zones: () => klondikeZoneSpecs(settings.drawCount),
      registry,
      // A foundation is always preferred over a column.
      autoMoveRoles: [KlondikeRole.FOUNDATION, KlondikeRole.TABLEAU],
    });

    this.settings = settings;
    this.scoring = scoring;
    this.dealer = new Dealer(registry, cardIds);

    this.stock = this.requirePile(STOCK_PILE_ID);
    this.waste = this.requirePile(WASTE_PILE_ID);
    this.foundations = this.pilesOfRole(KlondikeRole.FOUNDATION);
    this.tableaus = this.pilesOfRole(KlondikeRole.TABLEAU);
  }

  // --- Dealing ---

  /**
   * Shuffles the main deck and deals the initial game board.
   *
   * Tableau column i receives i+1 cards, with the top card face-up.
   */
  public startNewGame(): void {
    this.beginGame(() => {
      const deck = this.dealer.createShuffledDeck();
      this.initialDeck = [...deck];
      return deck;
    });
  }

  /** Restarts the game using the exact same initial deck ordering. */
  public restartGame(): void {
    this.beginGame(() => this.reuseInitialDeck());
  }

  /**
   * Resets the score, counters, and piles, then deals a fresh board. The deck
   * source varies between a new game and a restart, so it is supplied by the
   * caller; the almost-win debug board ignores it.
   *
   * @param createDeck Produces the deck to deal when not dealing an almost-win
   *   board.
   */
  private beginGame(createDeck: () => PlayingCard[]): void {
    this.state.score = 0;
    this.state.moves = 0;
    this.recycleCount = 0;
    this.clearHistory();
    this.resetPiles();

    if (this.settings.debug.almostWin) {
      this.dealer.dealAlmostWin(this.foundations, this.tableaus);
    } else {
      this.dealer.dealOpeningLayout(createDeck(), this.tableaus, this.stock);
    }

    this.emit("game-reset", undefined);
  }

  /**
   * Returns the stored initial deck, all cards reset face-down, so a restart
   * replays the exact same deal. Lazily creates and stores a deck the first
   * time if no game has been dealt yet.
   */
  private reuseInitialDeck(): PlayingCard[] {
    if (this.initialDeck.length === 0) {
      this.initialDeck = [...this.dealer.createShuffledDeck()];
    }
    return this.initialDeck.map((card) => {
      card.faceUp = false;
      return card;
    });
  }

  // --- The stock ---

  /**
   * Draws cards from the stock pile to the waste pile.
   *
   * If stock is empty, recycles waste back into stock. Does nothing (and counts
   * no move) when both the stock and waste are empty.
   */
  public drawCardsFromStock(): void {
    if (this.stock.isEmpty && this.waste.isEmpty) {
      return;
    }

    this.state.moves++;
    if (!this.stock.isEmpty) {
      this.drawFromStock();
    } else {
      this.recycleWaste();
    }
  }

  /** Draws up to drawCount cards from the stock pile onto the waste pile. */
  private drawFromStock(): void {
    const drawCount = Math.min(this.settings.drawCount, this.stock.size);
    const drawn: PlayingCard[] = [];
    for (let i = 0; i < drawCount; i++) {
      const topCard = this.stock.topCard;
      if (!topCard) break;
      this.stock.removeCard(topCard);
      topCard.faceUp = true;
      this.waste.addCard(topCard);
      drawn.push(topCard);
    }

    this.recordTransfers("draw", [
      {
        // Reversed: the cards came off the top of the stock, so the order they
        // were drawn in is the opposite of the order they sat in.
        cardIds: drawn.reverse().map((card) => card.id),
        fromPileId: this.stock.id,
        toPileId: this.waste.id,
        faceUpBefore: false,
      },
    ]);
  }

  /**
   * Recycles the waste pile back into the stock pile, face-down. The caller
   * guarantees the waste is non-empty.
   */
  private recycleWaste(): void {
    const scoreBefore = this.state.score;
    this.recycleCount++;
    const penalty = this.scoring.recyclePenalty(
      this.settings.drawCount,
      this.recycleCount,
    );
    this.state.score = Math.max(0, this.state.score - penalty);

    // Captured bottom-first before draining, which is the order undo restores.
    const recycled = [...this.waste.getCards()];
    let card = this.waste.topCard;
    while (card) {
      this.waste.removeCard(card);
      card.faceUp = false;
      this.stock.addCard(card);
      card = this.waste.topCard;
    }

    this.recordTransfers(
      "recycle",
      [
        {
          cardIds: recycled.map((recycledCard) => recycledCard.id),
          fromPileId: this.waste.id,
          toPileId: this.stock.id,
          faceUpBefore: true,
        },
      ],
      { scoreDelta: this.state.score - scoreBefore },
    );
  }

  // --- What a Klondike move does beyond moving its cards ---

  /**
   * Scores the move and turns over the card it exposed.
   *
   * @inheritDoc
   */
  protected override applyMoveEffects(move: ResolvedMove): MoveEffects {
    const scoreBefore = this.state.score;
    this.state.score = Math.max(
      0,
      this.state.score +
        this.scoring.moveScore(move.sourcePile.role, move.targetPile.role),
    );

    const flipped = this.autoFlipExposedCard(move.sourcePile);

    return {
      // The real delta, not what the policy proposed: the score is clamped at
      // zero, so a 15 point penalty against a score of 10 moves it by 10. It is
      // measured after the flip so the bonus that awarded is included and undo
      // takes both back together.
      scoreDelta: this.state.score - scoreBefore,
      flippedCardIds: flipped ? [flipped.id] : [],
    };
  }

  /** @inheritDoc */
  protected override afterMove(): void {
    this.checkWinCondition();
  }

  /** @inheritDoc */
  protected override afterUndo(move: AppliedMove): void {
    if (move.kind === "recycle") {
      // So the next recycle is charged the same penalty this one was.
      this.recycleCount--;
    }
  }

  /**
   * Turns the newly exposed top card of a tableau face up after a move,
   * awarding the flip bonus. Does nothing for non-tableau source piles or when
   * the exposed card is already face up.
   *
   * @param sourcePile The pile the moved stack was taken from.
   * @returns The card that was turned face up, or undefined if none was.
   */
  private autoFlipExposedCard(
    sourcePile: CardPile<PlayingCard>,
  ): PlayingCard | undefined {
    if (sourcePile.role !== KlondikeRole.TABLEAU) {
      return undefined;
    }
    const topRemaining = sourcePile.topCard;
    if (!topRemaining || topRemaining.faceUp) {
      return undefined;
    }

    topRemaining.faceUp = true;
    this.state.score += this.scoring.tableauFlipBonus();
    return topRemaining;
  }

  private checkWinCondition(): void {
    let totalFoundationCards = 0;
    for (const foundation of this.foundations) {
      totalFoundationCards += foundation.size;
    }

    if (this.cardsInPlay > 0 && totalFoundationCards === this.cardsInPlay) {
      this.emit("game-won", undefined);
    }
  }
}
