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

  it("draws a card from stock to waste and emits events", () => {
    game.startNewGame();

    const initialStockCount = game.stock.getCards().length; // 24
    const topStockCard = game.stock.getCards()[initialStockCount - 1] as PlayingCard;

    const moveCallback = vi.fn();
    const flipCallback = vi.fn();

    game.on("card-moved", moveCallback);
    game.on("card-flipped", flipCallback);

    game.drawCard();

    expect(game.stock.getCards().length).toBe(23);
    expect(game.waste.getCards().length).toBe(1);
    expect(game.waste.getCards()[0]).toBe(topStockCard);
    expect(topStockCard.faceUp).toBe(true);

    expect(moveCallback).toHaveBeenCalledWith({
      cardId: topStockCard.id,
      fromPileId: "stock",
      toPileId: "waste",
    });
    expect(flipCallback).toHaveBeenCalledWith({
      cardId: topStockCard.id,
      faceUp: true,
    });
  });

  it("recycles waste back to stock if stock is empty", () => {
    game.startNewGame();

    // Empty stock manually
    const stockCount = game.stock.getCards().length;
    for (let i = 0; i < stockCount; i++) {
      game.drawCard();
    }

    expect(game.stock.getCards().length).toBe(0);
    expect(game.waste.getCards().length).toBe(24);

    const recycleCallback = vi.fn();
    game.on("stock-recycled", recycleCallback);

    // Call drawCard when stock is empty to recycle
    game.drawCard();

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
      redEight.id = "card-diamonds-eight";
      redEight.suite = Suit.DIAMOND;
      redEight.type = Type.EIGHT;
      redEight.faceUp = true;

      const blackSeven = new PlayingCard();
      blackSeven.id = "card-spades-seven";
      blackSeven.suite = Suit.SPADE;
      blackSeven.type = Type.SEVEN;
      blackSeven.faceUp = true;

      const redSeven = new PlayingCard();
      redSeven.id = "card-hearts-seven";
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
      clubTwo.id = "card-clubs-two";
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
});
