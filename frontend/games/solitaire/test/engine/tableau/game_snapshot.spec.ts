import { describe, it, expect, vi } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { readObject, readString } from "@/engine/core/common/json_reader";
import {
  type CardSnapshot,
  type GameSnapshot,
  readGameSnapshot,
} from "@/engine/tableau/game_snapshot";
import type { AppliedMove } from "@/engine/tableau/move";
import { FakeTableGame } from "@test/support/fake_table/game";

/** Returns a game dealt in deck order, then played: two draws. */
function playedGame(): FakeTableGame {
  const game = new FakeTableGame(ALL_PLAYING_CARD_IDS, () => 0.999);
  game.startNewGame();
  game.drawCardsFromStock();
  game.drawCardsFromStock();
  return game;
}

/** Returns a game dealt unlike {@link playedGame}, and not yet played. */
function freshGame(): FakeTableGame {
  const game = new FakeTableGame(ALL_PLAYING_CARD_IDS, () => 0);
  game.startNewGame();
  return game;
}

/** Holds what {@link ModalGame} keeps outside its piles. */
interface ModalExtra {
  readonly mode: string;
}

/** Plays a game keeping a mode outside its piles, and rejects a missing one. */
class ModalGame extends FakeTableGame {
  public mode = "classic";

  protected override saveExtra(): ModalExtra {
    return { mode: this.mode };
  }

  protected override restoreExtra(extra: unknown): void {
    this.mode = readString(readObject(extra, "extra").mode, "extra.mode");
  }
}

/** Returns a {@link ModalGame} dealt and switched out of its default mode. */
function modalGame(): ModalGame {
  const game = new ModalGame(ALL_PLAYING_CARD_IDS, () => 0.999);
  game.startNewGame();
  game.mode = "tournament";
  return game;
}

/** Restores a snapshot the game is expected to reject, ignoring the error. */
function attemptRestore(game: FakeTableGame, snapshot: GameSnapshot): void {
  try {
    game.restore(snapshot);
  } catch {
    // Rejected, as the caller expects; the caller asserts on the game.
  }
}

type Corruption = (snapshot: GameSnapshot) => GameSnapshot;

/** Rewrites the cards of the snapshot's first pile that has any. */
function editFirstPile(
  edit: (cards: readonly CardSnapshot[]) => CardSnapshot[],
): Corruption {
  return (snapshot) => {
    const target = snapshot.piles.findIndex((pile) => pile.cards.length > 1);
    return {
      ...snapshot,
      piles: snapshot.piles.map((pile, index) =>
        index === target ? { ...pile, cards: edit(pile.cards) } : pile,
      ),
    };
  };
}

/** Rewrites the snapshot's first recorded action. */
function editFirstAction(edit: (move: AppliedMove) => AppliedMove): Corruption {
  return (snapshot) => ({
    ...snapshot,
    history: [edit(snapshot.history[0]), ...snapshot.history.slice(1)],
  });
}

/** Snapshots a game cannot have produced, and what restoring each says. */
const CORRUPTIONS: [name: string, corrupt: Corruption, error: RegExp][] = [
  [
    "a pile the game lacks",
    (snapshot) => ({
      ...snapshot,
      piles: snapshot.piles.map((pile, index) =>
        index === 0 ? { ...pile, id: "nowhere" } : pile,
      ),
    }),
    /no pile "nowhere"/,
  ],
  [
    "a card the game lacks",
    editFirstPile((cards) => [
      { id: "card-joker", faceUp: true },
      ...cards.slice(1),
    ]),
    /no card "card-joker"/,
  ],
  [
    "a card listed twice",
    editFirstPile((cards) => [cards[0], cards[0], ...cards.slice(2)]),
    /board lists a card twice/,
  ],
  [
    "a card missing",
    editFirstPile((cards) => cards.slice(1)),
    /board holds 51 cards; this game has 52/,
  ],
  [
    "an action moving cards to a pile the game lacks",
    editFirstAction((move) => ({
      ...move,
      transfers: [{ ...move.transfers[0], toPileId: "nowhere" }],
    })),
    /no pile "nowhere"/,
  ],
  [
    "an action turning over a card the game lacks",
    editFirstAction((move) => ({ ...move, flippedCardIds: ["card-joker"] })),
    /no card "card-joker"/,
  ],
  [
    "a deal listing a card twice",
    (snapshot) => ({
      ...snapshot,
      deal: [snapshot.deal[0], ...snapshot.deal.slice(0, -1)],
    }),
    /deal lists a card twice/,
  ],
];

