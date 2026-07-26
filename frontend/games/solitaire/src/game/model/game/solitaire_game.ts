import { EventEmitter } from "../common/event_emitter";
import { GameEvents } from "./game_events";
import { GameSettings } from "./game_settings";
import { GameState } from "./game_state";
import { ScoringPolicy } from "./scoring_policy";
import { MoveRules } from "./move_rules";
import { Dealer } from "./dealer";
import {
  CardPile,
  PileType,
  FOUNDATION_COUNT,
  TABLEAU_COUNT,
  STOCK_PILE_ID,
  WASTE_PILE_ID,
  foundationPileId,
  tableauPileId,
} from "../card/card_pile";
import { CardRegistry } from "../card/card_registry";
import {
  PlayingCard,
  PlayingCardId,
  ALL_PLAYING_CARD_IDS,
} from "../card/playing_card";

/** A move that has passed the rules: the cards to move and where they go. */
interface ResolvedMove {
  /** The card being moved plus everything stacked on it, bottom-first. */
  movingStack: readonly PlayingCard[];
  /** The pile the stack is leaving. */
  sourcePile: CardPile<PlayingCard>;
  /** The pile the stack is joining. */
  targetPile: CardPile<PlayingCard>;
}

/**
 * Coordinates and validates the state of a standard Klondike Solitaire game.
 *
 * Owns the board's piles and orchestrates moves, draws, and scoring, delegating
 * the well-defined sub-problems to focused collaborators: {@link CardRegistry}
 * for card identity, {@link Dealer} for dealing, {@link MoveRules} for move
 * legality, and {@link ScoringPolicy} for scoring. Emits coarse lifecycle
 * events so rendering and UI layers can stay synchronized.
 */
export class SolitaireGame extends EventEmitter<GameEvents> {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock = new CardPile<PlayingCard>(
    STOCK_PILE_ID,
    PileType.STOCK,
  );
  /** The face-up waste pile containing drawn cards. */
  public readonly waste = new CardPile<PlayingCard>(
    WASTE_PILE_ID,
    PileType.WASTE,
  );
  /** The four suit foundation piles (Hearts, Diamonds, Clubs, Spades). */
  public readonly foundations: CardPile<PlayingCard>[] = [];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: CardPile<PlayingCard>[] = [];

  /** Observable user-configurable game settings. */
  public readonly settings = new GameSettings();
  /** Observable live game metrics (score, moves). */
  public readonly state = new GameState();

  private recycleCount = 0;
  private initialDeck: PlayingCard[] = [];

  /** The persistent card instances shared across every deal. */
  private readonly registry = new CardRegistry();
  private readonly pilesMap = new Map<string, CardPile<PlayingCard>>();

  /** Deals cards into the board's piles for new and restarted games. */
  private readonly dealer: Dealer;

  /** The rules used to score moves, flips, and recycles. */
  private readonly scoring: ScoringPolicy;

  /** The rules governing whether a card may be placed on a pile. */
  private readonly moveRules: MoveRules;

  /**
   * Initializes the piles.
   *
   * @param cardIds The card identities to deal from. Defaults to a full
   *   standard 52-card deck. Injectable so tests can supply a partial or empty
   *   set to exercise short-deck handling through the public API.
   * @param scoring The scoring rules to apply. Injectable so an alternate
   *   ruleset can be supplied without touching the game logic.
   * @param moveRules The move-legality rules to apply. Injectable for the same
   *   reason as {@link scoring}.
   */
  constructor(
    cardIds: ReadonlyArray<PlayingCardId> = ALL_PLAYING_CARD_IDS,
    scoring: ScoringPolicy = new ScoringPolicy(),
    moveRules: MoveRules = new MoveRules(),
  ) {
    super();

    this.scoring = scoring;
    this.moveRules = moveRules;
    this.dealer = new Dealer(this.registry, cardIds);
    this.initializePiles();
  }

  /** Initializes all card piles and registers them in the lookup map. */
  private initializePiles(): void {
    this.pilesMap.set(this.stock.id, this.stock);
    this.pilesMap.set(this.waste.id, this.waste);

    for (let i = 0; i < FOUNDATION_COUNT; i++) {
      const pile = new CardPile<PlayingCard>(
        foundationPileId(i),
        PileType.FOUNDATION,
      );
      this.foundations.push(pile);
      this.pilesMap.set(pile.id, pile);
    }

    for (let i = 0; i < TABLEAU_COUNT; i++) {
      const pile = new CardPile<PlayingCard>(
        tableauPileId(i),
        PileType.TABLEAU,
      );
      this.tableaus.push(pile);
      this.pilesMap.set(pile.id, pile);
    }
  }

  /**
   * Fetches a pile by its unique string identifier.
   *
   * @param pileId The ID of the pile to find.
   * @returns The matching CardPile or undefined.
   */
  public getPileById(pileId: string): CardPile<PlayingCard> | undefined {
    return this.pilesMap.get(pileId);
  }

