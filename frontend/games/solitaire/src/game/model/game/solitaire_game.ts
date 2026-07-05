import { EventEmitter } from "../common/event_emitter";
import { GameEvents } from "./game_events";
import { GameSettings, CardBackStyle, DrawCount } from "./game_settings";
import { GameState } from "./game_state";
import { ScoringPolicy } from "./scoring_policy";
import { CardPile, PileType } from "../card/card_pile";
import { Deck } from "../card/deck";
import {
  PlayingCard,
  PlayingCardId,
  Suit,
  Type,
  ALL_PLAYING_CARD_IDS,
  playingCardIdToString,
} from "../card/playing_card";

/**
 * Coordinates and validates the state of a standard Klondike Solitaire game.
 *
 * Emits events on state changes so rendering layers can stay synchronized.
 */
export class SolitaireGame extends EventEmitter<GameEvents> {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock = new CardPile<PlayingCard>("stock", PileType.STOCK);
  /** The face-up waste pile containing drawn cards. */
  public readonly waste = new CardPile<PlayingCard>("waste", PileType.WASTE);
  /** The four suit foundation piles (Hearts, Diamonds, Clubs, Spades). */
  public readonly foundations: CardPile<PlayingCard>[] = [];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: CardPile<PlayingCard>[] = [];

  /** Observable user-configurable game settings. */
  public readonly settings = new GameSettings();
  /** Observable live game metrics (score, moves). */
  public readonly state = new GameState();

  private recycleCount = 0;

  private readonly allCardsMap = new Map<string, PlayingCard>();
  private readonly pilesMap = new Map<string, CardPile<PlayingCard>>();

  /** The card identities used to build the deck for a new game. */
  private readonly cardIds: ReadonlyArray<PlayingCardId>;

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
   */
  constructor(
    cardIds: ReadonlyArray<PlayingCardId> = ALL_PLAYING_CARD_IDS,
    scoring: ScoringPolicy = new ScoringPolicy(),
  ) {
    super();

    this.cardIds = cardIds;
    this.scoring = scoring;
    this.initializePiles();
  }

  public setCardBackStyle(style: CardBackStyle): void {
    if (this.settings.cardBackStyle !== style) {
      this.settings.cardBackStyle$.next(style);
      this.emit("card-back-changed", { cardBackStyle: style });
    }
  }

  public setDrawCount(count: DrawCount): void {
    if (this.settings.drawCount !== count) {
      this.settings.drawCount$.next(count);
    }
  }

  public setBackgroundColor(color: string): void {
    if (this.settings.backgroundColor !== color) {
      this.settings.backgroundColor$.next(color);
    }
  }

