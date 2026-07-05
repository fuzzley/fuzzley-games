import { SolitaireGame } from "@/game/model/game/solitaire_game";
import { PileType } from "@/game/model/card/card_pile";
import { makePlayingCard } from "@test/support/card_builder";
import {
  almostWon,
  CLUB_KING_ID,
  forceWasteRecycle,
  relocate,
} from "@test/support/game_scenarios";

describe("SolitaireGame", () => {
  let game: SolitaireGame;

  beforeEach(() => {
    game = new SolitaireGame();
  });

  describe("construction", () => {
    it("creates the stock and waste piles", () => {
      expect(game.stock.id).toBe("stock");
      expect(game.waste.id).toBe("waste");
    });

    it("creates four foundation piles and seven tableau piles", () => {
      expect(game.foundations.length).toBe(4);
      expect(game.tableaus.length).toBe(7);
    });

    it("assigns each pile its Klondike role type", () => {
      expect(game.stock.type).toBe(PileType.STOCK);
      expect(game.waste.type).toBe(PileType.WASTE);
      expect(
        game.foundations.every((p) => p.type === PileType.FOUNDATION),
      ).toBe(true);
      expect(game.tableaus.every((p) => p.type === PileType.TABLEAU)).toBe(
        true,
      );
    });
  });

  describe("startNewGame", () => {
    it("populates the stock with 24 cards", () => {
      game.startNewGame();

      expect(game.stock.getCards().length).toBe(24);
    });

    it("deals every stock card face down", () => {
      game.startNewGame();

      const allFaceDown = game.stock.getCards().every((card) => !card.faceUp);
      expect(allFaceDown).toBe(true);
    });

    it("leaves the waste empty", () => {
      game.startNewGame();

      expect(game.waste.getCards()).toEqual([]);
    });

    it("deals an increasing number of cards to each tableau", () => {
      game.startNewGame();

      const counts = game.tableaus.map((t) => t.getCards().length);
      expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("leaves only the top card of each tableau face up", () => {
      game.startNewGame();

      const faceUpLayout = game.tableaus.map((t) =>
        t.getCards().map((card) => card.faceUp),
      );
      expect(faceUpLayout).toEqual([
        [true],
        [false, true],
        [false, false, true],
        [false, false, false, true],
        [false, false, false, false, true],
        [false, false, false, false, false, true],
        [false, false, false, false, false, false, true],
      ]);
    });

    it("deals nothing when constructed with an empty deck", () => {
      const shortGame = new SolitaireGame([]);

      shortGame.startNewGame();

      expect(shortGame.stock.getCards()).toEqual([]);
      expect(shortGame.tableaus.every((t) => t.getCards().length === 0)).toBe(
        true,
      );
    });

    it("emits a game-reset event", () => {
      const callback = vi.fn();
      game.on("game-reset", callback);
      game.startNewGame();
      expect(callback).toHaveBeenCalled();
    });

    it("reuses the same PlayingCard instances across restarts", () => {
      game.startNewGame();
      const firstGameCards = Array.from(game.tableaus[0].getCards());
      expect(firstGameCards.length).toBe(1);
      const cardRef = firstGameCards[0];
      const cardId = cardRef.id;

      // Start new game again
      game.startNewGame();
      const newCardRef = game.getCardById(cardId);
      expect(newCardRef).toBe(cardRef);
    });
  });

  describe("drawCardsFromStock", () => {
    it("moves three cards to the waste in draw order", () => {
      game.startNewGame();
      const stock = game.stock.getCards();
      const expectedWaste = [
        stock[stock.length - 1],
        stock[stock.length - 2],
        stock[stock.length - 3],
      ];

      game.drawCardsFromStock();

      expect(game.stock.getCards().length).toBe(21);
      expect(game.waste.getCards()).toEqual(expectedWaste);
    });

    it("flips the drawn cards face up", () => {
      game.startNewGame();

      game.drawCardsFromStock();

      const allFaceUp = game.waste.getCards().every((card) => card.faceUp);
      expect(allFaceUp).toBe(true);
    });

    it("does nothing when both the stock and waste are empty", () => {
      const emptyGame = new SolitaireGame();

      emptyGame.drawCardsFromStock();

      expect(emptyGame.stock.getCards()).toEqual([]);
      expect(emptyGame.waste.getCards()).toEqual([]);
    });

    it("recycles the waste back into the stock face down when the stock is empty", () => {
      game.startNewGame();
      relocate(game, "card-clubs-ace", game.waste);
      relocate(game, "card-clubs-2", game.waste);
      game.stock.clear();
      game.tableaus.forEach((t) => t.clear());
      game.foundations.forEach((f) => f.clear());

      game.drawCardsFromStock();

      expect(game.waste.getCards()).toEqual([]);
      expect(game.stock.getCards().length).toBe(2);
      const allFaceDown = game.stock.getCards().every((card) => !card.faceUp);
      expect(allFaceDown).toBe(true);
    });
  });

  describe("move validation", () => {
    it("does not move a non-King card onto an empty tableau", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const queen = relocate(game, "card-hearts-queen", game.tableaus[1]);

      const moved = game.moveCardToPile(queen.id, "tableau-0");

      expect(moved).toBe(false);
    });

    it("moves a King onto an empty tableau", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const king = relocate(game, "card-spades-king", game.tableaus[1]);

      const moved = game.moveCardToPile(king.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.tableaus[0].getCards()).toEqual([king]);
    });

    it("does not move a card onto a tableau card of the same color", () => {
      game.startNewGame();
      relocate(game, "card-diamonds-8", game.tableaus[0]);
      const redSeven = relocate(game, "card-hearts-7", game.tableaus[1]);

      const moved = game.moveCardToPile(redSeven.id, "tableau-0");

      expect(moved).toBe(false);
    });

    it("moves a card onto a tableau card of descending rank and alternating color", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      game.tableaus[1].clear();
      relocate(game, "card-diamonds-8", game.tableaus[0]);
      const blackSeven = relocate(game, "card-spades-7", game.tableaus[1]);
      const redSeven = relocate(game, "card-hearts-7", game.tableaus[1]);

      const moved = game.moveCardToPile(blackSeven.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.tableaus[0].getCards()).toEqual([
        game.getCardById("card-diamonds-8"),
        blackSeven,
        redSeven,
      ]);
    });

    it("does not move a non-Ace onto an empty foundation", () => {
      game.startNewGame();
      const clubTwo = relocate(game, "card-clubs-2", game.tableaus[0]);

      const moved = game.moveCardToPile(clubTwo.id, "foundation-0");

      expect(moved).toBe(false);
    });

    it("moves an Ace onto an empty foundation", () => {
      game.startNewGame();
      const clubAce = relocate(game, "card-clubs-ace", game.tableaus[1]);

      const moved = game.moveCardToPile(clubAce.id, "foundation-0");

      expect(moved).toBe(true);
    });

    it("moves a card onto a foundation of ascending rank and matching suit", () => {
      game.startNewGame();
      relocate(game, "card-clubs-ace", game.foundations[0]);
      const clubTwo = relocate(game, "card-clubs-2", game.tableaus[0]);

      const moved = game.moveCardToPile(clubTwo.id, "foundation-0");

      expect(moved).toBe(true);
    });

    it("does not move a stack of more than one card onto a foundation", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const ace = relocate(game, "card-clubs-ace", game.tableaus[0]);
      relocate(game, "card-clubs-2", game.tableaus[0]);

      const moved = game.moveCardToPile(ace.id, "foundation-0");

      expect(moved).toBe(false);
    });
  });

  describe("rejected moves", () => {
    it("rejects an unknown card id", () => {
      game.startNewGame();

      expect(game.moveCardToPile("invalid-card-id", "tableau-0")).toBe(false);
    });

    it("rejects an unknown target pile id", () => {
      game.startNewGame();
      const cardId = game.stock.getCards()[0].id;

      expect(game.moveCardToPile(cardId, "invalid-pile-id")).toBe(false);
    });

    it("rejects a move to the card's current pile", () => {
      game.startNewGame();
      const cardId = game.stock.getCards()[0].id;
      const sourcePile = game.getPileContainingCard(cardId)!;

      expect(game.moveCardToPile(cardId, sourcePile.id)).toBe(false);
    });

    it("rejects moving a face-down card", () => {
      game.startNewGame();
      const faceDownCard = game.tableaus[1].getCards()[0];

      expect(game.moveCardToPile(faceDownCard.id, "tableau-0")).toBe(false);
    });

    it("rejects the stock pile as a target", () => {
      game.startNewGame();
      const cardId = game.tableaus[0].getCards()[0].id;

      expect(game.moveCardToPile(cardId, "stock")).toBe(false);
    });

    it("rejects the waste pile as a target", () => {
      game.startNewGame();
      const cardId = game.tableaus[0].getCards()[0].id;

      expect(game.moveCardToPile(cardId, "waste")).toBe(false);
    });
  });

  describe("moving stacks", () => {
    it("auto-flips the newly exposed tableau card after a move", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      relocate(game, "card-spades-king", game.tableaus[0]);
      game.tableaus[1].clear();
      const bottomCard = relocate(
        game,
        "card-clubs-jack",
        game.tableaus[1],
        false,
      );
      const topCard = relocate(game, "card-hearts-queen", game.tableaus[1]);

      const moved = game.moveCardToPile(topCard.id, "tableau-0");

      expect(moved).toBe(true);
      expect(bottomCard.faceUp).toBe(true);
    });

    it("does not re-flip a tableau card that is already face up after a move", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      relocate(game, "card-clubs-king", game.tableaus[0]);
      game.tableaus[1].clear();
      relocate(game, "card-spades-king", game.tableaus[1]);
      const movingQueen = relocate(game, "card-hearts-queen", game.tableaus[1]);
      const flippedEvents: { cardId: string }[] = [];
      game.on("card-flipped", (payload) => flippedEvents.push(payload));

      const moved = game.moveCardToPile(movingQueen.id, "tableau-0");

      expect(moved).toBe(true);
      expect(flippedEvents).toEqual([]);
    });
  });

  describe("win condition", () => {
    it("emits game-won once all 52 cards reach the foundations", () => {
      game.startNewGame();
      almostWon(game);
      const kingOfClubs = game.getCardById(CLUB_KING_ID)!;
      kingOfClubs.faceUp = true;
      game.tableaus[0].addCard(kingOfClubs);
      let wonCount = 0;
      game.on("game-won", () => wonCount++);

      const moved = game.moveCardToPile(kingOfClubs.id, "foundation-3");

      expect(moved).toBe(true);
      expect(wonCount).toBe(1);
    });
  });

  describe("isCardInteractable", () => {
    it("treats a face-up tableau card as interactable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = true;

      expect(game.isCardInteractable(card)).toBe(true);
    });

    it("treats a face-down tableau card as not interactable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = false;

      expect(game.isCardInteractable(card)).toBe(false);
    });

    it("treats the top waste card as interactable", () => {
      game.startNewGame();
      relocate(game, "card-spades-2", game.waste);
      const top = relocate(game, "card-hearts-king", game.waste);

      expect(game.isCardInteractable(top)).toBe(true);
    });

    it("treats a non-top waste card as not interactable", () => {
      game.startNewGame();
      const bottom = relocate(game, "card-spades-2", game.waste);
      relocate(game, "card-hearts-king", game.waste);

      expect(game.isCardInteractable(bottom)).toBe(false);
    });

    it("treats the top foundation card as interactable", () => {
      game.startNewGame();
      relocate(game, "card-diamonds-ace", game.foundations[0]);
      const top = relocate(game, "card-diamonds-2", game.foundations[0]);

      expect(game.isCardInteractable(top)).toBe(true);
    });

    it("treats a non-top foundation card as not interactable", () => {
      game.startNewGame();
      const bottom = relocate(game, "card-diamonds-ace", game.foundations[0]);
      relocate(game, "card-diamonds-2", game.foundations[0]);

      expect(game.isCardInteractable(bottom)).toBe(false);
    });

    it("treats the top stock card as interactable", () => {
      game.startNewGame();
      const stock = game.stock.getCards();

      expect(game.isCardInteractable(stock[stock.length - 1])).toBe(true);
    });

    it("treats a non-top stock card as not interactable", () => {
      game.startNewGame();

      expect(game.isCardInteractable(game.stock.getCards()[0])).toBe(false);
    });

    it("treats a card that is in no pile as not interactable", () => {
      const ghost = makePlayingCard({ id: "ghost-card" });

      expect(game.isCardInteractable(ghost)).toBe(false);
    });
  });

  describe("isCardDraggable", () => {
    it("treats the top stock card as not draggable", () => {
      game.startNewGame();
      const stock = game.stock.getCards();

      expect(game.isCardDraggable(stock[stock.length - 1])).toBe(false);
    });

    it("treats a face-up tableau card as draggable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = true;

      expect(game.isCardDraggable(card)).toBe(true);
    });

    it("treats a face-down tableau card as not draggable", () => {
      game.startNewGame();
      const card = game.tableaus[0].getCards()[0];
      card.faceUp = false;

      expect(game.isCardDraggable(card)).toBe(false);
    });

    it("treats the top waste card as draggable", () => {
      game.startNewGame();
      relocate(game, "card-spades-2", game.waste);
      const top = relocate(game, "card-hearts-king", game.waste);

      expect(game.isCardDraggable(top)).toBe(true);
    });

    it("treats the top foundation card as draggable", () => {
      game.startNewGame();
      relocate(game, "card-diamonds-ace", game.foundations[0]);
      const top = relocate(game, "card-diamonds-2", game.foundations[0]);

      expect(game.isCardDraggable(top)).toBe(true);
    });

    it("treats a card that is in no pile as not draggable", () => {
      const ghost = makePlayingCard({ id: "ghost-card" });

      expect(game.isCardDraggable(ghost)).toBe(false);
    });
  });

  describe("scoring", () => {
    it("starts a new game with a zeroed score and move count", () => {
      game.startNewGame();

      expect(game.state.score).toBe(0);
      expect(game.state.moves).toBe(0);
    });

    it("scores +5 and counts a move when moving from waste to tableau", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      relocate(game, "card-spades-king", game.tableaus[0]);
      const queen = relocate(game, "card-hearts-queen", game.waste);

      const moved = game.moveCardToPile(queen.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.state.score).toBe(5);
      expect(game.state.moves).toBe(1);
    });

    it("scores +10 when moving from waste to foundation", () => {
      game.startNewGame();
      const ace = relocate(game, "card-spades-ace", game.waste);

      const moved = game.moveCardToPile(ace.id, "foundation-0");

      expect(moved).toBe(true);
      expect(game.state.score).toBe(10);
    });

    it("scores +10 when moving from tableau to foundation", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);

      const moved = game.moveCardToPile(ace.id, "foundation-1");

      expect(moved).toBe(true);
      expect(game.state.score).toBe(10);
    });

    it("scores -15 when moving from foundation to tableau", () => {
      game.startNewGame();
      game.foundations[0].clear();
      const ace = relocate(game, "card-clubs-ace", game.foundations[0]);
      game.tableaus[0].clear();
      relocate(game, "card-diamonds-2", game.tableaus[0]);
      game.state.score = 20;

      const moved = game.moveCardToPile(ace.id, "tableau-0");

      expect(moved).toBe(true);
      expect(game.state.score).toBe(5);
    });

    it("adds a +5 flip bonus on top of the move score when a tableau card is exposed", () => {
      game.startNewGame();
      game.tableaus[0].clear();
      relocate(game, "card-spades-10", game.tableaus[0], false);
      const ace = relocate(game, "card-hearts-ace", game.tableaus[0]);
      game.foundations[0].clear();

      const moved = game.moveCardToPile(ace.id, "foundation-0");

      expect(moved).toBe(true);
      expect(game.state.score).toBe(15);
    });
  });

  describe("recycle penalties", () => {
    it("does not penalize the first waste recycle in Draw 1 mode", () => {
      game.startNewGame();
      game.setDrawCount(1);
      const king = game.getCardById(CLUB_KING_ID)!;
      game.state.score = 200;

      forceWasteRecycle(game, king);

      expect(game.state.score).toBe(200);
    });

    it("penalizes 100 points for a second waste recycle in Draw 1 mode", () => {
      game.startNewGame();
      game.setDrawCount(1);
      const king = game.getCardById(CLUB_KING_ID)!;
      forceWasteRecycle(game, king);
      game.state.score = 200;

      forceWasteRecycle(game, king);

      expect(game.state.score).toBe(100);
    });

    it("does not penalize the first three waste recycles in Draw 3 mode", () => {
      game.startNewGame();
      game.setDrawCount(3);
      const king = game.getCardById(CLUB_KING_ID)!;
      game.state.score = 200;

      forceWasteRecycle(game, king);
      forceWasteRecycle(game, king);
      forceWasteRecycle(game, king);

      expect(game.state.score).toBe(200);
    });

    it("penalizes 20 points for a fourth waste recycle in Draw 3 mode", () => {
      game.startNewGame();
      game.setDrawCount(3);
      const king = game.getCardById(CLUB_KING_ID)!;
      forceWasteRecycle(game, king);
      forceWasteRecycle(game, king);
      forceWasteRecycle(game, king);
      game.state.score = 200;

      forceWasteRecycle(game, king);

      expect(game.state.score).toBe(180);
    });
  });

  describe("settings", () => {
    it("starts a new game with the default draw count and card back", () => {
      game.startNewGame();

      expect(game.settings.drawCount).toBe(3);
      expect(game.settings.cardBackStyle).toBe("card-back-blue");
    });

    it("publishes the new draw count when it changes", () => {
      const drawCounts: (1 | 3)[] = [];
      game.settings.drawCount$.subscribe((v) => drawCounts.push(v));

      game.setDrawCount(1);

      expect(game.settings.drawCount).toBe(1);
      expect(drawCounts).toContain(1);
    });

    it("publishes and emits the new card back style when it changes", () => {
      const cardBacks: string[] = [];
      const cardBackEvents: { cardBackStyle: string }[] = [];
      game.settings.cardBackStyle$.subscribe((v) => cardBacks.push(v));
      game.on("card-back-changed", (payload) => cardBackEvents.push(payload));

      game.setCardBackStyle("card-back-red");

      expect(game.settings.cardBackStyle).toBe("card-back-red");
      expect(cardBacks).toContain("card-back-red");
      expect(cardBackEvents).toEqual([{ cardBackStyle: "card-back-red" }]);
    });
  });
});
