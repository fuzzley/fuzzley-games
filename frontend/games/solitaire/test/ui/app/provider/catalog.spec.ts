import { vi, describe, it, expect } from "vitest";
import { makeBoardScene } from "@/ui/app/provider/board_catalog";
import {
  CatalogEntry,
  GAME_CATALOG,
  GameId,
  GameOptionSpec,
} from "@/ui/app/provider/game_catalog";
import type { PlayableGame } from "@/engine/tableau/playable_game";
import { TableGame } from "@/engine/tableau/table_game";
import { TestPresentation } from "@test/support/presentation";
import { CATALOG_DEALS as DEALS } from "@test/support/ui/catalog_deals";

vi.mock("phaser", async () => {
  const mocks = await import("@test/support/phaser_mocks");
  return mocks.boardScenePhaserMock();
});

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

/** Every rule that picks which of a game's family to deal. */
const VARIANTS = RULES.filter(([, option]) => option.id === "variant");

/** Returns the first card, in board order, that can legally move, and where. */
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

/** Returns a dealt game as the table game every catalog entry deals. */
function asTableGame(game: PlayableGame): TableGame {
  if (!(game instanceof TableGame)) {
    throw new Error("Every game in the catalog is a table game.");
  }
  return game;
}

/** Makes up to `count` moves, each the first legal one the board offers. */
function playMoves(dealt: PlayableGame, count: number): void {
  const game = asTableGame(dealt);
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

  it.each(VARIANTS)("%s offers its variants one to a row", (_name, option) => {
    expect(option.control).toBe("list");
  });

  it.each(VARIANTS)(
    "%s says in a line what each of its variants does",
    (_name, option) => {
      const undescribed = option.choices
        .filter((choice) => !choice.description)
        .map((choice) => choice.label);

      expect(undescribed).toEqual([]);
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
        makeBoardScene(entry.id as GameId, game, {
          presentation: new TestPresentation(),
        }),
      ).not.toThrow();
    },
  );

  it.each(DEALS)(
    "%s deals its piles onto the grid its entry declares",
    (_name, entry, values) => {
      const game = asTableGame(entry.create(values).game);

      const slots = game.piles.map((pile) => game.zoneFor(pile.id)?.slot);

      expect(slots).toEqual(entry.layout.slots);
    },
  );

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
