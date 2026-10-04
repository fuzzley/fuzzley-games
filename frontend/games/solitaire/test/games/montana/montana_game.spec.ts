import { describe, it, expect, beforeEach } from "vitest";
import {
  PlayingCard,
  Rank,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { deckCardIds } from "@/engine/core/card/deck";
import { MontanaGame } from "@/games/montana/montana_game";
import { MONTANA_DECK, GAP_COUNT } from "@/games/montana/montana_deal";
import {
  DEFAULT_MAX_REDEALS,
  MontanaVariant,
  ROW_COUNT,
  montanaColumnCount,
} from "@/games/montana/montana_rules";
import { REDEAL_PILE_ID } from "@/games/montana/montana_zones";
import { PIP_COUNTS } from "@/games/common/zone_presets";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";
import { seededRandom } from "@/engine/core/random/seeded_random";

/** How many columns Montana's grid has. */
const COLUMN_COUNT = montanaColumnCount(MontanaVariant.MONTANA);

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** Returns the card id for a suit and rank, as the registry names it. */
function cardId(suit: Suit, rank: Rank): string {
  return playingCardInstanceId({ suit, rank });
}

/** Every rank a Montana row holds, Two up to King. */
const ROW_RANKS = [
  Rank.TWO,
  Rank.THREE,
  Rank.FOUR,
  Rank.FIVE,
  Rank.SIX,
  Rank.SEVEN,
  Rank.EIGHT,
  Rank.NINE,
  Rank.TEN,
  Rank.JACK,
  Rank.QUEEN,
  Rank.KING,
];

function newGame(): MontanaGame {
  const game = new MontanaGame({
    cardIds: deckCardIds(MONTANA_DECK),
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

/** Returns the cell at a row and column of the grid. */
function cell(game: MontanaGame, row: number, column: number) {
  return game.cells[row * COLUMN_COUNT + column];
}

/**
 * Lays every row out in order except the last card of the last row, which is
 * left in the final cell of its row instead — one move from solved.
 */
function oneMoveFromSolved(game: MontanaGame): PlayingCard {
  emptyBoard(game);
  const suits = [Suit.SPADE, Suit.HEART, Suit.DIAMOND, Suit.CLUB];
  suits.forEach((suit, row) => {
    ROW_RANKS.forEach((rank, column) => {
      // The last row's King is held back so a single move finishes the game.
      if (row === ROW_COUNT - 1 && rank === Rank.KING) return;
      relocate(game, cardId(suit, rank), cell(game, row, column));
    });
  });
  // Park the missing King out at the end of its row, where nothing follows it.
  return relocate(
    game,
    cardId(Suit.CLUB, Rank.KING),
    cell(game, ROW_COUNT - 1, COLUMN_COUNT - 1),
  );
}

describe("MontanaGame deal", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
  });

  it("lays out a grid of four rows by thirteen", () => {
    expect(game.cells.length).toBe(ROW_COUNT * COLUMN_COUNT);
  });

  it("plays with forty-eight cards, the deck without its Aces", () => {
    expect(game.cardsInPlay).toBe(48);
  });

  it("puts every card it has on the board", () => {
    const placed = game.cells.reduce((total, pile) => total + pile.size, 0);

    expect(placed).toBe(48);
  });

  it("leaves exactly four gaps", () => {
    const gaps = game.cells.filter((pile) => pile.isEmpty);

    expect(gaps.length).toBe(GAP_COUNT);
  });

  it("deals no Ace, since the Aces are what the gaps stand in for", () => {
    const aces = game.cells
      .flatMap((pile) => pile.getCards())
      .filter((card) => card.rank === Rank.ACE);

    expect(aces).toEqual([]);
  });

  it("deals every card face up", () => {
    const hidden = game.cells
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);

    expect(hidden).toEqual([]);
  });

  it("holds at most one card in any cell", () => {
    const overfull = game.cells.filter((pile) => pile.size > 1);

    expect(overfull).toEqual([]);
  });

  it("leaves the same gaps when the deal is restarted", () => {
    // A source that keeps varying, unlike the fixed shuffle, which would leave
    // the same gaps whether or not the deal replays them.
    const shuffledGame = new MontanaGame({ random: seededRandom(1) });
    shuffledGame.startNewGame();
    const gapsDealt = shuffledGame.cells.filter((pile) => pile.isEmpty);

    shuffledGame.restartGame();

    expect(shuffledGame.cells.filter((pile) => pile.isEmpty)).toEqual(
      gapsDealt,
    );
  });
});

