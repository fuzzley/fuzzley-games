import { vi, describe, it, expect } from "vitest";
import { makeBoardScene } from "@/ui/app/provider/board_catalog";
import {
  CatalogEntry,
  GAME_CATALOG,
  GameId,
  GameOptionSpec,
  GameOptionValues,
} from "@/ui/app/provider/game_catalog";
import { TestPresentation } from "@test/support/presentation";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

/**
 * Every combination of the rules a game offers.
 *
 * A sweep rather than a spot check because the two catalogs are the one place
 * a game is wired up twice — once to be dealt and once to be drawn — and a
 * rule that reshapes the board is exactly the sort of thing that gets added to
 * one and forgotten in the other.
 */
function ruleCombinations(
  options: readonly GameOptionSpec[],
): GameOptionValues[] {
  return options.reduce<GameOptionValues[]>(
    (combinations, option) =>
      combinations.flatMap((values) =>
        option.choices.map((choice) => ({
          ...values,
          [option.id]: choice.value,
        })),
      ),
    [{}],
  );
}

/** One game and one setting of its rules, named for the failure message. */
type Deal = [name: string, entry: CatalogEntry, values: GameOptionValues];

/** Every game paired with every setting of the rules it offers. */
const DEALS: Deal[] = GAME_CATALOG.flatMap((entry) =>
  ruleCombinations(entry.options).map((values): Deal => [
    `${entry.name} ${JSON.stringify(values)}`,
    entry,
    values,
  ]),
);

/** Every game, named for the failure message. */
const GAMES: [name: string, entry: CatalogEntry][] = GAME_CATALOG.map(
  (entry) => [entry.name, entry],
);

/** Every rule any game offers, named for the failure message. */
const RULES: [name: string, option: GameOptionSpec][] = GAME_CATALOG.flatMap(
  (entry) =>
    entry.options.map((option): [string, GameOptionSpec] => [
      entry.name,
      option,
    ]),
);

describe("the game catalog", () => {
  it("names every game by a distinct id", () => {
    const ids = GAME_CATALOG.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens on Klondike, which the stored-selection fallback assumes", () => {
    expect(GAME_CATALOG[0].id).toBe("klondike");
  });

  it.each(GAMES)(
    "%s offers each of its rules under a distinct id",
    (_name, entry) => {
      const ids = entry.options.map((option) => option.id);

      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it.each(RULES)(
    "%s defaults each rule to a value it offers",
    (_name, option) => {
      const offered = option.choices.map((choice) => choice.value);

      expect(offered).toContain(option.defaultValue);
    },
  );
});

describe("every game in the catalog", () => {
  it.each(DEALS)("%s deals a fresh board", (_name, entry, values) => {
    const session = entry.create(values);

    expect(session.game.state.moves).toBe(0);
  });

  it.each(DEALS)(
    "%s has a board registered to draw it",
    (_name, entry, values) => {
      const { game } = entry.create(values);

      expect(() =>
        makeBoardScene(entry.id as GameId, game, new TestPresentation()),
      ).not.toThrow();
    },
  );

  it.each(DEALS)("%s declares the grid its board lies on", (_name, entry) => {
    expect(entry.layout.slots.length).toBeGreaterThan(0);
  });

  it.each(DEALS)("%s deals again on restart", (_name, entry, values) => {
    const { game } = entry.create(values);

    expect(() => game.restartGame()).not.toThrow();
  });
});
