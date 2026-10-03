import { describe, it, expect, beforeEach } from "vitest";
import { ALL_PLAYING_CARD_IDS } from "@/engine/core/card/deck";
import { Rank } from "@/engine/core/card/playing_card";
import { CanfieldGame } from "@/games/canfield/canfield_game";
import { canfieldGestures } from "@/games/canfield/canfield_gestures";
import { RESERVE_SIZE } from "@/games/canfield/canfield_deal";
import { CanfieldVariant } from "@/games/canfield/canfield_rules";
import {
  CLOSED_STOCK_PLACEHOLDER,
  recyclePipsPlaceholder,
} from "@/games/common/zone_presets";
import { emptyBoard, relocate } from "@test/support/game_scenarios";
import { sequenceRandom } from "@test/support/sequence_random";

/** A fixed shuffle, so the deal is the same on every run. */
const SHUFFLE_VALUES = [0.37, 0.11, 0.83, 0.5, 0.06];

function newGame(
  options: {
    cardIds?: typeof ALL_PLAYING_CARD_IDS;
    variant?: CanfieldVariant;
  } = {},
): CanfieldGame {
  const game = new CanfieldGame({
    random: sequenceRandom(SHUFFLE_VALUES),
    ...options,
  });
  game.startNewGame();
  return game;
}

describe("CanfieldGame deal", () => {
  let game: CanfieldGame;

  beforeEach(() => {
    game = newGame();
  });

  it("deals thirteen to the reserve, face down but for the top", () => {
    const faceUp = game.reserve.getCards().map((card) => card.faceUp);

    expect(faceUp).toEqual([
      ...Array<boolean>(RESERVE_SIZE - 1).fill(false),
      true,
    ]);
  });

  it("starts the first foundation and one card in each column", () => {
    expect([
      ...game.foundations.map((pile) => pile.size),
      ...game.tableaus.map((pile) => pile.size),
    ]).toEqual([1, 0, 0, 0, 1, 1, 1, 1]);
  });

  it("leaves the other 34 cards face down in the stock", () => {
    const faceDown = game.stock.getCards().filter((card) => !card.faceUp);

    expect(faceDown.length).toBe(34);
  });

  it("starts the foundations with the Twos in Storehouse", () => {
    const storehouse = newGame({ variant: CanfieldVariant.STOREHOUSE });

    const ranks = storehouse.foundations.map((pile) => pile.topCard?.rank);

    expect(ranks).toEqual(Array(4).fill(Rank.TWO));
  });

  it("deals the reserve face up in Superior Canfield", () => {
    const superior = newGame({ variant: CanfieldVariant.SUPERIOR });

    expect(superior.reserve.getCards().every((card) => card.faceUp)).toBe(true);
  });
});

describe("CanfieldGame foundations", () => {
  let game: CanfieldGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
    relocate(game, "card-hearts-7", game.foundations[0]);
  });

  it("starts another foundation on the rank the deal chose", () => {
    relocate(game, "card-clubs-7", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-7", game.foundations[1].id);

    expect(moved).toBe(true);
  });

  it("refuses an Ace on an empty foundation", () => {
    relocate(game, "card-clubs-ace", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-ace", game.foundations[1].id);

    expect(moved).toBe(false);
  });

  it("builds up in suit past the King to the Ace", () => {
    relocate(game, "card-clubs-7", game.foundations[1]);
    relocate(game, "card-clubs-king", game.foundations[1]);
    relocate(game, "card-clubs-ace", game.tableaus[0]);

    const moved = game.moveCardToPile("card-clubs-ace", game.foundations[1].id);

    expect(moved).toBe(true);
  });
});