describe("MontanaGame gap rules", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts the next card up in the same suit as the cell to the left", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.SIX), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.SIX), cell(game, 0, 1).id),
    ).toBe(true);
  });

  it("refuses the right rank in the wrong suit", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.HEART, Rank.SIX), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.HEART, Rank.SIX), cell(game, 0, 1).id),
    ).toBe(false);
  });

  it("refuses the right suit at the wrong rank", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.SEVEN), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.SEVEN), cell(game, 0, 1).id),
    ).toBe(false);
  });

  it("accepts any Two into the leftmost column", () => {
    relocate(game, cardId(Suit.HEART, Rank.TWO), cell(game, 2, 7));

    expect(
      game.moveCardToPile(cardId(Suit.HEART, Rank.TWO), cell(game, 0, 0).id),
    ).toBe(true);
  });

  it("refuses anything but a Two into the leftmost column", () => {
    relocate(game, cardId(Suit.HEART, Rank.THREE), cell(game, 2, 7));

    expect(
      game.moveCardToPile(cardId(Suit.HEART, Rank.THREE), cell(game, 0, 0).id),
    ).toBe(false);
  });

  it("refuses every card into the gap beyond a King", () => {
    relocate(game, cardId(Suit.SPADE, Rank.KING), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 1).id),
    ).toBe(false);
  });

  it("refuses every card into a gap whose left neighbour is itself a gap", () => {
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 5).id),
    ).toBe(false);
  });

  it("refuses a card onto an occupied cell", () => {
    relocate(game, cardId(Suit.SPADE, Rank.FIVE), cell(game, 0, 0));
    relocate(game, cardId(Suit.CLUB, Rank.NINE), cell(game, 0, 1));
    relocate(game, cardId(Suit.SPADE, Rank.SIX), cell(game, 1, 5));

    expect(
      game.moveCardToPile(cardId(Suit.SPADE, Rank.SIX), cell(game, 0, 1).id),
    ).toBe(false);
  });
});

describe("MontanaGame win condition", () => {
  it("is won when every row reads Two through King in one suit", () => {
    const game = newGame();
    const king = oneMoveFromSolved(game);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile(king.id, cell(game, ROW_COUNT - 1, 11).id);

    expect(won).toBe(true);
  });

  it("is not won while a row is still out of order", () => {
    const game = newGame();
    oneMoveFromSolved(game);
    let won = false;
    game.on("game-won", () => (won = true));

    // A legal move that does not finish the grid: the King goes nowhere useful.
    game.moveCardToPile(
      cardId(Suit.CLUB, Rank.KING),
      cell(game, ROW_COUNT - 1, 12).id,
    );

    expect(won).toBe(false);
  });
});

describe("MontanaGame redeal", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
  });

  it("offers two redeals on a fresh deal", () => {
    expect(game.redealsRemaining).toBe(DEFAULT_MAX_REDEALS);
  });

  it("spends one when used", () => {
    game.redeal();

    expect(game.redealsRemaining).toBe(DEFAULT_MAX_REDEALS - 1);
  });

  it("refuses once they are spent", () => {
    for (let used = 0; used < DEFAULT_MAX_REDEALS; used++) {
      game.redeal();
    }

    expect(game.redeal()).toBe(false);
  });

  it("keeps every card on the board", () => {
    game.redeal();

    const placed = game.cells.reduce((total, pile) => total + pile.size, 0);
    expect(placed).toBe(48);
  });

  it("still leaves one gap per row", () => {
    game.redeal();

    const gaps = game.cells.filter((pile) => pile.isEmpty);
    expect(gaps.length).toBe(GAP_COUNT);
  });

  it("holds at most one card in any cell afterwards", () => {
    game.redeal();

    expect(game.cells.filter((pile) => pile.size > 1)).toEqual([]);
  });

  it("leaves a settled run where it is", () => {
    emptyBoard(game);
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.THREE), cell(game, 0, 1));
    relocate(game, cardId(Suit.HEART, Rank.NINE), cell(game, 0, 3));

    game.redeal();

    expect([
      cell(game, 0, 0).topCard?.id,
      cell(game, 0, 1).topCard?.id,
    ]).toEqual([cardId(Suit.SPADE, Rank.TWO), cardId(Suit.SPADE, Rank.THREE)]);
  });

  it("opens the row's gap immediately after its settled run", () => {
    emptyBoard(game);
    relocate(game, cardId(Suit.SPADE, Rank.TWO), cell(game, 0, 0));
    relocate(game, cardId(Suit.SPADE, Rank.THREE), cell(game, 0, 1));
    relocate(game, cardId(Suit.HEART, Rank.NINE), cell(game, 0, 3));

    game.redeal();

    expect(cell(game, 0, 2).isEmpty).toBe(true);
  });

  it("refuses when there is nothing out of place to gather", () => {
    oneMoveFromSolved(game);
    game.moveCardToPile(
      cardId(Suit.CLUB, Rank.KING),
      cell(game, ROW_COUNT - 1, 11).id,
    );

    expect(game.canRedeal).toBe(false);
  });

  it("takes a whole redeal back in one undo", () => {
    const before = game.cells.map((pile) => pile.topCard?.id ?? null);
    game.redeal();

    game.undo();

    expect(game.cells.map((pile) => pile.topCard?.id ?? null)).toEqual(before);
  });

  it("gives the spent redeal back on undo", () => {
    game.redeal();

    game.undo();

    expect(game.redealsRemaining).toBe(DEFAULT_MAX_REDEALS);
  });
});

