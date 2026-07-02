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

    // Total cards is 52
    // Tableau 0 gets 1, Tableau 1 gets 2, ..., Tableau 6 gets 7
    // Total Tableau cards = 1 + 2 + 3 + 4 + 5 + 6 + 7 = 28
    // Remaining in stock = 52 - 28 = 24
    expect(game.stock.getCards().length).toBe(24);
    expect(game.waste.getCards().length).toBe(0);

    for (let i = 0; i < 7; i++) {
      const cards = game.tableaus[i].getCards();
      expect(cards.length).toBe(i + 1);

      // Top-most card is face up
      const topCard = cards[cards.length - 1] as PlayingCard;
      expect(topCard.faceUp).toBe(true);

      // Other cards are face down
      for (let j = 0; j < cards.length - 1; j++) {
        expect(cards[j].faceUp).toBe(false);
      }
    }
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
    game.startNewGame();

    // Empty stock manually (24 cards / 3 per draw = 8 draws)
    const drawsToEmpty = Math.ceil(game.stock.getCards().length / 3);
    for (let i = 0; i < drawsToEmpty; i++) {
      game.drawCardsFromStock();
    }

    expect(game.stock.getCards().length).toBe(0);
    expect(game.waste.getCards().length).toBe(24);

    const recycleCallback = vi.fn();
    game.on("stock-recycled", recycleCallback);

    // Call drawCard when stock is empty to recycle
    game.drawCardsFromStock();

    expect(recycleCallback).toHaveBeenCalledTimes(1);
    expect(game.stock.getCards().length).toBe(24);
    expect(game.waste.getCards().length).toBe(0);

    // All stock cards are face down again
    for (const card of game.stock.getCards()) {
      expect(card.faceUp).toBe(false);
    }
  });

  describe("Card Rules Validation", () => {
    it("validates moving card to empty tableau only if it is a King", () => {
      game.startNewGame();

      // Find an empty tableau column (we will empty tableau 0)
      const tableau0 = game.tableaus[0];
      const card = tableau0.getCards()[0] as PlayingCard;
      tableau0.removeCard(card);
      expect(tableau0.getCards().length).toBe(0);

      // Create a non-King card (e.g. Queen of Hearts)
      const queen = new PlayingCard();
      queen.id = "card-hearts-queen";
      queen.suite = Suit.HEART;
      queen.type = Type.QUEEN;
      queen.faceUp = true;
      game.tableaus[1].addCard(queen); // put Q in tableau 1
      game["allCardsMap"].set(queen.id, queen);

      // Try moving Q to empty tableau 0
      const moved1 = game.moveCards(queen.id, "tableau-0");
      expect(moved1).toBe(false);

      // Create a King of Spades
      const king = new PlayingCard();
      king.id = "card-spades-king";
      king.suite = Suit.SPADE;
      king.type = Type.KING;
      king.faceUp = true;
      game.tableaus[1].addCard(king);
      game["allCardsMap"].set(king.id, king);

      // Try moving K to empty tableau 0
      const moved2 = game.moveCards(king.id, "tableau-0");
      expect(moved2).toBe(true);
      expect(game.tableaus[0].getCards()[0]).toBe(king);
    });

    it("validates moving cards onto tableau in descending rank and alternating color", () => {
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

      // Manually position 8 of Diamonds on tableau 0
      game.tableaus[0].clear();
      game.tableaus[0].addCard(redEight);
      game["allCardsMap"].set(redEight.id, redEight);

      // Manually position cards on tableau 1
      game.tableaus[1].clear();
      game.tableaus[1].addCard(blackSeven);
      game.tableaus[1].addCard(redSeven);
      game["allCardsMap"].set(blackSeven.id, blackSeven);
      game["allCardsMap"].set(redSeven.id, redSeven);

      // Try to move red 7 onto red 8 (invalid color, same color)
      expect(game.moveCards(redSeven.id, "tableau-0")).toBe(false);

      // Try to move black 7 onto red 8 (valid move: alternating color, descending rank)
      expect(game.moveCards(blackSeven.id, "tableau-0")).toBe(true);
      expect(game.tableaus[0].getCards()).toContain(blackSeven);
      expect(game.tableaus[0].getCards()).toContain(redSeven); // moves stack together!
    });

    it("validates foundation rules: must start with Ace, increase sequentially by same suit", () => {
      game.startNewGame();

      const clubTwo = new PlayingCard();
      clubTwo.id = "card-clubs-2";
      clubTwo.suite = Suit.CLUB;
      clubTwo.type = Type.TWO;
      clubTwo.faceUp = true;

      const clubAce = new PlayingCard();
      clubAce.id = "card-clubs-ace";
      clubAce.suite = Suit.CLUB;
      clubAce.type = Type.ACE;
      clubAce.faceUp = true;

      game.tableaus[0].clear();
      game.tableaus[0].addCard(clubTwo);
      game["allCardsMap"].set(clubTwo.id, clubTwo);

      game.tableaus[1].clear();
      game.tableaus[1].addCard(clubAce);
      game["allCardsMap"].set(clubAce.id, clubAce);

      // Cannot move 2 of Clubs to empty foundation 0 (must start with Ace)
      expect(game.moveCards(clubTwo.id, "foundation-0")).toBe(false);

      // Move Ace of Clubs to foundation 0 (valid)
      expect(game.moveCards(clubAce.id, "foundation-0")).toBe(true);

      // Move 2 of Clubs to foundation 0 (valid: same suit, next rank)
      expect(game.moveCards(clubTwo.id, "foundation-0")).toBe(true);
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

    it("returns false in moveCards for invalid card/pile inputs or same source and target", () => {
      game.startNewGame();
      const cardId = game.stock.getCards()[0].id;

      // Invalid card
      expect(game.moveCards("invalid-card-id", "tableau-0")).toBe(false);
      // Invalid target pile
      expect(game.moveCards(cardId, "invalid-pile-id")).toBe(false);
      // Same source and target pile
      const sourcePile = game.getPileContainingCard(cardId);
      expect(sourcePile).toBeDefined();
      expect(game.moveCards(cardId, sourcePile!.id)).toBe(false);
    });

    it("returns false in moveCards if card is face down", () => {
      game.startNewGame();
      // Tableau 1 has 2 cards, the bottom one is face down
      const faceDownCard = game.tableaus[1].getCards()[0];
      expect(faceDownCard.faceUp).toBe(false);
      expect(game.moveCards(faceDownCard.id, "tableau-0")).toBe(false);
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

      const moved = game.moveCards(topCard.id, "tableau-0");
      expect(moved).toBe(true);

      // Tableau 1's remaining bottomCard (Jack of Clubs) should now be face-up
      expect(bottomCard.faceUp).toBe(true);
      expect(flippedCallback).toHaveBeenCalledWith({
        cardId: bottomCard.id,
        faceUp: true,
      });
    });

    it("handles flipCard correctly for various scenarios", () => {
      game.startNewGame();

      // 1. Invalid card ID
      expect(() => game.flipCard("non-existent-card", true)).not.toThrow();

      // 2. Card not in a tableau pile (e.g. in stock)
      const stockCard = game.stock.getCards()[0];
      const initialFaceUp = stockCard.faceUp;
      game.flipCard(stockCard.id, !initialFaceUp);
      expect(stockCard.faceUp).toBe(initialFaceUp); // should not change

      // 3. Card in tableau but NOT the top card
      // Tableau 1 has 2 cards, index 0 is bottom, index 1 is top
      const bottomCard = game.tableaus[1].getCards()[0];
      const topCard = game.tableaus[1].getCards()[1];
      expect(bottomCard.faceUp).toBe(false);
      game.flipCard(bottomCard.id, true);
      expect(bottomCard.faceUp).toBe(false); // should not change

      // 4. Card in tableau and IS the top card
      const flippedCallback = vi.fn();
      game.on("card-flipped", flippedCallback);
      expect(topCard.faceUp).toBe(true);
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
      expect(game.moveCards(card1.id, "foundation-0")).toBe(false);
    });

    it("returns false when trying to move cards to stock or waste as target", () => {
      game.startNewGame();
      const cardId = game.tableaus[0].getCards()[0].id;

      expect(game.moveCards(cardId, "stock")).toBe(false);
      expect(game.moveCards(cardId, "waste")).toBe(false);
    });

    it("emits game-won when all 52 cards are in the foundation piles", () => {
      game.startNewGame();

      // Let's clear all piles first
      game.stock.clear();
      game.waste.clear();
      for (const t of game.tableaus) {
        t.clear();
      }
      for (const f of game.foundations) {
        f.clear();
      }

      // Add dummy cards to foundations to total 52
      for (let i = 0; i < 52; i++) {
        const dummyCard = new PlayingCard();
        dummyCard.id = `dummy-${i}`;
        dummyCard.faceUp = true;
        const fIndex = Math.floor(i / 13);
        game.foundations[fIndex].addCard(dummyCard);
      }

      const wonCallback = vi.fn();
      game.on("game-won", wonCallback);

      game["checkWinCondition"]();

      expect(wonCallback).toHaveBeenCalledTimes(1);
    });
  });
});
