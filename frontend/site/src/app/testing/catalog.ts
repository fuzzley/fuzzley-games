import type { Provider } from "@angular/core";
import type { Game, PlayerCount } from "../model/game";
import { CATEGORIES } from "../provider/categories";
import {
  CATALOG_DATA,
  type CatalogData,
} from "../service/game_catalog.service";

const SOLO: PlayerCount = { min: 1, max: 1 };

/**
 * A small catalog for specs, so they read the games they assert on rather
 * than the ones the site happens to list.
 */
export const TEST_CATALOG: CatalogData = {
  categories: CATEGORIES,
  launched: "2026-10-17",
  games: [
    {
      slug: "klondike",
      name: "Klondike",
      category: "solitaire",
      blurb: "Turn the stock, build down in alternating colors.",
      aliases: ["Whitehead"],
      players: SOLO,
      minutes: 5,
      added: "2026-10-17",
      play: { build: "solitaire", id: "klondike" },
    },
    {
      slug: "bakers-game",
      name: "Baker’s Game",
      category: "solitaire",
      blurb: "Columns build down in a single suit.",
      players: SOLO,
      minutes: 8,
      added: "2026-10-17",
      play: { build: "solitaire", id: "bakers" },
    },
    {
      slug: "minesweeper",
      name: "Minesweeper",
      category: "classics",
      blurb: "Clear the field using the numbers.",
      players: SOLO,
      minutes: 5,
      added: "2026-10-17",
      play: { build: "minesweeper" },
    },
    {
      slug: "reversi",
      name: "Reversi",
      category: "classics",
      blurb: "Flank your opponent’s discs to flip them.",
      players: { min: 2, max: 2 },
      minutes: 10,
      added: "2026-10-11",
    },
  ],
};

/** Provides a catalog of the given data in place of the site's own. */
export function provideTestCatalog(data = TEST_CATALOG): Provider {
  return { provide: CATALOG_DATA, useValue: data };
}

/** Returns one of TEST_CATALOG's games. */
export function testGame(slug: string): Game {
  const game = TEST_CATALOG.games.find((candidate) => candidate.slug === slug);
  if (!game) throw new Error(`TEST_CATALOG has no game "${slug}".`);
  return game;
}
