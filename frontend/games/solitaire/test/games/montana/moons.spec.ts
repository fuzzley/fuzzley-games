import { describe, it, expect } from "vitest";
import { ReadonlyCardPile } from "@/engine/core/card/card_pile";
import {
  ALL_RANKS,
  PlayingCard,
  Rank,
  Suit,
  playingCardInstanceId,
} from "@/engine/core/card/playing_card";
import { MontanaGame } from "@/games/montana/montana_game";
import {
  MontanaVariant,
  ROW_COUNT,
  montanaColumnCount,
} from "@/games/montana/montana_rules";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so every deal in this file is the same deal. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** How many columns the Moons' grid has: Ace to King, and a gap. */
const COLUMN_COUNT = montanaColumnCount(MontanaVariant.BLUE_MOON);

/** Returns a dealt game of one of the Moons. */
function moonGame(variant: MontanaVariant): MontanaGame {
  const game = new MontanaGame({
    variant,
    random: sequenceRandom(SHUFFLE_VALUES),
  });
  game.startNewGame();
  return game;
}

/** Returns the id of a card in this single-deck game. */
function id(suit: Suit, rank: Rank): string {
  return playingCardInstanceId({ suit, rank });
}

/** Returns the cell at a row and column of the grid. */
function cell(
  game: MontanaGame,
  row: number,
  column: number,
): ReadonlyCardPile<PlayingCard> {
  return game.cells[row * COLUMN_COUNT + column];
}

/** Returns the rank of the card in every row's first cell. */
function firstColumnRanks(game: MontanaGame): (Rank | undefined)[] {
  return game.rows.map((row) => row[0].topCard?.rank);
}

/**
 * Lays every row out from Ace to King except the last row's King, which waits
 * at the end of its row, one move from solved.
 */
function oneMoveFromSolved(game: MontanaGame): void {
  emptyBoard(game);
  const suits = [Suit.SPADE, Suit.HEART, Suit.DIAMOND, Suit.CLUB];
  suits.forEach((suit, row) => {
    ALL_RANKS.forEach((rank, column) => {
      if (row === ROW_COUNT - 1 && rank === Rank.KING) return;
      relocate(game, id(suit, rank), cell(game, row, column));
    });
  });
  relocate(
    game,
    id(Suit.CLUB, Rank.KING),
    cell(game, ROW_COUNT - 1, COLUMN_COUNT - 1),
  );
}

describe("the Blue Moon deal", () => {
  it("lays out four rows of fourteen", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);

    expect(game.rows.map((row) => row.length)).toEqual([14, 14, 14, 14]);
  });

  it("plays with the whole deck", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);

    const placed = game.cells.reduce((total, pile) => total + pile.size, 0);
    expect(placed).toBe(52);
  });

  it("starts every row with an Ace", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);

    expect(firstColumnRanks(game)).toEqual([
      Rank.ACE,
      Rank.ACE,
      Rank.ACE,
      Rank.ACE,
    ]);
  });

  it("leaves four gaps where the Aces were dealt", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);

    const gaps = game.cells.filter((pile) => pile.isEmpty);
    expect(gaps.length).toBe(4);
  });

  it("replays the same deal on a restart", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);
    const before = game.cells.map((pile) => pile.topCard?.id);

    game.restartGame();

    expect(game.cells.map((pile) => pile.topCard?.id)).toEqual(before);
  });
});

describe("the Red Moon deal", () => {
  it("starts every row with an Ace", () => {
    const game = moonGame(MontanaVariant.RED_MOON);

    expect(firstColumnRanks(game)).toEqual([
      Rank.ACE,
      Rank.ACE,
      Rank.ACE,
      Rank.ACE,
    ]);
  });

  it("puts each row's gap beside its Ace", () => {
    const game = moonGame(MontanaVariant.RED_MOON);

    expect(game.rows.map((row) => row[1].isEmpty)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it("fills every other cell", () => {
    const game = moonGame(MontanaVariant.RED_MOON);

    const filled = game.rows.flatMap((row) => row.slice(2));
    expect(filled.every((pile) => pile.size === 1)).toBe(true);
  });
});

describe("a Moon's grid", () => {
  it("never lets an Ace be picked up", () => {
    const game = moonGame(MontanaVariant.RED_MOON);
    const ace = cell(game, 0, 0).topCard!;

    expect(game.isCardInteractable(ace)).toBe(false);
  });

  it("offers no first-column cell as a destination", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);

    const firstColumn = game.rows.map((row) => row[0].id);
    const targets = game.dropTargetPiles.map((pile) => pile.id);
    expect(targets.filter((pileId) => firstColumn.includes(pileId))).toEqual(
      [],
    );
  });

  it("takes the Two of the Ace's suit into the gap beside it", () => {
    const game = moonGame(MontanaVariant.RED_MOON);
    const suit = cell(game, 0, 0).topCard!.suit;

    expect(game.moveCardToPile(id(suit, Rank.TWO), cell(game, 0, 1).id)).toBe(
      true,
    );
  });

  it("refuses a Two of another suit there", () => {
    const game = moonGame(MontanaVariant.RED_MOON);
    const suit = cell(game, 0, 0).topCard!.suit;
    const other = suit === Suit.SPADE ? Suit.HEART : Suit.SPADE;

    expect(game.moveCardToPile(id(other, Rank.TWO), cell(game, 0, 1).id)).toBe(
      false,
    );
  });

  it("is won once every row runs from Ace to King", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);
    oneMoveFromSolved(game);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile(
      id(Suit.CLUB, Rank.KING),
      cell(game, ROW_COUNT - 1, COLUMN_COUNT - 2).id,
    );

    expect(won).toBe(true);
  });
});

describe("a Moon's redeal", () => {
  it("leaves the Aces where they are", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);
    const aces = game.rows.map((row) => row[0].topCard?.id);

    game.redeal();

    expect(game.rows.map((row) => row[0].topCard?.id)).toEqual(aces);
  });

  it("leaves one gap in every row", () => {
    const game = moonGame(MontanaVariant.BLUE_MOON);

    game.redeal();

    expect(
      game.rows.map((row) => row.filter((pile) => pile.isEmpty).length),
    ).toEqual([1, 1, 1, 1]);
  });

  it("keeps every card on the board", () => {
    const game = moonGame(MontanaVariant.RED_MOON);

    game.redeal();

    const placed = game.cells.reduce((total, pile) => total + pile.size, 0);
    expect(placed).toBe(52);
  });
});
