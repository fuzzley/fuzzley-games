import { describe, it, expect, beforeEach } from "vitest";
import { CardRegistry } from "@/engine/core/card/card_registry";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { PlayingCard } from "@/engine/core/card/playing_card";
import { DealtTableGame } from "@/engine/tableau/dealt_game";
import { DeckSource } from "@/engine/tableau/deck_source";
import { anyCard } from "@/engine/tableau/rules";
import { ZoneSpec } from "@/engine/tableau/zone";

const HAND = "hand";
const HOME = "home";

function zone(id: string, overrides: Partial<ZoneSpec> = {}): ZoneSpec {
  return {
    id,
    role: id,
    slot: { pileId: id, column: 0, row: 0 },
    layout: { kind: "stacked" },
    accept: anyCard,
    grab: { kind: "any-face-up" },
    draggable: true,
    face: "card",
    ...overrides,
  };
}

/**
 * The smallest dealt game there is: every card goes onto one pile, and the game
 * is won once they have all reached the other.
 *
 * Plain on purpose, so these tests are about the deal-and-restart cycle rather
 * than about any particular solitaire.
 */
class TestDealtGame extends DealtTableGame {
  /** Every deal this game has laid out, in order, for asserting a replay. */
  public deals: string[][] = [];

  constructor(cardIds = ALL_PLAYING_CARD_IDS.slice(0, 5)) {
    super({
      zones: () => [zone(HAND), zone(HOME)],
      deck: new DeckSource(new CardRegistry(), cardIds),
      autoMoveRoles: [HOME],
      winsWhenAllCardsIn: HOME,
    });
  }

  protected override dealBoard(deck: PlayingCard[]): void {
    this.deals.push(deck.map((card) => card.id));
    for (const card of deck) {
      card.faceUp = true;
      this.requirePile(HAND).addCard(card);
    }
  }

  /** Sends every card home, which is how this game is won. */
  public sendAllHome(): void {
    for (const card of [...this.requirePile(HAND).getCards()]) {
      this.moveCardToPile(card.id, HOME);
    }
  }
}

describe("DealtTableGame", () => {
  let game: TestDealtGame;

  beforeEach(() => {
    game = new TestDealtGame();
  });

  describe("startNewGame", () => {
    it("deals the whole deck onto the board", () => {
      game.startNewGame();

      expect(game.getPileById(HAND)?.size).toBe(5);
    });

    it("announces the new deal", () => {
      let resets = 0;
      game.on("game-reset", () => resets++);

      game.startNewGame();

      expect(resets).toBe(1);
    });

    it("clears the board rather than dealing on top of the last game", () => {
      game.startNewGame();

      game.startNewGame();

      expect(game.getPileById(HAND)?.size).toBe(5);
    });

    it("takes back the score and the move count", () => {
      game.startNewGame();
      game.sendAllHome();

      game.startNewGame();

      expect(game.state.moves).toBe(0);
      expect(game.state.score).toBe(0);
    });

    it("leaves nothing to undo", () => {
      game.startNewGame();
      game.sendAllHome();

      game.startNewGame();

      expect(game.canUndo).toBe(false);
    });
  });

  describe("restartGame", () => {
    it("deals the same cards in the same order", () => {
      game.startNewGame();

      game.restartGame();

      expect(game.deals[1]).toEqual(game.deals[0]);
    });

    /*
     * The reason a restart cannot simply re-add the stored cards: a card is a
     * persistent instance shared with its sprite, and the game just played left
     * some of them turned over.
     */
    it("turns the stored deal back to the side the deck deals", () => {
      game.startNewGame();
      game.sendAllHome();

      game.restartGame();

      const dealt = game.getPileById(HAND)?.getCards() ?? [];
      expect(dealt.length).toBe(5);
    });

    it("deals a fresh game when nothing has been dealt yet", () => {
      game.restartGame();

      expect(game.getPileById(HAND)?.size).toBe(5);
    });
  });

  describe("the declared win condition", () => {
    it("announces a win once every card reaches the winning role", () => {
      let wins = 0;
      game.on("game-won", () => wins++);
      game.startNewGame();

      game.sendAllHome();

      expect(wins).toBe(1);
    });

    it("stays quiet while cards remain elsewhere", () => {
      let wins = 0;
      game.on("game-won", () => wins++);
      game.startNewGame();
      // The top card, so the move takes one card rather than the whole stack:
      // this zone gives up any face-up card along with everything resting on it.
      const top = game.getPileById(HAND)!.topCard!;

      game.moveCardToPile(top.id, HOME);

      expect(wins).toBe(0);
    });

    /*
     * An empty board is not a won one. Counting against the cards actually in
     * play is also what lets a short injected deck reach a coherent end.
     */
    it("does not call an undealt board a win", () => {
      let wins = 0;
      game.on("game-won", () => wins++);

      game.startNewGame();

      expect(wins).toBe(0);
    });

    it("counts against a short deck rather than a full one", () => {
      const short = new TestDealtGame(ALL_PLAYING_CARD_IDS.slice(0, 2));
      let wins = 0;
      short.on("game-won", () => wins++);
      short.startNewGame();

      short.sendAllHome();

      expect(wins).toBe(1);
    });
  });
});
