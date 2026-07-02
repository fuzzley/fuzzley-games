import { EventEmitter } from "../common/event_emitter";
import { GameEvents } from "./game_events";
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
  public readonly stock = new CardPile("stock");
  /** The face-up waste pile containing drawn cards. */
  public readonly waste = new CardPile("waste");
  /** The four suit foundation piles (Hearts, Diamonds, Clubs, Spades). */
  public readonly foundations: CardPile[] = [];
  /** The seven tableau piles arranged on the board. */
  public readonly tableaus: CardPile[] = [];

  private readonly allCardsMap = new Map<string, PlayingCard>();

  /** Initializes the piles. */
  constructor() {
    super();

    for (let i = 0; i < 4; i++) {
      this.foundations.push(new CardPile(`foundation-${i}`));
    }
    for (let i = 0; i < 7; i++) {
      this.tableaus.push(new CardPile(`tableau-${i}`));
    }
  }

  /**
   * Fetches a pile by its unique string identifier.
   *
   * @param pileId The ID of the pile to find.
   * @returns The matching CardPile or undefined.
   */
  public getPileById(pileId: string): CardPile | undefined {
    if (pileId === "stock") return this.stock;
    if (pileId === "waste") return this.waste;
    if (pileId.startsWith("foundation-")) {
      const idx = parseInt(pileId.split("-")[1], 10);
      return this.foundations[idx];
    }
    if (pileId.startsWith("tableau-")) {
      const idx = parseInt(pileId.split("-")[1], 10);
      return this.tableaus[idx];
    }
    return undefined;
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
  public getPileContainingCard(cardId: string): CardPile | undefined {
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
    // 1. Reset all card piles
    this.stock.clear();
    this.waste.clear();
    this.allCardsMap.clear();
    for (const foundation of this.foundations) {
      foundation.clear();
    }
    for (const tableau of this.tableaus) {
      tableau.clear();
    }

    // 2. Generate and shuffle deck
    const tempDeck = new Deck();
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

    const deckCards = [...tempDeck.getCards()] as PlayingCard[];

    // 3. Deal to Tableaus: column i (0 to 6) gets i+1 cards
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deckCards.pop();
        if (card) {
          if (row === col) {
            card.faceUp = true;
          }
          this.tableaus[col].addCard(card);
        }
      }
    }

    // 4. Place remaining cards face-down into Stock
    while (deckCards.length > 0) {
      const card = deckCards.pop();
      if (card) {
        card.faceUp = false;
        this.stock.addCard(card);
      }
    }
  }

  /**
   * Draws a card from the stock pile to the waste pile.
   * If stock is empty, recycles waste back into stock.
   */
  public drawCard(): void {
    const stockCards = this.stock.getCards();
    if (stockCards.length > 0) {
      // Draw top card from stock (last item in array)
      const topCard = stockCards[stockCards.length - 1] as PlayingCard;
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
    } else {
      // Recycle Waste into Stock
      const wasteCards = [...this.waste.getCards()] as PlayingCard[];
      if (wasteCards.length === 0) return;

      // Clear waste pile
      this.waste.clear();

      // Put cards back to stock in reverse order, face-down
      for (let i = wasteCards.length - 1; i >= 0; i--) {
        const card = wasteCards[i];
        card.faceUp = false;
        this.stock.addCard(card);
      }

      this.emit("stock-recycled", undefined);

      // Fire card-moved events for each recycled card
      for (const card of this.stock.getCards()) {
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
  public moveCards(cardId: string, targetPileId: string): boolean {
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
    const movingStack = sourceCards.slice(cardIndex) as PlayingCard[];

    // Validate the move
    const isValid = this.validateMove(card, targetPile, movingStack.length);
    if (!isValid) {
      return false;
    }

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
      const topRemaining = remainingCards[
        remainingCards.length - 1
      ] as PlayingCard;
      if (!topRemaining.faceUp) {
        topRemaining.faceUp = true;
        this.emit("card-flipped", {
          cardId: topRemaining.id,
          faceUp: true,
        });
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
    const card = this.getCardById(cardId);
    if (!card) return;

    const sourcePile = this.getPileContainingCard(cardId);
    if (!sourcePile || !sourcePile.id.startsWith("tableau-")) return;

    const cards = sourcePile.getCards();
    const isTop = cards[cards.length - 1] === card;

    if (isTop) {
      card.faceUp = faceUp;
      this.emit("card-flipped", {
        cardId: card.id,
        faceUp,
      });
    }
  }

  private validateMove(
    card: PlayingCard,
    targetPile: CardPile,
    movingStackSize: number,
  ): boolean {
    const targetCards = targetPile.getCards();
    const topTargetCard =
      targetCards.length > 0
        ? (targetCards[targetCards.length - 1] as PlayingCard)
        : null;

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
      [Type.TWO]: "two",
      [Type.THREE]: "three",
      [Type.FOUR]: "four",
      [Type.FIVE]: "five",
      [Type.SIX]: "six",
      [Type.SEVEN]: "seven",
      [Type.EIGHT]: "eight",
      [Type.NINE]: "nine",
      [Type.TEN]: "ten",
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
