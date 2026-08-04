import { describe, it, expect, beforeEach } from "vitest";
import { deckCardIds } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { FortyThievesGame } from "@/games/forty_thieves/forty_thieves_game";
import { FORTY_THIEVES_TWO_DECKS } from "@/games/forty_thieves/forty_thieves_deal";
import {
  FortyThievesVariant,
  fortyThievesCardsPerColumn,
  fortyThievesTableauCount,
} from "@/games/forty_thieves/forty_thieves_rules";
import {
  FOUNDATION_COUNT,
  boardColumnCount,
  tableauColumnOffset,
} from "@/games/forty_thieves/forty_thieves_zones";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/**
 * A fixed shuffle, so the deal is the same on every run and a failure here is a
 * failure of the game rather than of a lucky arrangement of cards.
 */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

/** Both decks' Aces: eight cards, so a win is eight moves rather than 104. */
const ACES_ONLY = deckCardIds(FORTY_THIEVES_TWO_DECKS).filter(
  (card) => card.rank === Rank.ACE,
);

/** The eight Ace ids, deck one suffixed as the registry names them. */
const ACE_IDS = [
  "card-spades-ace",
  "card-hearts-ace",
  "card-diamonds-ace",
  "card-clubs-ace",
  "card-spades-ace#1",
  "card-hearts-ace#1",
  "card-diamonds-ace#1",
  "card-clubs-ace#1",
];

function newGame(
  variant: FortyThievesVariant = FortyThievesVariant.FORTY_THIEVES,
  cardIds = deckCardIds(FORTY_THIEVES_TWO_DECKS),
): FortyThievesGame {
  const game = new FortyThievesGame(
    cardIds,
    sequenceRandom(SHUFFLE_VALUES),
    variant,
  );
  game.startNewGame();
  return game;
}

describe("FortyThievesGame deal", () => {
  let game: FortyThievesGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals ten columns of four", () => {
    expect(game.tableaus.map((pile) => pile.size)).toEqual(Array(10).fill(4));
  });

  it("puts the remaining sixty-four on the stock", () => {
    expect(game.stock.size).toBe(64);
  });

  it("puts all 104 distinct cards of two decks on the board", () => {
    const dealt = new Set(
      game.piles.flatMap((pile) => pile.getCards().map((card) => card.id)),
    );

    expect(dealt.size).toBe(104);
  });

  it("lays out ten columns and eight foundations", () => {
    expect([game.tableaus.length, game.foundations.length]).toEqual([
      10,
      FOUNDATION_COUNT,
    ]);
  });

  it("shows every column card, since the standard game hides nothing", () => {
    const hidden = game.tableaus
      .flatMap((pile) => pile.getCards())
      .filter((card) => !card.faceUp);

    expect(hidden).toEqual([]);
  });

  it("buries three of every four for Rank and File", () => {
    const rankAndFile = newGame(FortyThievesVariant.RANK_AND_FILE);

    const faceUpCounts = rankAndFile.tableaus.map(
      (pile) => pile.getCards().filter((card) => card.faceUp).length,
    );
    expect(faceUpCounts).toEqual(Array(10).fill(1));
  });

  it("replays the same deal on a restart", () => {
    const before = game.piles.map((pile) =>
      pile.getCards().map((card) => card.id),
    );

    game.restartGame();

    expect(
      game.piles.map((pile) => pile.getCards().map((card) => card.id)),
    ).toEqual(before);
  });
});

/*
 * Maria and Limited reach the same 36-card tableau from different shapes, and
 * are the reason the board width is derived rather than fixed.
 */