  /**
   * Fetches a logical card by its string ID.
   *
   * @param cardId The ID of the card to find.
   * @returns The PlayingCard or undefined.
   */
  public getCardById(cardId: string): PlayingCard | undefined {
    return this.registry.get(cardId);
  }

  /**
   * Finds which pile contains a given card.
   *
   * @param cardId The ID of the card to search for.
   * @returns The parent CardPile or undefined.
   */
  public getPileContainingCard(
    cardId: string,
  ): CardPile<PlayingCard> | undefined {
    const card = this.getCardById(cardId);
    if (!card) return undefined;

    const allPiles = [
      this.stock,
      this.waste,
      ...this.foundations,
      ...this.tableaus,
    ];
    for (const pile of allPiles) {
      if (pile.contains(card)) {
        return pile;
      }
    }
    return undefined;
  }

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

  /**
   * Restarts the game using the exact same initial deck ordering.
   */
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
    this.resetPiles();

    if (this.settings.debug.almostWin) {
      this.dealer.dealAlmostWin(this.foundations, this.tableaus);
    } else {
      const deck = createDeck();
      this.dealer.dealOpeningLayout(deck, this.tableaus, this.stock);
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

  /**
   * Resets all card piles to their initial empty state.
   *
   * The {@link CardRegistry} is intentionally left intact: the render layer's
   * PlayingCardVisual wrappers retain references to those PlayingCard objects,
   * so reusing the instances keeps the model and its sprites in sync.
   */
  private resetPiles(): void {
    this.stock.clear();
    this.waste.clear();
    for (const foundation of this.foundations) {
      foundation.clear();
    }
    for (const tableau of this.tableaus) {
      tableau.clear();
    }
  }

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

  /**
   * Draws up to drawCount cards from the stock pile and moves them to the waste pile.
   */
  private drawFromStock(): void {
    const drawCount = Math.min(this.settings.drawCount, this.stock.size);
    for (let i = 0; i < drawCount; i++) {
      const topCard = this.stock.topCard;
      if (!topCard) return;
      this.stock.removeCard(topCard);
      topCard.faceUp = true;
      this.waste.addCard(topCard);
    }
  }

  /**
   * Recycles the waste pile back into the stock pile, face-down. The caller
   * guarantees the waste is non-empty.
   */
  private recycleWaste(): void {
    this.recycleCount++;
    const penalty = this.scoring.recyclePenalty(
      this.settings.drawCount,
      this.recycleCount,
    );
    this.state.score = Math.max(0, this.state.score - penalty);

    let card = this.waste.topCard;
    while (card) {
      this.waste.removeCard(card);
      card.faceUp = false;
      this.stock.addCard(card);
      card = this.waste.topCard;
    }
  }

  /**
   * Attempts to move a card and its stacked cards to a destination pile.
   *
   * Performs rule checks before executing the move.
   *
   * @param cardId The ID of the card to move.
   * @param targetPileId The ID of the destination pile.
   * @returns True if the move was valid and executed; false otherwise.
   */
  public moveCardToPile(cardId: string, targetPileId: string): boolean {
    const move = this.resolveMove(cardId, targetPileId);
    if (!move) {
      return false;
    }

    this.state.moves++;
    const scoreChange = this.scoring.moveScore(
      move.sourcePile.type,
      move.targetPile.type,
    );
    this.state.score = Math.max(0, this.state.score + scoreChange);

    this.executeMove(move.movingStack, move.sourcePile, move.targetPile);
    this.autoFlipExposedCard(move.sourcePile);
    this.checkWinCondition();

    return true;
  }

  /**
   * Whether moving a card, along with the cards stacked on it, to the given pile
   * would be legal.
   *
   * The same question {@link moveCardToPile} answers before it commits, asked on
   * its own so a caller can tell a player where a card may land without moving
   * it there.
   *
   * @param cardId The ID of the card to move.
   * @param targetPileId The ID of the destination pile.
   * @returns True if the move would be accepted.
   */
  public canMoveCardToPile(cardId: string, targetPileId: string): boolean {
    return this.resolveMove(cardId, targetPileId) !== null;
  }

  /**
   * Resolves a requested move into the stack and piles it would act on, or null
   * when the rules reject it.
   *
   * @param cardId The ID of the card to move.
   * @param targetPileId The ID of the destination pile.
   */
  private resolveMove(
    cardId: string,
    targetPileId: string,
  ): ResolvedMove | null {
    const card = this.getCardById(cardId);
    const targetPile = this.getPileById(targetPileId);
    const sourcePile = this.getPileContainingCard(cardId);

    if (!card || !targetPile || !sourcePile || sourcePile.id === targetPileId) {
      return null;
    }

    // A card can only be moved if it is face up
    if (!card.faceUp) {
      return null;
    }

    // The moving stack is this card plus everything on top of it. The index is
    // valid because getPileContainingCard only returns a pile holding the card.
    const sourceCards = sourcePile.getCards();
    const movingStack = sourceCards.slice(sourceCards.indexOf(card));

    if (!this.moveRules.canPlace(card, targetPile, movingStack.length)) {
      return null;
    }

    return { movingStack, sourcePile, targetPile };
  }

  /**
   * Automatically moves a card to its best available destination.
   *
   * This centralizes the "double-click to auto-move" rule: a foundation is
   * always preferred over a tableau, and the card is never moved onto the pile
   * that already contains it. Each candidate move is delegated to
   * {@link moveCardToPile}, so all standard validation, scoring, and events
   * still apply and no move rules are duplicated here.
   *
   * @param cardId The ID of the card to auto-move.
   * @returns True if the card was moved to a foundation or tableau; false if no
   *   legal destination accepted it.
   */
  public autoMoveCard(cardId: string): boolean {
    const sourcePile = this.getPileContainingCard(cardId);

    for (const foundation of this.foundations) {
      if (this.moveCardToPile(cardId, foundation.id)) {
        return true;
      }
    }

    for (const tableau of this.tableaus) {
      if (sourcePile?.id === tableau.id) {
        continue;
      }
      if (this.moveCardToPile(cardId, tableau.id)) {
        return true;
      }
    }

    return false;
  }

  /** Moves the stack from the source pile to the target pile. */
  private executeMove(
    movingStack: readonly PlayingCard[],
    sourcePile: CardPile<PlayingCard>,
    targetPile: CardPile<PlayingCard>,
  ): void {
    for (const movingCard of movingStack) {
      sourcePile.removeCard(movingCard);
      targetPile.addCard(movingCard);
    }
  }

  /**
   * Turns the newly exposed top card of a tableau face up after a move,
   * awarding the flip bonus. Does nothing for non-tableau source piles or when
   * the exposed card is already face up.
   *
   * @param sourcePile The pile the moved stack was taken from.
   */
  private autoFlipExposedCard(sourcePile: CardPile<PlayingCard>): void {
    if (sourcePile.type !== PileType.TABLEAU) {
      return;
    }
    const topRemaining = sourcePile.topCard;
    if (!topRemaining || topRemaining.faceUp) {
      return;
    }

    topRemaining.faceUp = true;
    this.state.score += this.scoring.tableauFlipBonus();
  }

  /**
   * Determines if a card is currently interactable based on standard Klondike rules.
   *
   * @param card The logical playing card model.
   * @returns True if the card can be played/moved.
   */
  public isCardInteractable(card: PlayingCard): boolean {
    const pile = this.getPileContainingCard(card.id);
    return pile ? this.isCardInteractableInPile(card, pile) : false;
  }

  /**
   * The pile-aware form of {@link isCardInteractable}, for callers that already
   * know which pile holds the card (e.g. the per-frame view builder). Avoids the
   * pile lookup that {@link isCardInteractable} performs.
   *
   * @param card The logical playing card model.
   * @param pile The pile known to contain the card.
   */
  public isCardInteractableInPile(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean {
    if (pile.type === PileType.TABLEAU) {
      // Any face-up card in a tableau is interactable.
      return card.faceUp;
    }

    // The stock, waste, and foundation piles only expose their top card.
    return pile.topCard === card;
  }

  /**
   * Determines if a card is currently draggable based on standard Klondike rules.
   * Stock pile cards are clickable but not draggable.
   *
   * @param card The logical playing card model.
   * @returns True if the card can be dragged.
   */
  public isCardDraggable(card: PlayingCard): boolean {
    const pile = this.getPileContainingCard(card.id);
    return pile ? this.isCardDraggableInPile(card, pile) : false;
  }

  /**
   * The pile-aware form of {@link isCardDraggable}. See
   * {@link isCardInteractableInPile}.
   *
   * @param card The logical playing card model.
   * @param pile The pile known to contain the card.
   */
  public isCardDraggableInPile(
    card: PlayingCard,
    pile: CardPile<PlayingCard>,
  ): boolean {
    if (pile.type === PileType.STOCK) {
      return false;
    }
    return this.isCardInteractableInPile(card, pile);
  }

  private checkWinCondition(): void {
    let totalFoundationCards = 0;
    for (const foundation of this.foundations) {
      totalFoundationCards += foundation.size;
    }

    // Every card in play lives in the registry, so the game is won once they
    // have all reached the foundations. Deriving the target from the registry
    // (rather than a hardcoded 52) keeps a short injected deck consistent.
    if (this.registry.size > 0 && totalFoundationCards === this.registry.size) {
      this.emit("game-won", undefined);
    }
  }
}
