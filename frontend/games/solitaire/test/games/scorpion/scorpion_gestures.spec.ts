import { describe, it, expect, beforeEach } from "vitest";
import {
  Rank,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { ScorpionGame } from "@/games/scorpion/scorpion_game";
import { scorpionGestures } from "@/games/scorpion/scorpion_gestures";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** The instance id of a card in this single-deck game. */
function id(suit: Suit, rank: Rank): string {
  return playingCardInstanceId({ suit, rank });
}

describe("scorpionGestures", () => {
  let game: ScorpionGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = new ScorpionGame(undefined, sequenceRandom([]));
    game.startNewGame();
    handle = scorpionGestures(game);
  });

  describe("activate", () => {
    it("deals the whole stock when it is pressed", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate", cardId: top.id });

      expect(game.stock.isEmpty).toBe(true);
    });

    it("does nothing when a column card is pressed", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "activate", cardId: card.id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-pile", () => {
    it("does nothing for the spent stock's slot, which never refills", () => {
      game.stock.clear();

      handle({ kind: "activate-pile", pileId: game.stock.id });

      expect(game.stock.isEmpty).toBe(true);
    });
  });

  describe("activate-secondary", () => {
    it("auto-moves a column card that has somewhere to go", () => {
      emptyBoard(game);
      relocate(game, id(Suit.SPADE, Rank.NINE), game.tableaus[1]);
      const eight = relocate(
        game,
        id(Suit.SPADE, Rank.EIGHT),
        game.tableaus[0],
      );

      handle({ kind: "activate-secondary", cardId: eight.id });

      expect(game.getPileContainingCard(eight.id)?.id).toBe(
        game.tableaus[1].id,
      );
    });

    it("never auto-moves a stock card", () => {
      const top = game.stock.topCard!;

      handle({ kind: "activate-secondary", cardId: top.id });

      expect(game.getPileContainingCard(top.id)?.id).toBe(game.stock.id);
    });
  });

  describe("drop", () => {
    it("moves the stack onto a column that accepts it", () => {
      emptyBoard(game);
      const king = relocate(game, id(Suit.SPADE, Rank.KING), game.tableaus[0]);

      handle({
        kind: "drop",
        cardIds: [king.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(king.id)?.id).toBe(game.tableaus[1].id);
    });

    it("leaves the stack where it is when released over no pile", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "drop", cardIds: [card.id], targetPileId: null });

      expect(game.getPileContainingCard(card.id)?.id).toBe(game.tableaus[0].id);
    });

    it("leaves the stack where it is when the rules refuse the drop", () => {
      emptyBoard(game);
      const queen = relocate(
        game,
        id(Suit.SPADE, Rank.QUEEN),
        game.tableaus[0],
      );

      handle({
        kind: "drop",
        cardIds: [queen.id],
        targetPileId: game.tableaus[1].id,
      });

      expect(game.getPileContainingCard(queen.id)?.id).toBe(
        game.tableaus[0].id,
      );
    });
  });
});