  /** Initializes all card piles and registers them in the lookup map. */
  private initializePiles(): void {
    this.pilesMap.set(this.stock.id, this.stock);
    this.pilesMap.set(this.waste.id, this.waste);

    for (let i = 0; i < 4; i++) {
      const pile = new CardPile<PlayingCard>(
        `foundation-${i}`,
        PileType.FOUNDATION,
      );
      this.foundations.push(pile);
      this.pilesMap.set(pile.id, pile);
    }

    for (let i = 0; i < 7; i++) {
      const pile = new CardPile<PlayingCard>(`tableau-${i}`, PileType.TABLEAU);
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
    return this.allCardsMap.get(cardId);
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
    this.state.score = 0;
    this.state.moves = 0;
    this.recycleCount = 0;
    this.resetPiles();
    const deckCards = this.createAndShuffleDeck();
    this.dealTableaus(deckCards);
    this.populateStock(deckCards);
  }

  /**
   * Resets all card piles to their initial empty state.
   */
  private resetPiles(): void {
    this.stock.clear();
    this.waste.clear();
    this.allCardsMap.clear();
    for (const foundation of this.foundations) {
      foundation.clear();
    }
    for (const tableau of this.tableaus) {
      tableau.clear();
    }
  }

  /**
   * Generates a full standard deck of 52 cards, shuffles them, and registers them.
   *
   * @returns A shuffled array of PlayingCards.
   */
  private createAndShuffleDeck(): PlayingCard[] {
    const tempDeck = new Deck<PlayingCard>();
    for (const cardId of this.cardIds) {
      const playingCard = new PlayingCard();
      playingCard.suit = cardId.suit;
      playingCard.type = cardId.type;
      playingCard.faceUp = false;

      // The card id doubles as the atlas frame name (see playingCardIdToString).
      playingCard.id = playingCardIdToString(cardId);
      tempDeck.addCard(playingCard);
      this.allCardsMap.set(playingCard.id, playingCard);
    }
    tempDeck.shuffle();

    return [...tempDeck.getCards()];
  }

  /**
   * Deals cards to the 7 tableaus. Column i receives i + 1 cards,
   * where the top-most card is face-up.
   *
   * @param deckCards The array of playing cards from which to deal.
   */
  private dealTableaus(deckCards: PlayingCard[]): void {
    for (
      let tableauIndex = 0;
      tableauIndex < this.tableaus.length;
      tableauIndex++
    ) {
      for (let cardIndex = 0; cardIndex <= tableauIndex; cardIndex++) {
        const card = deckCards.pop();
        if (card) {
          card.faceUp = cardIndex === tableauIndex;
          this.tableaus[tableauIndex].addCard(card);
        }
      }
    }
  }

  /**
   * Places all remaining deck cards face-down into the stock pile.
   *
   * @param deckCards The array of remaining playing cards.
   */
  private populateStock(deckCards: PlayingCard[]): void {
    while (deckCards.length > 0) {
      const card = deckCards.pop();
      if (card) {
        card.faceUp = false;
        this.stock.addCard(card);
      }
    }
  }

  /**
   * Draws cards from the stock pile to the waste pile.
   *
   * If stock is empty, recycles waste back into stock.
   */
  public drawCardsFromStock(): void {
    this.state.moves++;
    if (this.stock.getCards().length > 0) {
      this.drawFromStock();
    } else {
      this.recycleWaste();
    }
  }

  /**
   * Draws up to drawCount cards from the stock pile and moves them to the waste pile.
   */
  private drawFromStock(): void {
    const drawCount = Math.min(
      this.settings.drawCount,
      this.stock.getCards().length,
    );
    for (let i = 0; i < drawCount; i++) {
      const currentCards = this.stock.getCards();
      const topCard = currentCards[currentCards.length - 1];
      this.stock.removeCard(topCard);
      topCard.faceUp = true;
      this.waste.addCard(topCard);

      this.emit("card-moved", {
        cardId: topCard.id,
        fromPileId: this.stock.id,
        toPileId: this.waste.id,
      });
      this.emit("card-flipped", {
        cardId: topCard.id,
        faceUp: true,
      });
    }
  }

  /**
   * Recycles the waste pile back into the stock pile, face-down.
   */
  private recycleWaste(): void {
    if (this.waste.getCards().length === 0) return;

    this.recycleCount++;
    const penalty = this.scoring.recyclePenalty(
      this.settings.drawCount,
      this.recycleCount,
    );
    this.state.score = Math.max(0, this.state.score - penalty);

    while (this.waste.getCards().length > 0) {
      const wasteCards = this.waste.getCards();
      const card = wasteCards[wasteCards.length - 1];
      this.waste.removeCard(card);
      card.faceUp = false;
      this.stock.addCard(card);

      this.emit("card-moved", {
        cardId: card.id,
        fromPileId: this.waste.id,
        toPileId: this.stock.id,
      });
      this.emit("card-flipped", {
        cardId: card.id,
        faceUp: false,
      });
    }

    this.emit("stock-recycled", undefined);
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
    const card = this.getCardById(cardId);
    const targetPile = this.getPileById(targetPileId);
    const sourcePile = this.getPileContainingCard(cardId);

    if (!card || !targetPile || !sourcePile || sourcePile.id === targetPileId) {
      return false;
    }

    // A card can only be moved if it is face up
    if (!card.faceUp) {
      return false;
    }

    // The moving stack is this card plus everything on top of it. The index is
    // valid because getPileContainingCard only returns a pile holding the card.
    const sourceCards = sourcePile.getCards();
    const movingStack = sourceCards.slice(sourceCards.indexOf(card));

    if (!this.validateMove(card, targetPile, movingStack.length)) {
      return false;
    }

    this.state.moves++;
    const scoreChange = this.scoring.moveScore(
      sourcePile.type,
      targetPile.type,
    );
    this.state.score = Math.max(0, this.state.score + scoreChange);

    this.executeMove(movingStack, sourcePile, targetPile);
    this.autoFlipExposedCard(sourcePile);
    this.checkWinCondition();

    return true;
  }

  /** Moves the stack from the source pile to the target pile, emitting events. */
  private executeMove(
    movingStack: readonly PlayingCard[],
    sourcePile: CardPile<PlayingCard>,
    targetPile: CardPile<PlayingCard>,
  ): void {
    for (const movingCard of movingStack) {
      sourcePile.removeCard(movingCard);
      targetPile.addCard(movingCard);

      this.emit("card-moved", {
        cardId: movingCard.id,
        fromPileId: sourcePile.id,
        toPileId: targetPile.id,
      });
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
    const remainingCards = sourcePile.getCards();
    if (remainingCards.length === 0) {
      return;
    }
    const topRemaining = remainingCards[remainingCards.length - 1];
    if (topRemaining.faceUp) {
      return;
    }

    topRemaining.faceUp = true;
    this.emit("card-flipped", { cardId: topRemaining.id, faceUp: true });
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
    if (!pile) {
      return false;
    }

    if (pile.type === PileType.TABLEAU) {
      // Any face-up card in a tableau is interactable.
      return card.faceUp;
    }

    // The stock, waste, and foundation piles only expose their top card.
    const cards = pile.getCards();
    return cards.length > 0 && cards[cards.length - 1] === card;
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
    if (!pile || pile.type === PileType.STOCK) {
      return false;
    }
    return this.isCardInteractable(card);
  }

  private validateMove(
    card: PlayingCard,
    targetPile: CardPile<PlayingCard>,
    movingStackSize: number,
  ): boolean {
    const targetCards = targetPile.getCards();
    const topTargetCard =
      targetCards.length > 0 ? targetCards[targetCards.length - 1] : null;

    // Moving to Tableau Pile
    if (targetPile.type === PileType.TABLEAU) {
      if (!topTargetCard) {
        // Only Kings can be placed on empty tableaus
        return card.type === Type.KING;
      }
      // Must build down in descending rank and alternating color
      const isAlternatingColor = this.isRed(card) !== this.isRed(topTargetCard);
      const isDescendingRank =
        Number(card.type) === Number(topTargetCard.type) - 1;
      return isAlternatingColor && isDescendingRank;
    }

    // Moving to Foundation Pile
    if (targetPile.type === PileType.FOUNDATION) {
      // You can only move one card at a time to foundations
      if (movingStackSize > 1) {
        return false;
      }
      if (!topTargetCard) {
        // Foundation must start with an Ace
        return card.type === Type.ACE;
      }
      // Must build up in ascending rank of the same suit
      const isSameSuit = card.suit === topTargetCard.suit;
      const isAscendingRank =
        Number(card.type) === Number(topTargetCard.type) + 1;
      return isSameSuit && isAscendingRank;
    }

    // Stock and Waste are not valid drag destinations
    return false;
  }

  private checkWinCondition(): void {
    let totalFoundationCards = 0;
    for (const foundation of this.foundations) {
      totalFoundationCards += foundation.getCards().length;
    }

    if (totalFoundationCards === 52) {
      this.emit("game-won", undefined);
    }
  }

  private isRed(card: PlayingCard): boolean {
    return card.suit === Suit.HEART || card.suit === Suit.DIAMOND;
  }
}