describe("FortyThievesGame board shapes", () => {
  const SHAPES: [
    name: string,
    variant: FortyThievesVariant,
    columns: number,
    perColumn: number,
  ][] = [
    ["Forty Thieves", FortyThievesVariant.FORTY_THIEVES, 10, 4],
    ["Maria", FortyThievesVariant.MARIA, 9, 4],
    ["Limited", FortyThievesVariant.LIMITED, 12, 3],
  ];

  it.each(SHAPES)(
    "%s deals its own grid",
    (_name, variant, columns, perColumn) => {
      const game = newGame(variant);

      expect(game.tableaus.map((pile) => pile.size)).toEqual(
        Array(columns).fill(perColumn),
      );
    },
  );

  it.each(SHAPES)(
    "%s puts every card it did not deal on the stock",
    (_name, variant, columns, perColumn) => {
      const game = newGame(variant);

      expect(game.stock.size).toBe(104 - columns * perColumn);
    },
  );

  it("widens the board to seat the top row when the tableau is narrower", () => {
    // Maria deals nine columns but still needs ten slots across the top for the
    // stock, the waste and eight foundations.
    expect(boardColumnCount(FortyThievesVariant.MARIA)).toBe(10);
  });

  it("centres a tableau narrower than its board", () => {
    expect(tableauColumnOffset(FortyThievesVariant.MARIA)).toBe(0);
  });

  it("lets a wide tableau set the board width instead", () => {
    expect(boardColumnCount(FortyThievesVariant.LIMITED)).toBe(12);
  });

  it("keeps the declared shape and the dealt shape in step", () => {
    const game = newGame(FortyThievesVariant.LIMITED);

    expect([game.tableaus.length, game.tableaus[0].size]).toEqual([
      fortyThievesTableauCount(FortyThievesVariant.LIMITED),
      fortyThievesCardsPerColumn(FortyThievesVariant.LIMITED),
    ]);
  });

  it("builds Limited down in suit, not in colour", () => {
    const limited = newGame(FortyThievesVariant.LIMITED);
    emptyBoard(limited);
    relocate(limited, "card-spades-9", limited.tableaus[0]);
    relocate(limited, "card-hearts-8", limited.tableaus[1]);

    expect(
      limited.moveCardToPile("card-hearts-8", limited.tableaus[0].id),
    ).toBe(false);
  });

  it("builds Maria down in alternating colours", () => {
    const maria = newGame(FortyThievesVariant.MARIA);
    emptyBoard(maria);
    relocate(maria, "card-spades-9", maria.tableaus[0]);
    relocate(maria, "card-hearts-8", maria.tableaus[1]);

    expect(maria.moveCardToPile("card-hearts-8", maria.tableaus[0].id)).toBe(
      true,
    );
  });
});

describe("FortyThievesGame column rules", () => {
  let game: FortyThievesGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("accepts the next card down in the same suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-8", game.tableaus[0].id)).toBe(
      true,
    );
  });

  it("refuses the same colour in another suit", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    expect(game.moveCardToPile("card-clubs-8", game.tableaus[0].id)).toBe(
      false,
    );
  });

  it("accepts any card into an empty column", () => {
    relocate(game, "card-hearts-7", game.tableaus[1]);

    expect(game.moveCardToPile("card-hearts-7", game.tableaus[0].id)).toBe(
      true,
    );
  });

  /*
   * The rule that makes the original as hard as it is, and the one thing
   * Josephine changes.
   *
   * The landing card is the Ten of the *same* suit on purpose, so the build
   * rule would happily take the run and only the grab rule can refuse it. With
   * an off-suit Ten this would pass whatever the grab rule said, and the
   * Josephine case below would be untestable.
   */
  it("refuses to lift a card with anything resting on it", () => {
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-8", game.tableaus[0]);
    relocate(game, "card-spades-10", game.tableaus[1]);

    expect(game.moveCardToPile("card-spades-9", game.tableaus[1].id)).toBe(
      false,
    );
  });

  it("lets Josephine lift the same same-suit run", () => {
    const josephine = newGame(FortyThievesVariant.JOSEPHINE);
    emptyBoard(josephine);
    relocate(josephine, "card-spades-9", josephine.tableaus[0]);
    relocate(josephine, "card-spades-8", josephine.tableaus[0]);
    relocate(josephine, "card-spades-10", josephine.tableaus[1]);

    expect(
      josephine.moveCardToPile("card-spades-9", josephine.tableaus[1].id),
    ).toBe(true);
  });

  it("builds Rank and File down in alternating colours instead", () => {
    const rankAndFile = newGame(FortyThievesVariant.RANK_AND_FILE);
    emptyBoard(rankAndFile);
    relocate(rankAndFile, "card-spades-9", rankAndFile.tableaus[0]);
    relocate(rankAndFile, "card-hearts-8", rankAndFile.tableaus[1]);

    expect(
      rankAndFile.moveCardToPile("card-hearts-8", rankAndFile.tableaus[0].id),
    ).toBe(true);
  });

  it("turns over the card a Rank and File move exposed", () => {
    const rankAndFile = newGame(FortyThievesVariant.RANK_AND_FILE);
    emptyBoard(rankAndFile);
    const buried = relocate(
      rankAndFile,
      "card-clubs-4",
      rankAndFile.tableaus[0],
      false,
    );
    relocate(rankAndFile, "card-spades-9", rankAndFile.tableaus[0]);
    relocate(rankAndFile, "card-hearts-10", rankAndFile.tableaus[1]);

    rankAndFile.moveCardToPile("card-spades-9", rankAndFile.tableaus[1].id);

    expect(buried.faceUp).toBe(true);
  });
});