describe("the Montana redeal marker", () => {
  let game: MontanaGame;

  beforeEach(() => {
    game = newGame();
  });

  /** Returns the artwork the marker shows now. */
  function markerArtwork(): string | undefined {
    return game.pileBackgroundKey(game.getPileById(REDEAL_PILE_ID)!);
  }

  /** Returns whether pressing the marker would do something now. */
  function markerPressable(): boolean {
    return game.isEmptySlotActionable(game.getPileById(REDEAL_PILE_ID)!);
  }

  /** Spends every redeal the game allows. */
  function spendEveryRedeal(): void {
    for (let used = 0; used < DEFAULT_MAX_REDEALS; used++) {
      game.redeal();
    }
  }

  it("shows a filled pip for each redeal on a fresh deal", () => {
    expect(markerArtwork()).toBe("card-placeholder-full-border-reset-2-of-2");
  });

  it("hollows a pip when a redeal is spent", () => {
    game.redeal();

    expect(markerArtwork()).toBe("card-placeholder-full-border-reset-1-of-2");
  });

  it("fills the pip again when the redeal is undone", () => {
    game.redeal();

    game.undo();

    expect(markerArtwork()).toBe("card-placeholder-full-border-reset-2-of-2");
  });

  it("shows the plain outline once every redeal is spent", () => {
    spendEveryRedeal();

    expect(markerArtwork()).toBe("card-placeholder-full-border");
  });

  it("shows the plain outline when there is nothing to gather", () => {
    oneMoveFromSolved(game);
    game.moveCardToPile(
      cardId(Suit.CLUB, Rank.KING),
      cell(game, ROW_COUNT - 1, 11).id,
    );

    expect(markerArtwork()).toBe("card-placeholder-full-border");
  });

  it("can be pressed while a redeal is left", () => {
    game.redeal();

    expect(markerPressable()).toBe(true);
  });

  it("cannot be pressed once every redeal is spent", () => {
    spendEveryRedeal();

    expect(markerPressable()).toBe(false);
  });

  it("leaves the cells drawn over their own placeholder", () => {
    spendEveryRedeal();

    expect(game.pileBackgroundKey(cell(game, 0, 0))).toBe("card-placeholder");
  });

  it("has pip artwork for every redeal the game allows", () => {
    expect(PIP_COUNTS).toContain(DEFAULT_MAX_REDEALS);
  });
});

describe("the Montana board", () => {
  it("declares a redeal marker that is never a destination", () => {
    const game = newGame();

    expect(game.getPileById(REDEAL_PILE_ID)?.isEmpty).toBe(true);
  });

  it("lays each row out in thirteen cells, for twelve cards and a gap", () => {
    expect(COLUMN_COUNT).toBe(13);
  });
});

describe("MontanaGame snapshot", () => {
  it("restores the redeals left", () => {
    const original = newGame();
    original.redeal();
    const copy = newGame();

    copy.restore(original.snapshot());

    expect(copy.redealsRemaining).toBe(DEFAULT_MAX_REDEALS - 1);
  });
});

describe("Addiction", () => {
  /** Returns a dealt game allowing three redeals. */
  function addictionGame(): MontanaGame {
    const game = new MontanaGame({
      cardIds: deckCardIds(MONTANA_DECK),
      random: sequenceRandom(SHUFFLE_VALUES),
      maxRedeals: 3,
    });
    game.startNewGame();
    return game;
  }

  /** Returns the artwork the game's marker shows now. */
  function markerArtwork(game: MontanaGame): string | undefined {
    return game.pileBackgroundKey(game.getPileById(REDEAL_PILE_ID)!);
  }

  it("offers three redeals on a fresh deal", () => {
    const game = addictionGame();

    expect(game.redealsRemaining).toBe(3);
  });

  it("redeals a third time, which Montana refuses", () => {
    const game = addictionGame();
    game.redeal();
    game.redeal();

    expect(game.redeal()).toBe(true);
  });

  it("refuses a fourth redeal", () => {
    const game = addictionGame();
    game.redeal();
    game.redeal();
    game.redeal();

    expect(game.redeal()).toBe(false);
  });

  it("counts the redeals left in three pips", () => {
    const game = addictionGame();
    const shown = [markerArtwork(game)];
    game.redeal();
    shown.push(markerArtwork(game));
    game.redeal();
    shown.push(markerArtwork(game));
    game.redeal();
    shown.push(markerArtwork(game));

    expect(shown).toEqual([
      "card-placeholder-full-border-reset-3-of-3",
      "card-placeholder-full-border-reset-2-of-3",
      "card-placeholder-full-border-reset-1-of-3",
      "card-placeholder-full-border",
    ]);
  });

  it("restores the redeals spent from a snapshot", () => {
    const original = addictionGame();
    original.redeal();
    const copy = addictionGame();

    copy.restore(original.snapshot());

    expect(copy.redealsRemaining).toBe(2);
  });
});
