import { vi, describe, it, expect } from "vitest";
import { makeBoardScene } from "@/ui/app/provider/board_catalog";
import {
  CatalogEntry,
  GAME_CATALOG,
  GameId,
  GameOptionSpec,
  optionRule,
  storedValue,
  storedValues,
  catalogEntry,
} from "@/ui/app/provider/game_catalog";
import { KlondikeVariant } from "@/games/klondike/klondike_rules";
import type { PlayableGame } from "@/engine/tableau/session/playable_game";
import { TableGame } from "@/engine/tableau/table_game";
import { TableLayoutSpec } from "@/engine/render/layout/table_layout";
import { computeScale } from "@/engine/render/layout/table_metrics";
import { NO_INSETS, Viewport } from "@/engine/render/layout/viewport";
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

/** Every game a player may arrange, named for the failure message. */
const ARRANGED = GAMES.filter(([, entry]) => entry.arrangement !== undefined);

/** A 1920 × 1080 window under the larger screen's 73 px header. */
const FULL_HD: Viewport = {
  width: 1920,
  height: 1080,
  pixelRatio: 1,
  insets: { ...NO_INSETS, top: 73 },
};

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

  it.each(DEALS)(
    "%s places every pile on each of its arranged grids",
    (_name, entry, values) => {
      const game = asTableGame(entry.create(values).game);
      const piles = game.piles.map((pile) => pile.id).sort();
      const arranged = entry.arrangement?.layouts;
      const grids: Record<string, TableLayoutSpec> = arranged
        ? {
            "roomy-top": arranged.roomy.top,
            "roomy-bottom": arranged.roomy.bottom,
            "portrait-top": arranged.portrait.top,
            "portrait-bottom": arranged.portrait.bottom,
            "landscape-top": arranged.landscape.top,
            "landscape-bottom": arranged.landscape.bottom,
          }
        : {};

      const misplaced = Object.entries(grids)
        .filter(([, grid]) => {
          const placed = grid.slots.map((slot) => slot.pileId).sort();
          return JSON.stringify(placed) !== JSON.stringify(piles);
        })
        .map(([name]) => name);

      expect(misplaced).toEqual([]);
    },
  );

  it.each(DEALS)(
    "%s names its side pile exactly when its grids have one",
    (_name, entry) => {
      const arrangement = entry.arrangement;

      expect(arrangement?.sideName === undefined).toBe(
        arrangement?.layouts.side === undefined,
      );
    },
  );

  it.each(ARRANGED)(
    "%s keeps its cards at least 85%% as big with the piles below on a 1920 × 1080 window",
    (_name, entry) => {
      const { top, bottom } = entry.arrangement!.layouts.roomy;

      expect(
        computeScale(bottom, FULL_HD) / computeScale(top, FULL_HD),
      ).toBeGreaterThanOrEqual(0.85);
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

describe("a rule's stored values", () => {
  it.each(RULES)(
    "%s stores each choice under a number of its own",
    (_name, option) => {
      const values = option.choices.map((choice) => choice.value);

      expect(new Set(values).size).toBe(values.length);
    },
  );

  it.each(RULES)(
    "%s hands its game a different rule for each choice",
    (_name, option) => {
      const rules = option.choices.map((choice) => choice.rule);

      expect(new Set(rules).size).toBe(rules.length);
    },
  );

  it("keeps the numbers saved preferences already hold", () => {
    // Stored before variants had names of their own; a preference saved then
    // must still choose the same game.
    expect(storedValue("klondike", "variant", KlondikeVariant.WHITEHEAD)).toBe(
      1,
    );
  });

  it("finds the stored values for rules given in the game's own terms", () => {
    expect(
      storedValues("klondike", { variant: KlondikeVariant.SARATOGA }),
    ).toEqual({ variant: 3 });
  });

  it("refuses a rule the game does not offer", () => {
    expect(() => storedValue("klondike", "variant", "spider")).toThrow(
      /offers no "variant" of spider/,
    );
  });

  it("hands the game its default rule for a stored value no choice has", () => {
    const variant = catalogEntry("klondike").options.find(
      (option) => option.id === "variant",
    )!;

    expect(optionRule({ variant: 99 }, variant)).toBe(KlondikeVariant.KLONDIKE);
  });
});
