import { describe, it, expect, beforeEach } from "vitest";
import { IntentHandler } from "@/engine/render/input/table_intents";
import { stocklessGestures } from "@/engine/tableau/gestures/table_gestures";
import { FakeTableGame } from "@test/support/fake_table/game";
import { FakeRole } from "@test/support/fake_table/zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** Returns a fake game dealt with a fixed shuffle. */
function dealtGame(): FakeTableGame {
  const game = new FakeTableGame(undefined, sequenceRandom([]));
  game.startNewGame();
  return game;
}

/*
 * Driven through the fake table, a real game, so what a gesture did is read
 * off the board rather than a call count.
 */
describe("stocklessGestures", () => {
  let game: FakeTableGame;
  let handle: IntentHandler;

  beforeEach(() => {
    game = dealtGame();
    handle = stocklessGestures(game);
  });

  /** Returns the id of the pile currently holding the given card. */
  function pileOf(cardId: string): string | undefined {
    return game.getPileContainingCard(cardId)?.id;
  }

  describe("activate", () => {
    it("leaves a pressed card where it is", () => {
      const card = game.tableaus[0].topCard!;

      handle({ kind: "activate", cardId: card.id });

      // Nothing tells a single press what to do, so it does nothing.
      expect(pileOf(card.id)).toBe(game.tableaus[0].id);
    });

    it("records no move for a press", () => {
      handle({ kind: "activate", cardId: game.tableaus[0].topCard!.id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-pile", () => {
    it("leaves an empty slot empty when it is pressed", () => {
      handle({ kind: "activate-pile", pileId: game.foundations[0].id });

      expect(game.foundations[0].isEmpty).toBe(true);
    });

    it("records no move for a press on an empty slot", () => {
      handle({ kind: "activate-pile", pileId: game.foundations[0].id });

      expect(game.state.moves).toBe(0);
    });
  });

  describe("activate-secondary", () => {
    it("sends a double-pressed card to its best destination", () => {
      emptyBoard(game);
      const ace = relocate(game, "card-spades-ace", game.tableaus[0]);

      handle({ kind: "activate-secondary", cardId: ace.id });

      expect(game.getPileContainingCard(ace.id)?.role).toBe(
        FakeRole.FOUNDATION,
      );
    });
  });

  describe("drop", () => {
    /** Builds a red seven on one column and a black eight on another. */
    function sevenAndEight(): { seven: string; eight: string } {
      emptyBoard(game);
      relocate(game, "card-hearts-7", game.tableaus[0]);
      relocate(game, "card-spades-8", game.tableaus[1]);
      return { seven: "card-hearts-7", eight: "card-spades-8" };
    }

    it("moves the dropped card onto the pile it was released over", () => {
      const { seven } = sevenAndEight();

      handle({
        kind: "drop",
        cardIds: [seven],
        targetPileId: game.tableaus[1].id,
      });

      expect(pileOf(seven)).toBe(game.tableaus[1].id);
    });

    it("moves the whole run that travelled with the grabbed card", () => {
      emptyBoard(game);
      relocate(game, "card-spades-9", game.tableaus[0]);
      relocate(game, "card-hearts-8", game.tableaus[0]);
      relocate(game, "card-hearts-10", game.tableaus[1]);

      handle({
        kind: "drop",
        cardIds: ["card-spades-9", "card-hearts-8"],
        targetPileId: game.tableaus[1].id,
      });

      // Only the first id is passed on, because the grabbed card is the bottom
      // of the run and the model already knows what rides on it.
      expect([pileOf("card-spades-9"), pileOf("card-hearts-8")]).toEqual([
        game.tableaus[1].id,
        game.tableaus[1].id,
      ]);
    });

    it("leaves the card where it is when it was released over nothing", () => {
      const { seven } = sevenAndEight();

      handle({ kind: "drop", cardIds: [seven], targetPileId: null });

      expect(pileOf(seven)).toBe(game.tableaus[0].id);
    });

    it("leaves the card where it is when the target will not take it", () => {
      const { eight } = sevenAndEight();

      handle({
        kind: "drop",
        cardIds: [eight],
        targetPileId: game.tableaus[0].id,
      });

      // A black eight onto a red seven is backwards; the model refuses and the
      // gesture has nothing more to say about it.
      expect(pileOf(eight)).toBe(game.tableaus[1].id);
    });

    it("moves nothing when the drop names no cards", () => {
      sevenAndEight();

      handle({ kind: "drop", cardIds: [], targetPileId: game.tableaus[1].id });

      expect(game.tableaus[1].size).toBe(1);
    });
  });
});
