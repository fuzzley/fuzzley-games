import { vi } from "vitest";
import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PlayingCard, Suit, Type } from "@/game/model/card/playing_card";
import { CardPile } from "@/game/model/card/card_pile";

function setupAlmostWonState(game: SolitaireGame): void {
  const suitNames = ["spades", "hearts", "diamonds", "clubs"];
  const typeNames = [
    "ace",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "jack",
    "queen",
    "king",
  ];

  game.stock.clear();
  game.waste.clear();
  game.tableaus.forEach((t) => t.clear());
  game.foundations.forEach((f) => f.clear());

  for (let sIndex = 0; sIndex < 4; sIndex++) {
    const suitName = suitNames[sIndex];
    const targetFoundation = game.foundations[sIndex];
    const maxTypeIndex = sIndex === 3 ? 12 : 13;
    for (let tIndex = 0; tIndex < maxTypeIndex; tIndex++) {
      const cardId = `card-${suitName}-${typeNames[tIndex]}`;
      const card = game.getCardById(cardId)!;
      card.faceUp = true;
      targetFoundation.addCard(card);
    }
  }
}

describe("SolitaireGame", () => {
  let game: SolitaireGame;

  beforeEach(() => {
    game = new SolitaireGame();
  });

  it("initializes layout piles correctly on constructor", () => {
    expect(game.stock.id).toBe("stock");
    expect(game.waste.id).toBe("waste");
    expect(game.foundations.length).toBe(4);
    expect(game.tableaus.length).toBe(7);
  });

  it("deals the correct number of cards to piles on startNewGame", () => {
    game.startNewGame();

    expect(game.stock.getCards().length).toBe(24);
    expect(game.waste.getCards().length).toBe(0);
    expect(game.tableaus.length).toBe(7);

    // Verify stock setup
    for (let card of game.stock.getCards()) {
      expect(card.faceUp).toBe(false);
    }

    // Verify tableaus setup
    for (let i = 0; i < 7; i++) {
      expect(game.tableaus[i].getCards().length).toBe(i + 1);

      for (let j = 0; j < i; j++) {
        expect(game.tableaus[i].getCards()[j].faceUp).toBe(false);
      }
      // Last card in pile should always be face up.
      expect(game.tableaus[i].getCards()[i].faceUp).toBe(true);
    }
  });

  it("draws 3 cards from stock to waste and flips them face up", () => {
    game.startNewGame();
    const initialStockCount = game.stock.getCards().length; // 24
    // Capture the top 3 cards (they will be drawn in order: top first)
    const top1 = game.stock.getCards()[initialStockCount - 1] as PlayingCard;
    const top2 = game.stock.getCards()[initialStockCount - 2] as PlayingCard;
    const top3 = game.stock.getCards()[initialStockCount - 3] as PlayingCard;

    game.drawCardsFromStock();

    expect(game.stock.getCards().length).toBe(21);
    expect(game.waste.getCards().length).toBe(3);
    // Cards are added to waste in draw order: top1 first, top3 last (on top)
    expect(game.waste.getCards()[0]).toBe(top1);
    expect(game.waste.getCards()[1]).toBe(top2);
    expect(game.waste.getCards()[2]).toBe(top3);
    expect(top1.faceUp).toBe(true);
    expect(top2.faceUp).toBe(true);
    expect(top3.faceUp).toBe(true);
  });

  it("recycles waste back to stock if stock is empty", () => {
    game.startNewGame();
    const card1 = game.getCardById("card-clubs-ace")!;
    const card2 = game.getCardById("card-clubs-2")!;
    game.stock.clear();
    game.waste.clear();
    game.tableaus.forEach((t) => t.clear());
    game.foundations.forEach((f) => f.clear());

    card1.faceUp = true;
    card2.faceUp = true;
    game.waste.addCard(card1);
    game.waste.addCard(card2);

    game.drawCardsFromStock();

    expect(game.stock.getCards().length).toBe(2);
    expect(game.waste.getCards().length).toBe(0);
    expect(game.stock.getCards()[0].faceUp).toBe(false);
    expect(game.stock.getCards()[1].faceUp).toBe(false);
  });

  describe("Card Rules Validation", () => {
    it("does not move a non-King card to an empty tableau pile", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const queen = game.getCardById("card-hearts-queen")!;
      game.getPileContainingCard(queen.id)?.removeCard(queen);
      queen.faceUp = true;
      game.tableaus[1].clear();
      game.tableaus[1].addCard(queen);

      const moved = game.moveCardToPile(queen.id, "tableau-0");

      expect(moved).toBe(false);
    });

    it("moves a King card to an empty tableau pile", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const king = game.getCardById("card-spades-king")!;
      game.getPileContainingCard(king.id)?.removeCard(king);
      king.faceUp = true;
      game.tableaus[1].clear();
      game.tableaus[1].addCard(king);

      const moved = game.moveCardToPile(king.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.tableaus[0].getCards()[0]).toBe(king);
    });

    it("does not move a card onto tableau if color is the same", () => {
      game.startNewGame();
      const redEight = game.getCardById("card-diamonds-8")!;
      const redSeven = game.getCardById("card-hearts-7")!;
      game.getPileContainingCard(redEight.id)?.removeCard(redEight);
      game.getPileContainingCard(redSeven.id)?.removeCard(redSeven);
      redEight.faceUp = true;
      redSeven.faceUp = true;
      game.tableaus[0].clear();
      game.tableaus[0].addCard(redEight);
      game.tableaus[1].clear();
      game.tableaus[1].addCard(redSeven);

      const moved = game.moveCardToPile(redSeven.id, "tableau-0");

      expect(moved).toBe(false);
    });

    it("moves a card onto tableau if rank is descending and color alternates", () => {
      game.startNewGame();
      const redEight = game.getCardById("card-diamonds-8")!;
      const blackSeven = game.getCardById("card-spades-7")!;
      const redSeven = game.getCardById("card-hearts-7")!;
      game.getPileContainingCard(redEight.id)?.removeCard(redEight);
      game.getPileContainingCard(blackSeven.id)?.removeCard(blackSeven);
      game.getPileContainingCard(redSeven.id)?.removeCard(redSeven);
      redEight.faceUp = true;
      blackSeven.faceUp = true;
      redSeven.faceUp = true;
      game.tableaus[0].clear();
      game.tableaus[0].addCard(redEight);
      game.tableaus[1].clear();
      game.tableaus[1].addCard(blackSeven);
      game.tableaus[1].addCard(redSeven);

      const moved = game.moveCardToPile(blackSeven.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.tableaus[0].getCards()).toContain(blackSeven);
      expect(game.tableaus[0].getCards()).toContain(redSeven);
    });

    it("does not move a non-Ace card to an empty foundation", () => {
      game.startNewGame();
      const clubTwo = game.getCardById("card-clubs-2")!;
      game.getPileContainingCard(clubTwo.id)?.removeCard(clubTwo);
      clubTwo.faceUp = true;
      game.tableaus[0].clear();
      game.tableaus[0].addCard(clubTwo);

      const moved = game.moveCardToPile(clubTwo.id, "foundation-0");

      expect(moved).toBe(false);
    });

    it("moves an Ace card to an empty foundation", () => {
      game.startNewGame();
      const clubAce = game.getCardById("card-clubs-ace")!;
      game.getPileContainingCard(clubAce.id)?.removeCard(clubAce);
      clubAce.faceUp = true;
      game.tableaus[1].clear();
      game.tableaus[1].addCard(clubAce);

      const moved = game.moveCardToPile(clubAce.id, "foundation-0");

      expect(moved).toBe(true);
    });

    it("moves a card to foundation if rank increases sequentially and suit matches", () => {
      game.startNewGame();
      const clubAce = game.getCardById("card-clubs-ace")!;
      const clubTwo = game.getCardById("card-clubs-2")!;
      game.getPileContainingCard(clubAce.id)?.removeCard(clubAce);
      game.getPileContainingCard(clubTwo.id)?.removeCard(clubTwo);
      clubAce.faceUp = true;
      clubTwo.faceUp = true;
      game.foundations[0].clear();
      game.foundations[0].addCard(clubAce);
      game.tableaus[0].clear();
      game.tableaus[0].addCard(clubTwo);

      const moved = game.moveCardToPile(clubTwo.id, "foundation-0");

      expect(moved).toBe(true);
    });
  });

  describe("Additional Game Logic Coverage", () => {
    it("does nothing when drawCard is called and both stock and waste are empty", () => {
      const emptyGame = new SolitaireGame();

      emptyGame.drawCardsFromStock();

      expect(emptyGame.stock.getCards().length).toBe(0);
      expect(emptyGame.waste.getCards().length).toBe(0);
    });

    it("returns undefined in findPileContainingCard if card is not in any pile", () => {
      game.startNewGame();
      const card = game.getCardById("card-clubs-ace")!;
      game.getPileContainingCard(card.id)?.removeCard(card);
      expect(game.getPileContainingCard(card.id)).toBeUndefined();
    });

    it("returns false when trying to move an invalid card ID", () => {
      game.startNewGame();

      const moved = game.moveCardToPile("invalid-card-id", "tableau-0");

      expect(moved).toBe(false);
    });

    it("returns false when trying to move to an invalid target pile ID", () => {
      game.startNewGame();
      const cardId = game.stock.getCards()[0].id;

      const moved = game.moveCardToPile(cardId, "invalid-pile-id");

      expect(moved).toBe(false);
    });

    it("returns false when trying to move a card to its current pile", () => {
      game.startNewGame();
      const cardId = game.stock.getCards()[0].id;
      const sourcePile = game.getPileContainingCard(cardId);

      const moved = game.moveCardToPile(cardId, sourcePile!.id);

      expect(moved).toBe(false);
    });

    it("returns false in moveCard if card is face down", () => {
      game.startNewGame();
      // Tableau 1 has 2 cards, the bottom one is face down
      const faceDownCard = game.tableaus[1].getCards()[0];
      expect(faceDownCard.faceUp).toBe(false);
      expect(game.moveCardToPile(faceDownCard.id, "tableau-0")).toBe(false);
    });

    it("auto-flips the new top card of the tableau pile if it is face-down after a move", () => {
      game.startNewGame();

      const king = game.getCardById("card-spades-king")!;
      const bottomCard = game.getCardById("card-clubs-jack")!;
      const topCard = game.getCardById("card-hearts-queen")!;

      game.getPileContainingCard(king.id)?.removeCard(king);
      game.getPileContainingCard(bottomCard.id)?.removeCard(bottomCard);
      game.getPileContainingCard(topCard.id)?.removeCard(topCard);

      king.faceUp = true;
      bottomCard.faceUp = false;
      topCard.faceUp = true;

      game.tableaus[0].clear();
      game.tableaus[0].addCard(king);

      game.tableaus[1].clear();
      game.tableaus[1].addCard(bottomCard);
      game.tableaus[1].addCard(topCard);

      const moved = game.moveCardToPile(topCard.id, "tableau-0");
      expect(moved).toBe(true);

      expect(bottomCard.faceUp).toBe(true);
    });

    it("does not crash when flipping a non-existent card ID", () => {
      expect(() => game.flipCard("non-existent-card", true)).not.toThrow();
    });

    it("does not flip card if it is not in a tableau pile", () => {
      game.startNewGame();
      const stockCard = game.stock.getCards()[0];
      const initialFaceUp = stockCard.faceUp;

      game.flipCard(stockCard.id, !initialFaceUp);

      expect(stockCard.faceUp).toBe(initialFaceUp);
    });

    it("does not flip card if it is in a tableau pile but not the top card", () => {
      game.startNewGame();
      const bottomCard = game.tableaus[1].getCards()[0];

      game.flipCard(bottomCard.id, true);

      expect(bottomCard.faceUp).toBe(false);
    });

    it("flips the top card of a tableau pile", () => {
      game.startNewGame();
      const topCard = game.tableaus[1].getCards()[1];

      game.flipCard(topCard.id, false);

      expect(topCard.faceUp).toBe(false);
    });

    it("validates foundation rules: cannot move multiple cards at once to foundation", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-clubs-ace")!;
      const card2 = game.getCardById("card-clubs-2")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      card1.faceUp = true;
      card2.faceUp = true;

      game.tableaus[0].clear();
      game.tableaus[0].addCard(card1);
      game.tableaus[0].addCard(card2);

      expect(game.moveCardToPile(card1.id, "foundation-0")).toBe(false);
    });

    it("returns false when trying to move cards to stock or waste as target", () => {
      game.startNewGame();
      const cardId = game.tableaus[0].getCards()[0].id;

      expect(game.moveCardToPile(cardId, "stock")).toBe(false);
      expect(game.moveCardToPile(cardId, "waste")).toBe(false);
    });

    it("emits game-won when all 52 cards are in the foundation piles", () => {
      game.startNewGame();
      setupAlmostWonState(game);

      const kingOfClubs = game.getCardById("card-clubs-king")!;
      kingOfClubs.faceUp = true;
      game.tableaus[0].addCard(kingOfClubs);

      const wonCallback = vi.fn();
      game.on("game-won", wonCallback);

      const moved = game.moveCardToPile(kingOfClubs.id, "foundation-3");

      expect(moved).toBe(true);
      expect(wonCallback).toHaveBeenCalledTimes(1);
    });

    it("returns false in moveCard if card is not in the source pile returned by getPileContainingCard (cardIndex === -1)", () => {
      game.startNewGame();
      const card = game.stock.getCards()[0];
      card.faceUp = true;
      // Stub getPileContainingCard to return tableau-0, which does not contain the stock card
      vi.spyOn(game, "getPileContainingCard").mockReturnValue(game.tableaus[0]);
      expect(game.moveCardToPile(card.id, "tableau-1")).toBe(false);
    });

    it("does not emit card-flipped if the remaining top card is already face-up after a move", () => {
      game.startNewGame();

      const targetKing = game.getCardById("card-clubs-king")!;
      const remainingKing = game.getCardById("card-spades-king")!;
      const movingQueen = game.getCardById("card-hearts-queen")!;

      game.getPileContainingCard(targetKing.id)?.removeCard(targetKing);
      game.getPileContainingCard(remainingKing.id)?.removeCard(remainingKing);
      game.getPileContainingCard(movingQueen.id)?.removeCard(movingQueen);

      targetKing.faceUp = true;
      remainingKing.faceUp = true;
      movingQueen.faceUp = true;

      game.tableaus[0].clear();
      game.tableaus[0].addCard(targetKing);

      game.tableaus[1].clear();
      game.tableaus[1].addCard(remainingKing);
      game.tableaus[1].addCard(movingQueen);

      const flippedSpy = vi.fn();
      game.on("card-flipped", flippedSpy);

      const moved = game.moveCardToPile(movingQueen.id, "tableau-0");
      expect(moved).toBe(true);
      expect(flippedSpy).not.toHaveBeenCalled();
    });

    it("handles empty or insufficient deck gracefully during dealTableaus and populateStock", () => {
      // Return an array containing undefined values to test both dealTableaus and populateStock 'if (card)' false conditions
      const mockDeck = Array(35).fill(undefined) as unknown as PlayingCard[];
      vi.spyOn(
        game as unknown as { createAndShuffleDeck: () => PlayingCard[] },
        "createAndShuffleDeck",
      ).mockReturnValue(mockDeck);

      expect(() => game.startNewGame()).not.toThrow();
      expect(game.stock.getCards().length).toBe(0);
      game.tableaus.forEach((t) => {
        expect(t.getCards().length).toBe(0);
      });
    });
  });

  describe("isCardInteractable", () => {
    it("handles tableau piles: face-up card is interactable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = true;

      const interactable = game.isCardInteractable(card);

      expect(interactable).toBe(true);
    });

    it("handles tableau piles: face-down card is not interactable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = false;

      const interactable = game.isCardInteractable(card);

      expect(interactable).toBe(false);
    });

    it("handles waste pile: top card is interactable", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-spades-2")!;
      const card2 = game.getCardById("card-hearts-king")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      game.waste.clear();
      card1.faceUp = true;
      card2.faceUp = true;
      game.waste.addCard(card1);
      game.waste.addCard(card2);

      const interactable = game.isCardInteractable(card2);

      expect(interactable).toBe(true);
    });

    it("handles waste pile: non-top card is not interactable", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-spades-2")!;
      const card2 = game.getCardById("card-hearts-king")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      game.waste.clear();
      card1.faceUp = true;
      card2.faceUp = true;
      game.waste.addCard(card1);
      game.waste.addCard(card2);

      const interactable = game.isCardInteractable(card1);

      expect(interactable).toBe(false);
    });

    it("handles foundation piles: top card is interactable", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-diamonds-ace")!;
      const card2 = game.getCardById("card-diamonds-2")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      game.foundations[0].clear();
      card1.faceUp = true;
      card2.faceUp = true;
      game.foundations[0].addCard(card1);
      game.foundations[0].addCard(card2);

      const interactable = game.isCardInteractable(card2);

      expect(interactable).toBe(true);
    });

    it("handles foundation piles: non-top card is not interactable", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-diamonds-ace")!;
      const card2 = game.getCardById("card-diamonds-2")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      game.foundations[0].clear();
      card1.faceUp = true;
      card2.faceUp = true;
      game.foundations[0].addCard(card1);
      game.foundations[0].addCard(card2);

      const interactable = game.isCardInteractable(card1);

      expect(interactable).toBe(false);
    });

    it("handles stock pile: top card is interactable", () => {
      game.startNewGame();
      const cards = game.stock.getCards();
      const topCard = cards[cards.length - 1];

      const interactable = game.isCardInteractable(topCard);

      expect(interactable).toBe(true);
    });

    it("handles stock pile: non-top card is not interactable", () => {
      game.startNewGame();
      const cards = game.stock.getCards();
      const nonTopCard = cards[0];

      const interactable = game.isCardInteractable(nonTopCard);

      expect(interactable).toBe(false);
    });

    it("returns false if card is not in any pile", () => {
      const card = new PlayingCard();
      card.id = "ghost-card";

      const interactable = game.isCardInteractable(card);

      expect(interactable).toBe(false);
    });

    it("returns false if card is in an unknown pile type", () => {
      game.startNewGame();
      const card = game.getCardById("card-clubs-ace")!;
      const mockPile = {
        id: "unknown-pile-id",
        getCards: () => [card],
      } as unknown as CardPile;
      vi.spyOn(game, "getPileContainingCard").mockReturnValue(mockPile);

      const interactable = game.isCardInteractable(card);

      expect(interactable).toBe(false);
    });
  });

  describe("isCardDraggable", () => {
    it("handles stock pile: top card is not draggable", () => {
      game.startNewGame();
      const cards = game.stock.getCards();
      const topCard = cards[cards.length - 1];

      const draggable = game.isCardDraggable(topCard);

      expect(draggable).toBe(false);
    });

    it("handles tableau piles: face-up card is draggable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = true;

      const draggable = game.isCardDraggable(card);

      expect(draggable).toBe(true);
    });

    it("handles tableau piles: face-down card is not draggable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = false;

      const draggable = game.isCardDraggable(card);

      expect(draggable).toBe(false);
    });

    it("handles waste pile: top card is draggable", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-spades-2")!;
      const card2 = game.getCardById("card-hearts-king")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      game.waste.clear();
      card1.faceUp = true;
      card2.faceUp = true;
      game.waste.addCard(card1);
      game.waste.addCard(card2);

      const draggable = game.isCardDraggable(card2);

      expect(draggable).toBe(true);
    });

    it("handles foundation piles: top card is draggable", () => {
      game.startNewGame();
      const card1 = game.getCardById("card-diamonds-ace")!;
      const card2 = game.getCardById("card-diamonds-2")!;
      game.getPileContainingCard(card1.id)?.removeCard(card1);
      game.getPileContainingCard(card2.id)?.removeCard(card2);
      game.foundations[0].clear();
      card1.faceUp = true;
      card2.faceUp = true;
      game.foundations[0].addCard(card1);
      game.foundations[0].addCard(card2);

      const draggable = game.isCardDraggable(card2);

      expect(draggable).toBe(true);
    });

    it("returns false if card is not in any pile", () => {
      const card = new PlayingCard();
      card.id = "ghost-card";

      const draggable = game.isCardDraggable(card);

      expect(draggable).toBe(false);
    });
  });

  describe("Scoring, Moves, and Game Options", () => {
    it("starts a new game with zeroed score, moves, and default options", () => {
      game.startNewGame();
      expect(game.score).toBe(0);
      expect(game.moves).toBe(0);
      expect(game.drawCount).toBe(3);
      expect(game.cardBackStyle).toBe("card-back-blue");
    });

    it("allows updating options via setters and emits state-changed", () => {
      const stateListener = vi.fn();
      const cardBackListener = vi.fn();
      game.on("state-changed", stateListener);
      game.on("card-back-changed", cardBackListener);

      game.setDrawCount(1);
      expect(game.drawCount).toBe(1);
      expect(stateListener).toHaveBeenCalledTimes(1);

      game.setCardBackStyle("card-back-red");
      expect(game.cardBackStyle).toBe("card-back-red");
      expect(cardBackListener).toHaveBeenCalledWith({
        cardBackStyle: "card-back-red",
      });
      expect(stateListener).toHaveBeenCalledTimes(2);
    });

    it("increments moves and scores +5 when moving waste to tableau", () => {
      game.startNewGame();
      const card = game.getCardById("card-spades-jack")!;
      const tableauCard = game.tableaus[0].getCards()[0];

      game.getPileContainingCard(card.id)?.removeCard(card);
      game.waste.clear();
      card.faceUp = true;
      card.type = Type.QUEEN;
      card.suite = Suit.HEART;
      game.waste.addCard(card);

      tableauCard.faceUp = true;
      tableauCard.type = Type.KING;
      tableauCard.suite = Suit.SPADE;

      const moved = game.moveCardToPile(card.id, game.tableaus[0].id);
      expect(moved).toBe(true);
      expect(game.score).toBe(5);
      expect(game.moves).toBe(1);
    });

    it("scores +10 when moving waste to foundation", () => {
      game.startNewGame();
      const card = game.getCardById("card-spades-ace")!;
      game.getPileContainingCard(card.id)?.removeCard(card);
      game.waste.clear();
      card.faceUp = true;
      card.type = Type.ACE;
      game.waste.addCard(card);

      const moved = game.moveCardToPile(card.id, game.foundations[0].id);
      expect(moved).toBe(true);
      expect(game.score).toBe(10);
      expect(game.moves).toBe(1);
    });

    it("scores +10 when moving tableau to foundation", () => {
      game.startNewGame();
      const card = game.getCardById("card-hearts-ace")!;
      game.getPileContainingCard(card.id)?.removeCard(card);
      game.tableaus[0].clear();
      card.faceUp = true;
      card.type = Type.ACE;
      game.tableaus[0].addCard(card);

      const moved = game.moveCardToPile(card.id, game.foundations[1].id);
      expect(moved).toBe(true);
      expect(game.score).toBe(10);
    });

    it("scores -15 when moving foundation to tableau", () => {
      game.startNewGame();

      const ace = game.getCardById("card-clubs-ace")!;
      const two = game.getCardById("card-diamonds-2")!;

      game.getPileContainingCard(ace.id)?.removeCard(ace);
      game.getPileContainingCard(two.id)?.removeCard(two);

      game.foundations[0].clear();
      ace.faceUp = true;
      ace.type = Type.ACE;
      ace.suite = Suit.CLUB;
      game.foundations[0].addCard(ace);

      game.tableaus[0].clear();
      two.faceUp = true;
      two.type = Type.TWO;
      two.suite = Suit.DIAMOND;
      game.tableaus[0].addCard(two);

      game.score = 20;

      const moved = game.moveCardToPile(ace.id, game.tableaus[0].id);
      expect(moved).toBe(true);
      expect(game.score).toBe(5);
    });

    it("scores +5 when flipping a tableau card face up via moveCardToPile auto-flip", () => {
      game.startNewGame();

      game.tableaus[0].clear();
      const cardDown = game.getCardById("card-spades-10")!;
      game.getPileContainingCard(cardDown.id)?.removeCard(cardDown);
      cardDown.faceUp = false;
      game.tableaus[0].addCard(cardDown);

      const cardUp = game.getCardById("card-hearts-ace")!;
      game.getPileContainingCard(cardUp.id)?.removeCard(cardUp);
      cardUp.faceUp = true;
      cardUp.type = Type.ACE;
      game.tableaus[0].addCard(cardUp);

      game.foundations[0].clear();
      const moved = game.moveCardToPile(cardUp.id, game.foundations[0].id);
      expect(moved).toBe(true);
      expect(cardDown.faceUp).toBe(true);
      expect(game.score).toBe(15);
    });

    it("recycles waste and applies proper score penalty for Draw 1 vs Draw 3", () => {
      game.startNewGame();
      game.setDrawCount(1);

      game.stock.clear();
      const card = game.getCardById("card-clubs-king")!;
      game.waste.clear();
      game.waste.addCard(card);

      game.score = 200;

      game.drawCardsFromStock();
      expect(game.score).toBe(200);

      game.stock.clear();
      game.waste.addCard(card);

      game.drawCardsFromStock();
      expect(game.score).toBe(100);

      game.setDrawCount(3);
      game.score = 200;
      game.startNewGame();
      game.setDrawCount(3);
      game.score = 200;

      for (let i = 0; i < 3; i++) {
        game.stock.clear();
        game.waste.addCard(card);
        game.drawCardsFromStock();
      }
      expect(game.score).toBe(200);

      game.stock.clear();
      game.waste.addCard(card);
      game.drawCardsFromStock();
      expect(game.score).toBe(180);
    });
  });
});