describe("DealtTableGame snapshots", () => {
  it("puts the board back onto a game dealt differently", () => {
    const played = playedGame();
    const fresh = freshGame();

    fresh.restore(played.snapshot());

    expect(fresh.snapshot().piles).toEqual(played.snapshot().piles);
  });

  it("puts the score, move count and undo depth back", () => {
    const fresh = freshGame();

    fresh.restore({ ...playedGame().snapshot(), score: 120 });

    expect(fresh.state.snapshot()).toEqual({
      score: 120,
      moves: 2,
      undoDepth: 2,
    });
  });

  it("puts the history back, so undo takes back the same action", () => {
    const played = playedGame();
    const fresh = freshGame();
    fresh.restore(played.snapshot());

    played.undo();
    fresh.undo();

    expect(fresh.snapshot()).toEqual(played.snapshot());
  });

  it("puts the deal back, so a restart replays the same game", () => {
    const played = playedGame();
    const fresh = freshGame();
    fresh.restore(played.snapshot());

    played.restartGame();
    fresh.restartGame();

    expect(fresh.snapshot()).toEqual(played.snapshot());
  });

  it("accepts a snapshot without a deal", () => {
    const played = playedGame();
    const fresh = freshGame();

    fresh.restore({ ...played.snapshot(), deal: [] });

    expect(fresh.snapshot().piles).toEqual(played.snapshot().piles);
  });

  it("carries the extra state a game keeps outside its piles", () => {
    const copy = new ModalGame();
    copy.startNewGame();

    copy.restore(modalGame().snapshot());

    expect(copy.mode).toBe("tournament");
  });

  it("is left as it was when the game rejects its extra state", () => {
    const copy = new ModalGame();
    copy.startNewGame();
    const before = copy.snapshot();

    attemptRestore(copy, { ...modalGame().snapshot(), extra: {} });

    expect(copy.snapshot()).toEqual(before);
  });

  it("announces a reset, so a view redraws", () => {
    const fresh = freshGame();
    const reset = vi.fn();
    fresh.on("game-reset", reset);

    fresh.restore(playedGame().snapshot());

    expect(reset).toHaveBeenCalledOnce();
  });

  it.each(CORRUPTIONS)("rejects %s", (_name, corrupt, error) => {
    const fresh = freshGame();

    expect(() => fresh.restore(corrupt(playedGame().snapshot()))).toThrow(
      error,
    );
  });

  it.each(CORRUPTIONS)("is left as it was by %s", (_name, corrupt) => {
    const fresh = freshGame();
    const before = fresh.snapshot();

    attemptRestore(fresh, corrupt(playedGame().snapshot()));

    expect(fresh.snapshot()).toEqual(before);
  });
});

/** Values shaped wrongly for a snapshot, and what reading each says. */
const MALFORMED: [
  name: string,
  malform: (snapshot: GameSnapshot) => unknown,
  error: RegExp,
][] = [
  ["something other than an object", () => 42, /snapshot is not an object/],
  [
    "piles that are not a list",
    (snapshot) => ({ ...snapshot, piles: {} }),
    /piles is not a list/,
  ],
  [
    "a card with no face",
    (snapshot) => ({
      ...snapshot,
      piles: [{ ...snapshot.piles[0], cards: [{ id: "card-spades-ace" }] }],
    }),
    /piles\[0\]\.cards\[0\]\.faceUp is not true or false/,
  ],
  [
    "a score that is not a number",
    (snapshot) => ({ ...snapshot, score: "high" }),
    /score is not a number/,
  ],
  [
    "an action with nowhere for its cards to go",
    (snapshot) => ({
      ...snapshot,
      history: [
        {
          ...snapshot.history[0],
          transfers: [{ ...snapshot.history[0].transfers[0], toPileId: 7 }],
        },
      ],
    }),
    /history\[0\]\.transfers\[0\]\.toPileId is not text/,
  ],
  [
    "a deal of numbers",
    (snapshot) => ({ ...snapshot, deal: [1] }),
    /deal\[0\] is not text/,
  ],
];

describe("readGameSnapshot", () => {
  it("reads back a snapshot written out as JSON", () => {
    const snapshot = playedGame().snapshot();

    const parsed = readGameSnapshot(JSON.parse(JSON.stringify(snapshot)));

    expect(parsed).toEqual(snapshot);
  });

  it.each(MALFORMED)("rejects %s", (_name, malform, error) => {
    const value = malform(playedGame().snapshot());

    expect(() => readGameSnapshot(value)).toThrow(error);
  });
});
