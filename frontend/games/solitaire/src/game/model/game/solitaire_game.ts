import { EventEmitter } from "../common/event_emitter";
import { GameEvents } from "./game_events";
import { GameSettings, CardBackStyle, DrawCount } from "./game_settings";
import { GameState } from "./game_state";
import { CardPile } from "../card/card_pile";
import { Deck } from "../card/deck";
import {
  PlayingCard,
  Suit,
  Type,
  ALL_PLAYING_CARD_IDS,
} from "../card/playing_card";

/**
 * Coordinates and validates the state of a standard Klondike Solitaire game.
 *
 * Emits events on state changes so rendering layers can stay synchronized.
 */
export class SolitaireGame extends EventEmitter<GameEvents> {
  /** The face-down stock pile from which cards are drawn. */
  public readonly stock = new CardPile<PlayingCard>("stock");
  /** The face-up waste pile containing drawn cards. */
  public readonly waste = new CardPile<PlayingCard>("waste");
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

  /** Initializes the piles. */
  constructor() {
    super();

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

  /** Initializes all card piles and registers them in the lookup map. */
  private initializePiles(): void {
    this.pilesMap.set(this.stock.id, this.stock);
    this.pilesMap.set(this.waste.id, this.waste);

    for (let i = 0; i < 4; i++) {
      const pile = new CardPile<PlayingCard>(`foundation-${i}`);
      this.foundations.push(pile);
      this.pilesMap.set(pile.id, pile);
    }

    for (let i = 0; i < 7; i++) {
      const pile = new CardPile<PlayingCard>(`tableau-${i}`);
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
      if (pile.getCards().indexOf(card) !== -1) {
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
    for (const cardId of ALL_PLAYING_CARD_IDS) {
      const playingCard = new PlayingCard();
      playingCard.suite = cardId.suit;
      playingCard.type = cardId.type;
      playingCard.faceUp = false;

      // Unique ID format: card-suitName-typeName matching Phaser sheet frames
      playingCard.id = this.generateCardId(playingCard);
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
    if (this.settings.drawCount === 1) {
      if (this.recycleCount > 1) {
        this.state.score = Math.max(0, this.state.score - 100);
      }
    } else if (this.settings.drawCount === 3) {
      if (this.recycleCount > 3) {
        this.state.score = Math.max(0, this.state.score - 20);
      }
    }

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
    // TODO: Use this or remove it.
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

    const sourceCards = sourcePile.getCards();
    const cardIndex = sourceCards.indexOf(card);
    if (cardIndex === -1) return false;

    // Get the moving stack (this card + everything on top of it)
    const movingStack = sourceCards.slice(cardIndex);

    // Validate the move
    const isValid = this.validateMove(card, targetPile, movingStack.length);
    if (!isValid) {
      return false;
    }

    this.state.moves++;

    // Scoring changes before executing the move
    let scoreChange = 0;
    if (sourcePile.id === "waste" && targetPile.id.startsWith("tableau-")) {
      scoreChange = 5;
    } else if (
      sourcePile.id === "waste" &&
      targetPile.id.startsWith("foundation-")
    ) {
      scoreChange = 10;
    } else if (
      sourcePile.id.startsWith("tableau-") &&
      targetPile.id.startsWith("foundation-")
    ) {
      scoreChange = 10;
    } else if (
      sourcePile.id.startsWith("foundation-") &&
      targetPile.id.startsWith("tableau-")
    ) {
      scoreChange = -15;
    }
    this.state.score = Math.max(0, this.state.score + scoreChange);

    // Execute the move
    for (const movingCard of movingStack) {
      sourcePile.removeCard(movingCard);
      targetPile.addCard(movingCard);

      this.emit("card-moved", {
        cardId: movingCard.id,
        fromPileId: sourcePile.id,
        toPileId: targetPile.id,
      });
    }

    // Auto-flip the new top card of the source pile if it's a tableau pile and face-down
    if (
      sourcePile.id.startsWith("tableau-") &&
      sourcePile.getCards().length > 0
    ) {
      const remainingCards = sourcePile.getCards();
      const topRemaining = remainingCards[remainingCards.length - 1];
      if (!topRemaining.faceUp) {
        topRemaining.faceUp = true;
        this.emit("card-flipped", {
          cardId: topRemaining.id,
          faceUp: true,
        });
        this.state.score += 5; // Flipping tableau card face-up
      }
    }

    // Check win condition
    this.checkWinCondition();

    return true;
  }

  /**
   * Flips a card in place if it is the top card of a Tableau pile.
   *
   * @param cardId The ID of the card to flip.
   * @param faceUp Whether to flip face up or face down.
   */
  public flipCard(cardId: string, faceUp: boolean): void {
    // TODO: Use this or remove it.
    const card = this.getCardById(cardId);
    if (!card) return;

    const sourcePile = this.getPileContainingCard(cardId);
    if (!sourcePile || !sourcePile.id.startsWith("tableau-")) return;

    const cards = sourcePile.getCards();
    const isTop = cards[cards.length - 1] === card;

    if (isTop) {
      const wasFaceUp = card.faceUp;
      card.faceUp = faceUp;
      if (!wasFaceUp && faceUp) {
        this.state.score += 5; // Tableau card flipped face-up
      }
      this.emit("card-flipped", {
        cardId: card.id,
        faceUp,
      });
    }
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

    if (pile.id.startsWith("tableau-")) {
      // Any face-up card in a tableau is interactable
      return card.faceUp;
    }

    if (pile.id === "waste") {
      // Only the top card of the waste pile is interactable
      const cards = pile.getCards();
      return cards.length > 0 && cards[cards.length - 1] === card;
    }

    if (pile.id.startsWith("foundation-")) {
      // Only the top card of a foundation pile is interactable
      const cards = pile.getCards();
      return cards.length > 0 && cards[cards.length - 1] === card;
    }

    if (pile.id === "stock") {
      // Only the top card of the stock pile is interactable
      const cards = pile.getCards();
      return cards.length > 0 && cards[cards.length - 1] === card;
    }

    return false;
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
    if (!pile || pile.id === "stock") {
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
    if (targetPile.id.startsWith("tableau-")) {
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
    if (targetPile.id.startsWith("foundation-")) {
      // You can only move one card at a time to foundations
      if (movingStackSize > 1) {
        return false;
      }
      if (!topTargetCard) {
        // Foundation must start with an Ace
        return card.type === Type.ACE;
      }
      // Must build up in ascending rank of the same suit
      const isSameSuit = card.suite === topTargetCard.suite;
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

  private generateCardId(card: PlayingCard): string {
    const suitNames = {
      [Suit.SPADE]: "spades",
      [Suit.HEART]: "hearts",
      [Suit.DIAMOND]: "diamonds",
      [Suit.CLUB]: "clubs",
    };
    const typeNames = {
      [Type.ACE]: "ace",
      [Type.TWO]: "2",
      [Type.THREE]: "3",
      [Type.FOUR]: "4",
      [Type.FIVE]: "5",
      [Type.SIX]: "6",
      [Type.SEVEN]: "7",
      [Type.EIGHT]: "8",
      [Type.NINE]: "9",
      [Type.TEN]: "10",
      [Type.JACK]: "jack",
      [Type.QUEEN]: "queen",
      [Type.KING]: "king",
    };

    return `card-${suitNames[card.suite]}-${typeNames[card.type]}`;
  }

  private isRed(card: PlayingCard): boolean {
    return card.suite === Suit.HEART || card.suite === Suit.DIAMOND;
  }
}
