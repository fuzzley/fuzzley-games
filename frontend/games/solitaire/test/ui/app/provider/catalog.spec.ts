import { vi, describe, it, expect } from "vitest";
import { makeBoardScene } from "@/ui/app/provider/board_catalog";
import {
  CatalogEntry,
  GAME_CATALOG,
  GameId,
  GameOptionSpec,
  GameOptionValues,
} from "@/ui/app/provider/game_catalog";
import type { PlayableGame } from "@/engine/tableau/playable_game";
import { TableGame } from "@/engine/tableau/table_game";
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

/** The first card, in board order, that can legally move, and where to. */
function firstLegalMove(
  game: TableGame,
): { cardId: string; pileId: string } | null {
  for (const pile of game.piles) {
    for (const card of pile.getCards()) {
      const target = game.dropTargetPiles.find((drop) =>
        game.canMoveCardToPile(card.id, drop.id),
      );
      if (target) return { cardId: card.id, pileId: target.id };
    }
  }
  return null;
}

/** Makes up to `count` moves, each the first legal one the board offers. */
function playMoves(game: PlayableGame, count: number): void {
  if (!(game instanceof TableGame)) {
    throw new Error("Every game in the catalog is a table game.");
  }
  for (let made = 0; made < count; made++) {
    const move = firstLegalMove(game);
    if (!move) return;
    game.moveCardToPile(move.cardId, move.pileId);
  }
}

/** Plays three moves, then takes back more than it played. */
function playOn(game: PlayableGame): void {
  playMoves(game, 3);
  for (let undone = 0; undone < 5; undone++) {
    game.undo();
  }
}

describe("the game catalog", () => {
  it("names every game by a distinct id", () => {
    const ids = GAME_CATALOG.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens on Klondike, which the stored-selection fallback assumes", () => {
    expect(GAME_CATALOG[0].id).toBe("klondike");
  });

  /*
   * A collapsed game rail shows the marker and nothing else, so two games
   * wearing the same one are indistinguishable to anyone playing at a width
   * that collapses it. The names alone do not prevent this — Spider and
   * Scorpion, Simple Simon and Seahaven, Baker's Game and Baker's Dozen all
   * collide on their first two letters.
   */
  it("badges every game with a distinct marker", () => {
    const markers = GAME_CATALOG.map((entry) => entry.marker);

    expect(new Set(markers).size).toBe(markers.length);
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

  it.each(DEALS)(
    "%s restores a snapshot of itself onto a fresh deal",
    (_name, entry, values) => {
      const original = entry.create(values).game;
      playMoves(original, 5);
      const copy = entry.create(values).game;

      copy.restore(original.snapshot());

      expect(copy.snapshot()).toEqual(original.snapshot());
    },
  );

  it.each(DEALS)(
    "%s plays on from a restored snapshot as the original does",
    (_name, entry, values) => {
      const original = entry.create(values).game;
      playMoves(original, 5);
      const copy = entry.create(values).game;
      copy.restore(original.snapshot());

      playOn(original);
      playOn(copy);

      expect(copy.snapshot()).toEqual(original.snapshot());
    },
  );
});
