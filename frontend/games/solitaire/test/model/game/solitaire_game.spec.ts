import { SolitaireGame } from "../../../src/model/game/solitaire_game";
import { PlayingCard, Suit, Type } from "../../../src/model/card/playing_card";

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

    // Verify stock and waste sizes
    expect(game.stock.getCards().length).toBe(24);
    expect(game.waste.getCards().length).toBe(0);

    // Verify tableau card counts
    expect(game.tableaus[0].getCards().length).toBe(1);
    expect(game.tableaus[1].getCards().length).toBe(2);
    expect(game.tableaus[2].getCards().length).toBe(3);
    expect(game.tableaus[3].getCards().length).toBe(4);
    expect(game.tableaus[4].getCards().length).toBe(5);
    expect(game.tableaus[5].getCards().length).toBe(6);
    expect(game.tableaus[6].getCards().length).toBe(7);

    // Verify top card of each tableau is face up
    expect(game.tableaus[0].getCards()[0].faceUp).toBe(true);
    expect(game.tableaus[1].getCards()[1].faceUp).toBe(true);
    expect(game.tableaus[2].getCards()[2].faceUp).toBe(true);
    expect(game.tableaus[3].getCards()[3].faceUp).toBe(true);
    expect(game.tableaus[4].getCards()[4].faceUp).toBe(true);
    expect(game.tableaus[5].getCards()[5].faceUp).toBe(true);
    expect(game.tableaus[6].getCards()[6].faceUp).toBe(true);

    // Verify other cards are face down
    expect(game.tableaus[1].getCards()[0].faceUp).toBe(false);
    expect(game.tableaus[2].getCards()[0].faceUp).toBe(false);
    expect(game.tableaus[2].getCards()[1].faceUp).toBe(false);
    expect(game.tableaus[3].getCards()[0].faceUp).toBe(false);
    expect(game.tableaus[3].getCards()[1].faceUp).toBe(false);
    expect(game.tableaus[3].getCards()[2].faceUp).toBe(false);
    expect(game.tableaus[4].getCards()[0].faceUp).toBe(false);
    expect(game.tableaus[4].getCards()[1].faceUp).toBe(false);
    expect(game.tableaus[4].getCards()[2].faceUp).toBe(false);
    expect(game.tableaus[4].getCards()[3].faceUp).toBe(false);
    expect(game.tableaus[5].getCards()[0].faceUp).toBe(false);
    expect(game.tableaus[5].getCards()[1].faceUp).toBe(false);
    expect(game.tableaus[5].getCards()[2].faceUp).toBe(false);
    expect(game.tableaus[5].getCards()[3].faceUp).toBe(false);
    expect(game.tableaus[5].getCards()[4].faceUp).toBe(false);
    expect(game.tableaus[6].getCards()[0].faceUp).toBe(false);
    expect(game.tableaus[6].getCards()[1].faceUp).toBe(false);
    expect(game.tableaus[6].getCards()[2].faceUp).toBe(false);
    expect(game.tableaus[6].getCards()[3].faceUp).toBe(false);
    expect(game.tableaus[6].getCards()[4].faceUp).toBe(false);
    expect(game.tableaus[6].getCards()[5].faceUp).toBe(false);
  });

  it("draws 3 cards from stock to waste and emits events", () => {
    game.startNewGame();

    const initialStockCount = game.stock.getCards().length; // 24
    // Capture the top 3 cards (they will be drawn in order: top first)
    const top1 = game.stock.getCards()[initialStockCount - 1] as PlayingCard;
    const top2 = game.stock.getCards()[initialStockCount - 2] as PlayingCard;
    const top3 = game.stock.getCards()[initialStockCount - 3] as PlayingCard;

    const moveCallback = vi.fn();
    const flipCallback = vi.fn();

    game.on("card-moved", moveCallback);
    game.on("card-flipped", flipCallback);

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

    expect(moveCallback).toHaveBeenCalledTimes(3);
    expect(flipCallback).toHaveBeenCalledTimes(3);
  });

  it("recycles waste back to stock if stock is empty", () => {
    const card1: PlayingCard = {
      id: "c1",
      faceUp: true,
      suite: Suit.CLUB,
      type: Type.ACE,
    };
    const card2: PlayingCard = {
      id: "c2",
      faceUp: true,
      suite: Suit.CLUB,
      type: Type.TWO,
    };
    game.stock.clear();
    game.waste.clear();
    game.waste.addCard(card1);
    game.waste.addCard(card2);
    game["allCardsMap"].set(card1.id, card1);
    game["allCardsMap"].set(card2.id, card2);
    const recycleCallback = vi.fn();
    game.on("stock-recycled", recycleCallback);

    game.drawCardsFromStock();

    expect(recycleCallback).toHaveBeenCalledTimes(1);
    expect(game.stock.getCards().length).toBe(2);
    expect(game.waste.getCards().length).toBe(0);
    expect(game.stock.getCards()[0].faceUp).toBe(false);
    expect(game.stock.getCards()[1].faceUp).toBe(false);
  });

  describe("Card Rules Validation", () => {
    it("does not move a non-King card to an empty tableau pile", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const queen = new PlayingCard();
      queen.id = "card-hearts-queen";
      queen.suite = Suit.HEART;
      queen.type = Type.QUEEN;
      queen.faceUp = true;
      game.tableaus[1].addCard(queen);
      game["allCardsMap"].set(queen.id, queen);

      const moved = game.moveCardToPile(queen.id, "tableau-0");

      expect(moved).toBe(false);
    });

    it("moves a King card to an empty tableau pile", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const king = new PlayingCard();
      king.id = "card-spades-king";
      king.suite = Suit.SPADE;
      king.type = Type.KING;
      king.faceUp = true;
      game.tableaus[1].addCard(king);
      game["allCardsMap"].set(king.id, king);

      const moved = game.moveCardToPile(king.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.tableaus[0].getCards()[0]).toBe(king);
    });

    it("does not move a card onto tableau if color is the same", () => {
      game.startNewGame();
      const redEight = new PlayingCard();
      redEight.id = "card-diamonds-8";
      redEight.suite = Suit.DIAMOND;
      redEight.type = Type.EIGHT;
      redEight.faceUp = true;
      const redSeven = new PlayingCard();
      redSeven.id = "card-hearts-7";
      redSeven.suite = Suit.HEART;
      redSeven.type = Type.SEVEN;
      redSeven.faceUp = true;
      game.tableaus[0].clear();
      game.tableaus[0].addCard(redEight);
      game["allCardsMap"].set(redEight.id, redEight);
      game.tableaus[1].clear();
      game.tableaus[1].addCard(redSeven);
      game["allCardsMap"].set(redSeven.id, redSeven);

      const moved = game.moveCardToPile(redSeven.id, "tableau-0");

      expect(moved).toBe(false);
    });

    it("moves a card onto tableau if rank is descending and color alternates", () => {
      game.startNewGame();
      const redEight = new PlayingCard();
      redEight.id = "card-diamonds-8";
      redEight.suite = Suit.DIAMOND;
      redEight.type = Type.EIGHT;
      redEight.faceUp = true;
      const blackSeven = new PlayingCard();
      blackSeven.id = "card-spades-7";
      blackSeven.suite = Suit.SPADE;
      blackSeven.type = Type.SEVEN;
      blackSeven.faceUp = true;
      const redSeven = new PlayingCard();
      redSeven.id = "card-hearts-7";
      redSeven.suite = Suit.HEART;
      redSeven.type = Type.SEVEN;
      redSeven.faceUp = true;
      game.tableaus[0].clear();
      game.tableaus[0].addCard(redEight);
      game["allCardsMap"].set(redEight.id, redEight);
      game.tableaus[1].clear();
      game.tableaus[1].addCard(blackSeven);
      game.tableaus[1].addCard(redSeven);
      game["allCardsMap"].set(blackSeven.id, blackSeven);
      game["allCardsMap"].set(redSeven.id, redSeven);

      const moved = game.moveCardToPile(blackSeven.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.tableaus[0].getCards()).toContain(blackSeven);
      expect(game.tableaus[0].getCards()).toContain(redSeven);
    });

    it("does not move a non-Ace card to an empty foundation", () => {
      game.startNewGame();
      const clubTwo = new PlayingCard();
      clubTwo.id = "card-clubs-2";
      clubTwo.suite = Suit.CLUB;
      clubTwo.type = Type.TWO;
      clubTwo.faceUp = true;
      game.tableaus[0].clear();
      game.tableaus[0].addCard(clubTwo);
      game["allCardsMap"].set(clubTwo.id, clubTwo);

      const moved = game.moveCardToPile(clubTwo.id, "foundation-0");

      expect(moved).toBe(false);
    });

    it("moves an Ace card to an empty foundation", () => {
      game.startNewGame();
      const clubAce = new PlayingCard();
      clubAce.id = "card-clubs-ace";
      clubAce.suite = Suit.CLUB;
      clubAce.type = Type.ACE;
      clubAce.faceUp = true;
      game.tableaus[1].clear();
      game.tableaus[1].addCard(clubAce);
      game["allCardsMap"].set(clubAce.id, clubAce);

      const moved = game.moveCardToPile(clubAce.id, "foundation-0");

      expect(moved).toBe(true);
    });

    it("moves a card to foundation if rank increases sequentially and suit matches", () => {
      game.startNewGame();
      const clubAce = new PlayingCard();
      clubAce.id = "card-clubs-ace";
      clubAce.suite = Suit.CLUB;
      clubAce.type = Type.ACE;
      clubAce.faceUp = true;
      const clubTwo = new PlayingCard();
      clubTwo.id = "card-clubs-2";
      clubTwo.suite = Suit.CLUB;
      clubTwo.type = Type.TWO;
      clubTwo.faceUp = true;
      game.foundations[0].addCard(clubAce);
      game["allCardsMap"].set(clubAce.id, clubAce);
      game.tableaus[0].clear();
      game.tableaus[0].addCard(clubTwo);
      game["allCardsMap"].set(clubTwo.id, clubTwo);

      const moved = game.moveCardToPile(clubTwo.id, "foundation-0");

      expect(moved).toBe(true);
    });
  });

  describe("Additional Game Logic Coverage", () => {
    it("does nothing when drawCard is called and both stock and waste are empty", () => {
      const emptyGame = new SolitaireGame();
      const recycleCallback = vi.fn();
      const moveCallback = vi.fn();
      emptyGame.on("stock-recycled", recycleCallback);
      emptyGame.on("card-moved", moveCallback);

      emptyGame.drawCardsFromStock();

      expect(recycleCallback).not.toHaveBeenCalled();
      expect(moveCallback).not.toHaveBeenCalled();
    });

    it("returns undefined in findPileContainingCard if card is not in any pile", () => {
      const card = new PlayingCard();
      card.id = "ghost-card";
      game["allCardsMap"].set(card.id, card); // Register in map but do not add to any pile
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

      // Clear tableau 0 and place a King of Spades there
      game.tableaus[0].clear();
      const king = new PlayingCard();
      king.id = "card-spades-king";
      king.suite = Suit.SPADE;
      king.type = Type.KING;
      king.faceUp = true;
      game.tableaus[0].addCard(king);
      game["allCardsMap"].set(king.id, king);

      // Tableau 1 has 2 cards. We force tableau 1 cards to be:
      // bottom: black Jack (face-down)
      // top: red Queen (face-up)
      const bottomCard = new PlayingCard();
      bottomCard.id = "card-clubs-jack";
      bottomCard.suite = Suit.CLUB;
      bottomCard.type = Type.JACK;
      bottomCard.faceUp = false;

      const topCard = new PlayingCard();
      topCard.id = "card-hearts-queen";
      topCard.suite = Suit.HEART;
      topCard.type = Type.QUEEN;
      topCard.faceUp = true;

      game.tableaus[1].clear();
      game.tableaus[1].addCard(bottomCard);
      game.tableaus[1].addCard(topCard);
      game["allCardsMap"].set(bottomCard.id, bottomCard);
      game["allCardsMap"].set(topCard.id, topCard);

      const flippedCallback = vi.fn();
      game.on("card-flipped", flippedCallback);

      const moved = game.moveCardToPile(topCard.id, "tableau-0");
      expect(moved).toBe(true);

      // Tableau 1's remaining bottomCard (Jack of Clubs) should now be face-up
      expect(bottomCard.faceUp).toBe(true);
      expect(flippedCallback).toHaveBeenCalledWith({
        cardId: bottomCard.id,
        faceUp: true,
      });
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

    it("flips the top card of a tableau pile and emits card-flipped event", () => {
      game.startNewGame();
      const topCard = game.tableaus[1].getCards()[1];
      const flippedCallback = vi.fn();
      game.on("card-flipped", flippedCallback);

      game.flipCard(topCard.id, false);

      expect(topCard.faceUp).toBe(false);
      expect(flippedCallback).toHaveBeenCalledWith({
        cardId: topCard.id,
        faceUp: false,
      });
    });

    it("validates foundation rules: cannot move multiple cards at once to foundation", () => {
      game.startNewGame();
      const card1 = new PlayingCard();
      card1.id = "card-1";
      card1.suite = Suit.CLUB;
      card1.type = Type.ACE;
      card1.faceUp = true;

      const card2 = new PlayingCard();
      card2.id = "card-2";
      card2.suite = Suit.CLUB;
      card2.type = Type.TWO;
      card2.faceUp = true;

      game.tableaus[0].clear();
      game.tableaus[0].addCard(card1);
      game.tableaus[0].addCard(card2);
      game["allCardsMap"].set(card1.id, card1);
      game["allCardsMap"].set(card2.id, card2);

      // Attempt to move movingStack size 2 to empty foundation (valid target, but multiple cards)
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
      game.stock.clear();
      game.waste.clear();
      game.tableaus.forEach((t) => t.clear());
      game.foundations.forEach((f) => f.clear());
      Array.from({ length: 52 }).forEach((_, i) => {
        const dummyCard = new PlayingCard();
        dummyCard.id = `dummy-${i}`;
        dummyCard.faceUp = true;
        const fIndex = Math.floor(i / 13);
        game.foundations[fIndex].addCard(dummyCard);
      });
      const wonCallback = vi.fn();
      game.on("game-won", wonCallback);

      game["checkWinCondition"]();

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
      const card1 = new PlayingCard();
      card1.id = "card-spades-2";
      card1.faceUp = true;
      const card2 = new PlayingCard();
      card2.id = "card-hearts-king";
      card2.faceUp = true;
      game.waste.addCard(card1);
      game.waste.addCard(card2);
      game["allCardsMap"].set(card1.id, card1);
      game["allCardsMap"].set(card2.id, card2);

      const interactable = game.isCardInteractable(card2);

      expect(interactable).toBe(true);
    });

    it("handles waste pile: non-top card is not interactable", () => {
      const card1 = new PlayingCard();
      card1.id = "card-spades-2";
      card1.faceUp = true;
      const card2 = new PlayingCard();
      card2.id = "card-hearts-king";
      card2.faceUp = true;
      game.waste.addCard(card1);
      game.waste.addCard(card2);
      game["allCardsMap"].set(card1.id, card1);
      game["allCardsMap"].set(card2.id, card2);

      const interactable = game.isCardInteractable(card1);

      expect(interactable).toBe(false);
    });

    it("handles foundation piles: top card is interactable", () => {
      const card1 = new PlayingCard();
      card1.id = "card-diamonds-ace";
      card1.faceUp = true;
      const card2 = new PlayingCard();
      card2.id = "card-diamonds-2";
      card2.faceUp = true;
      game.foundations[0].addCard(card1);
      game.foundations[0].addCard(card2);
      game["allCardsMap"].set(card1.id, card1);
      game["allCardsMap"].set(card2.id, card2);

      const interactable = game.isCardInteractable(card2);

      expect(interactable).toBe(true);
    });

    it("handles foundation piles: non-top card is not interactable", () => {
      const card1 = new PlayingCard();
      card1.id = "card-diamonds-ace";
      card1.faceUp = true;
      const card2 = new PlayingCard();
      card2.id = "card-diamonds-2";
      card2.faceUp = true;
      game.foundations[0].addCard(card1);
      game.foundations[0].addCard(card2);
      game["allCardsMap"].set(card1.id, card1);
      game["allCardsMap"].set(card2.id, card2);

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
      const card = new PlayingCard();
      card.id = "ghost-card";
      game["allCardsMap"].set(card.id, card);
      const mockPile = { id: "unknown-pile-id", getCards: () => [card] };
      vi.spyOn(game, "getPileContainingCard").mockReturnValue(mockPile as any);

      const interactable = game.isCardInteractable(card);

      expect(interactable).toBe(false);
    });
  });
});