describe("FortyThievesGame foundations", () => {
  let game: FortyThievesGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("starts on an Ace", () => {
    relocate(game, "card-spades-ace", game.tableaus[0]);

    expect(game.autoMoveCard("card-spades-ace")).toBe(true);
  });

  it("takes the second deck's Ace onto a different foundation", () => {
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-spades-ace#1", game.tableaus[0]);

    game.autoMoveCard("card-spades-ace#1");

    expect(game.foundations[1].size).toBe(1);
  });

  it("builds up in suit", () => {
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-spades-2", game.tableaus[0]);

    expect(game.moveCardToPile("card-spades-2", game.foundations[0].id)).toBe(
      true,
    );
  });

  it("lets a card be taken back down onto a column", () => {
    relocate(game, "card-spades-ace", game.foundations[0]);
    relocate(game, "card-spades-2", game.tableaus[0]);

    expect(game.moveCardToPile("card-spades-ace", game.tableaus[1].id)).toBe(
      true,
    );
  });
});

describe("FortyThievesGame stock", () => {
  it("turns one card onto the waste", () => {
    const game = newGame();

    game.drawCard();

    expect([game.stock.size, game.waste.size]).toEqual([63, 1]);
  });

  it("turns the drawn card face up", () => {
    const game = newGame();

    game.drawCard();

    expect(game.waste.topCard?.faceUp).toBe(true);
  });

  /*
   * The defining rule of the family: the stock is dealt through exactly once.
   * Klondike would recycle here.
   */
  it("refuses to draw once the stock is spent, with no recycle", () => {
    const game = newGame();
    while (game.canDraw) {
      game.drawCard();
    }

    expect(game.drawCard()).toBe(false);
  });

  it("leaves the whole stock on the waste rather than returning it", () => {
    const game = newGame();
    while (game.canDraw) {
      game.drawCard();
    }

    expect([game.stock.size, game.waste.size]).toEqual([0, 64]);
  });

  it("takes a draw back in one undo", () => {
    const game = newGame();
    game.drawCard();

    game.undo();

    expect([game.stock.size, game.waste.size]).toEqual([64, 0]);
  });

  it("turns the card back down when a draw is undone", () => {
    const game = newGame();
    game.drawCard();
    const drawn = game.stock.topCard;

    game.undo();

    expect(drawn?.faceUp).toBe(false);
  });

  it("plays the waste card onto a column", () => {
    const game = newGame();
    emptyBoard(game);
    relocate(game, "card-spades-9", game.tableaus[0]);
    relocate(game, "card-spades-8", game.waste);

    expect(game.moveCardToPile("card-spades-8", game.tableaus[0].id)).toBe(
      true,
    );
  });
});

describe("FortyThievesGame win condition", () => {
  it("is won once every card in play reaches a foundation", () => {
    const game = newGame(FortyThievesVariant.FORTY_THIEVES, ACES_ONLY);
    emptyBoard(game);
    ACE_IDS.slice(0, 7).forEach((cardId, index) =>
      relocate(game, cardId, game.foundations[index]),
    );
    relocate(game, ACE_IDS[7], game.tableaus[0]);
    let won = false;
    game.on("game-won", () => (won = true));

    game.moveCardToPile(ACE_IDS[7], game.foundations[7].id);

    expect(won).toBe(true);
  });
});
