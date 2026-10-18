import { describe, it, expect, beforeEach } from "vitest";
import {
  dealOnStockPress,
  drawOnStockTop,
  playOnPress,
} from "@/engine/tableau/gestures/press_handlers";
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

describe("drawOnStockTop", () => {
  let game: FakeTableGame;
  let draws: number;
  const press = () => drawOnStockTop(FakeRole.STOCK, () => draws++);

  beforeEach(() => {
    game = dealtGame();
    draws = 0;
  });

  it("draws when the stock's top card is pressed", () => {
    press()(game.stock.topCard!.id, game.stock);

    expect(draws).toBe(1);
  });

  it("ignores a card buried in the stock", () => {
    press()(game.stock.getCards()[0].id, game.stock);

    expect(draws).toBe(0);
  });

  it("ignores the top card of a pile of another role", () => {
    const column = game.tableaus[0];

    press()(column.topCard!.id, column);

    expect(draws).toBe(0);
  });

  it("throws for a card in no pile", () => {
    expect(() => press()("card-hearts-ace", undefined)).toThrow(
      /not in a pile/,
    );
  });
});

describe("dealOnStockPress", () => {
  let game: FakeTableGame;
  let deals: number;
  const press = () => dealOnStockPress(FakeRole.STOCK, () => deals++);

  beforeEach(() => {
    game = dealtGame();
    deals = 0;
  });

  it("deals when any stock card is pressed", () => {
    press()(game.stock.getCards()[0].id, game.stock);

    expect(deals).toBe(1);
  });

  it("ignores a card in a pile of another role", () => {
    const column = game.tableaus[0];

    press()(column.topCard!.id, column);

    expect(deals).toBe(0);
  });

  it("ignores a card in no pile", () => {
    press()("card-hearts-ace", undefined);

    expect(deals).toBe(0);
  });
});

describe("playOnPress", () => {
  let game: FakeTableGame;

  beforeEach(() => {
    game = dealtGame();
    emptyBoard(game);
    relocate(game, "card-hearts-ace", game.tableaus[0]);
    relocate(game, "card-spades-ace", game.waste);
  });

  it("plays a card from one of its roles to its best destination", () => {
    const press = playOnPress(game, [FakeRole.TABLEAU]);

    press("card-hearts-ace", game.tableaus[0]);

    expect(game.getPileContainingCard("card-hearts-ace")?.role).toBe(
      FakeRole.FOUNDATION,
    );
  });

  it("leaves a card from any other role where it is", () => {
    const press = playOnPress(game, [FakeRole.TABLEAU]);

    press("card-spades-ace", game.waste);

    expect(game.waste.topCard?.id).toBe("card-spades-ace");
  });
});
