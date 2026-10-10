import { describe, it, expect } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { GameSnapshot } from "@/engine/tableau/session/game_snapshot";
import { resolveSnapshot } from "@/engine/tableau/session/snapshot_resolution";
import { FakeTableGame } from "@test/support/fake_table/game";

/** Returns a game dealt in deck order, then played: one draw. */
function playedGame(): FakeTableGame {
  const game = new FakeTableGame(ALL_PLAYING_CARD_IDS, () => 0.999);
  game.startNewGame();
  game.drawCardsFromStock();
  return game;
}

/** Returns a game dealt unlike {@link playedGame}, to resolve snapshots on. */
function freshGame(): FakeTableGame {
  const game = new FakeTableGame(ALL_PLAYING_CARD_IDS, () => 0);
  game.startNewGame();
  return game;
}

describe("resolveSnapshot", () => {
  it("resolves each pile to the game's own, with its cards and sides", () => {
    const snapshot = playedGame().snapshot();
    const game = freshGame();

    const { board } = resolveSnapshot(snapshot, game);

    expect(
      board.map(({ pile, cards }) => ({
        id: pile.id,
        same: pile === game.getPileById(pile.id),
        cards: cards.map(({ card, faceUp }) => ({ id: card.id, faceUp })),
      })),
    ).toEqual(
      snapshot.piles.map((pile) => ({
        id: pile.id,
        same: true,
        cards: pile.cards,
      })),
    );
  });

  it("resolves the deal to the game's own cards, in dealt order", () => {
    const snapshot = playedGame().snapshot();
    const game = freshGame();

    const { deal } = resolveSnapshot(snapshot, game);

    expect(deal).toEqual(snapshot.deal.map((id) => game.getCardById(id)));
  });

  it("resolves a snapshot without a deal to an empty deal", () => {
    const snapshot: GameSnapshot = { ...playedGame().snapshot(), deal: [] };

    expect(resolveSnapshot(snapshot, freshGame()).deal).toEqual([]);
  });

  it("rejects a history naming a pile the game lacks", () => {
    const played = playedGame().snapshot();
    const [first] = played.history;
    const snapshot: GameSnapshot = {
      ...played,
      history: [
        {
          ...first,
          transfers: [{ ...first.transfers[0], fromPileId: "nowhere" }],
        },
      ],
    };

    expect(() => resolveSnapshot(snapshot, freshGame())).toThrow(
      /no pile "nowhere"/,
    );
  });

  it("rejects a board missing a card", () => {
    const played = playedGame().snapshot();
    const target = played.piles.findIndex((pile) => pile.cards.length > 0);
    const snapshot: GameSnapshot = {
      ...played,
      piles: played.piles.map((pile, index) =>
        index === target ? { ...pile, cards: [] } : pile,
      ),
    };

    expect(() => resolveSnapshot(snapshot, freshGame())).toThrow(
      /board holds \d+ cards; this game has 52/,
    );
  });
});