describe("CanfieldGame columns", () => {
  let game: CanfieldGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("builds down in alternating colours", () => {
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-clubs-8", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-8", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("puts a King on an Ace of the other colour", () => {
    relocate(game, "card-hearts-ace", game.tableaus[0]);
    relocate(game, "card-clubs-king", game.tableaus[1]);

    const moved = game.moveCardToPile("card-clubs-king", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("moves a run", () => {
    relocate(game, "card-spades-10", game.tableaus[1]);
    relocate(game, "card-hearts-9", game.tableaus[1]);
    relocate(game, "card-clubs-8", game.tableaus[1]);
    relocate(game, "card-diamonds-jack", game.tableaus[2]);

    const moved = game.moveCardToPile("card-spades-10", game.tableaus[2].id);

    expect([moved, game.tableaus[2].size]).toEqual([true, 4]);
  });

  it("builds in suit in Storehouse", () => {
    const storehouse = newGame({ variant: CanfieldVariant.STOREHOUSE });
    emptyBoard(storehouse);
    relocate(storehouse, "card-hearts-9", storehouse.tableaus[0]);
    relocate(storehouse, "card-clubs-8", storehouse.tableaus[1]);

    const moved = storehouse.moveCardToPile(
      "card-clubs-8",
      storehouse.tableaus[0].id,
    );

    expect(moved).toBe(false);
  });

  it("builds regardless of colour in Rainbow", () => {
    const rainbow = newGame({ variant: CanfieldVariant.RAINBOW });
    emptyBoard(rainbow);
    relocate(rainbow, "card-hearts-9", rainbow.tableaus[0]);
    relocate(rainbow, "card-diamonds-8", rainbow.tableaus[1]);

    const moved = rainbow.moveCardToPile(
      "card-diamonds-8",
      rainbow.tableaus[0].id,
    );

    expect(moved).toBe(true);
  });
});

describe("CanfieldGame spaces", () => {
  let game: CanfieldGame;

  beforeEach(() => {
    game = newGame();
    emptyBoard(game);
  });

  it("fills a space from the reserve at once, turning up the next card", () => {
    relocate(game, "card-spades-2", game.reserve, false);
    relocate(game, "card-spades-3", game.reserve);
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-spades-10", game.tableaus[1]);

    game.moveCardToPile("card-hearts-9", game.tableaus[1].id);

    expect([
      game.tableaus[0].topCard?.id,
      game.reserve.topCard?.id,
      game.reserve.topCard?.faceUp,
    ]).toEqual(["card-spades-3", "card-spades-2", true]);
  });

  it("takes the move and the fill back in one undo", () => {
    relocate(game, "card-spades-2", game.reserve, false);
    relocate(game, "card-spades-3", game.reserve);
    relocate(game, "card-hearts-9", game.tableaus[0]);
    relocate(game, "card-spades-10", game.tableaus[1]);
    game.moveCardToPile("card-hearts-9", game.tableaus[1].id);

    game.undo();

    expect([
      game.tableaus[0].topCard?.id,
      game.reserve.topCard?.id,
      game.reserve.getCards()[0]?.faceUp,
    ]).toEqual(["card-hearts-9", "card-spades-3", false]);
  });

  it("turns up the reserve's next card when its top card is played", () => {
    relocate(game, "card-spades-2", game.reserve, false);
    relocate(game, "card-hearts-9", game.reserve);
    relocate(game, "card-spades-10", game.tableaus[0]);

    game.moveCardToPile("card-hearts-9", game.tableaus[0].id);

    expect(game.reserve.topCard?.faceUp).toBe(true);
  });

  it("takes a waste card into a space once the reserve is gone", () => {
    relocate(game, "card-hearts-9", game.waste);

    const moved = game.moveCardToPile("card-hearts-9", game.tableaus[0].id);

    expect(moved).toBe(true);
  });

  it("refuses a waste card into a space while the reserve has cards", () => {
    relocate(game, "card-spades-2", game.reserve);
    relocate(game, "card-hearts-9", game.waste);

    const moved = game.moveCardToPile("card-hearts-9", game.tableaus[0].id);

    expect(moved).toBe(false);
  });

  it("leaves spaces open for any card in Superior Canfield", () => {
    const superior = newGame({ variant: CanfieldVariant.SUPERIOR });
    emptyBoard(superior);
    relocate(superior, "card-spades-2", superior.reserve);
    relocate(superior, "card-hearts-9", superior.tableaus[0]);
    relocate(superior, "card-spades-10", superior.tableaus[1]);
    superior.moveCardToPile("card-hearts-9", superior.tableaus[1].id);

    const moved = superior.moveCardToPile(
      "card-spades-10",
      superior.tableaus[0].id,
    );

    expect([superior.reserve.size, moved]).toEqual([1, true]);
  });
});

describe("CanfieldGame stock", () => {
  it("draws three cards at a time", () => {
    const game = newGame();

    game.drawCardsFromStock();

    expect(game.waste.size).toBe(3);
  });

  it("recycles the waste as often as it likes", () => {
    const game = newGame();
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.waste);

    game.drawCardsFromStock();

    expect([game.stock.size, game.waste.size]).toEqual([1, 0]);
  });

  it("allows two recycles in Storehouse, counted in pips", () => {
    const game = newGame({ variant: CanfieldVariant.STOREHOUSE });
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.waste);
    // A recycle, then a draw of the one card it put back.
    game.drawCardsFromStock();

    game.drawCardsFromStock();

    expect(game.pileBackgroundKey(game.stock)).toBe(
      recyclePipsPlaceholder(1, 2),
    );
  });

  it("allows no recycle in Rainbow", () => {
    const game = newGame({ variant: CanfieldVariant.RAINBOW });
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.waste);

    game.drawCardsFromStock();

    expect([
      game.waste.size,
      game.pileBackgroundKey(game.stock),
      game.isEmptySlotActionable(game.stock),
    ]).toEqual([1, CLOSED_STOCK_PLACEHOLDER, false]);
  });

  it("gives a recycle back when it is taken back", () => {
    const game = newGame({ variant: CanfieldVariant.STOREHOUSE });
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.waste);
    game.drawCardsFromStock();

    game.undo();

    expect(game.recyclesRemaining).toBe(2);
  });

  it("recycles on a press of the empty stock", () => {
    const game = newGame();
    emptyBoard(game);
    relocate(game, "card-hearts-9", game.waste);
    const handle = canfieldGestures(game);

    handle({ kind: "activate-pile", pileId: game.stock.id });

    expect(game.stock.size).toBe(1);
  });
});
