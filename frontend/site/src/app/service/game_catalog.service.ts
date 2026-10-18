import { Injectable, InjectionToken, inject } from "@angular/core";
import type { Game } from "../model/game";
import {
  CATEGORIES,
  type Category,
  type CategoryId,
} from "../provider/categories";
import { GAMES, LAUNCHED } from "../provider/games";

/** Holds the games and categories a catalog answers for. */
export interface CatalogData {
  readonly categories: readonly Category[];
  readonly games: readonly Game[];
  /** The ISO date the site opened, whose first games aren't badged as new. */
  readonly launched: string;
}

/** How long a game keeps its "New" badge. */
const NEW_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/** Lowercases text and drops apostrophes, so "bakers" finds Baker’s Game. */
function fold(text: string): string {
  return text.toLowerCase().replace(/['’]/g, "");
}

/** The data the catalog answers for: the site's own, unless a spec's. */
export const CATALOG_DATA = new InjectionToken<CatalogData>("CATALOG_DATA", {
  providedIn: "root",
  factory: () => ({ categories: CATEGORIES, games: GAMES, launched: LAUNCHED }),
});

/**
 * Answers for the games the site lists: finds them, groups them, searches
 * them and says which are new.
 */
@Injectable({ providedIn: "root" })
export class GameCatalog {
  private readonly data = inject(CATALOG_DATA);
  readonly categories = this.data.categories;
  readonly games = this.data.games;
  /** Each game's name, category, blurb and aliases, folded for searching. */
  private readonly searchText: ReadonlyMap<Game, string> = new Map(
    this.games.map((game) => [
      game,
      fold(
        [
          game.name,
          this.categoryOf(game).name,
          game.blurb,
          ...(game.aliases ?? []),
        ].join(" "),
      ),
    ]),
  );

  /** Returns the game a slug names, if there is one. */
  findGame(slug: string): Game | undefined {
    return this.games.find((game) => game.slug === slug);
  }

  /** Returns the category an id names, if there is one. */
  findCategory(id: string): Category | undefined {
    return this.categories.find((category) => category.id === id);
  }

  /** Returns the category a game is listed in. */
  categoryOf(game: Game): Category {
    const category = this.findCategory(game.category);
    if (!category) {
      throw new Error(`${game.slug} is in "${game.category}", not a category.`);
    }
    return category;
  }

  /** Returns a category's games, in the catalog's order. */
  gamesIn(id: CategoryId): readonly Game[] {
    return this.games.filter((game) => game.category === id);
  }

  /**
   * Returns a test for whether a game matches a search: every word of the
   * query has to appear in its name, category, blurb or an alias.
   */
  matcher(query: string): (game: Game) => boolean {
    const words = fold(query).split(/\s+/).filter(Boolean);
    return (game) => {
      const text = this.searchText.get(game) ?? "";
      return words.every((word) => text.includes(word));
    };
  }

  /** Returns whether a hosted game went up recently, after the site opened. */
  isNew(game: Game, now = new Date()): boolean {
    if (!game.play || game.added <= this.data.launched) return false;
    const ageMs = now.getTime() - new Date(game.added).getTime();
    return ageMs >= 0 && ageMs < NEW_FOR_MS;
  }
}
