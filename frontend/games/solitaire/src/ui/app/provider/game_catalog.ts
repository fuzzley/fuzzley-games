import { InjectionToken } from "@angular/core";
import { GameRuleOptions, PlayableGame } from "@/engine/tableau/playable_game";
import { SolitaireGame } from "@/games/klondike/solitaire_game";
import { FreeCellGame } from "@/games/freecell/freecell_game";

/** A game the application can put on the table. */
export interface CatalogEntry {
  /** Stable id, also the URL hash that selects it. */
  readonly id: string;
  /** Name shown to a player. */
  readonly name: string;
  /** Creates a dealt game and says what options it offers. */
  create(): CatalogSession;
}

/** A dealt game and whatever rule options it offers. */
export interface CatalogSession {
  readonly game: PlayableGame;
  readonly ruleOptions: GameRuleOptions;
}

/**
 * Every game the engine can currently put on the table.
 *
 * An entry is: make the game, deal it, and say what options it offers. How to
 * draw it lives in board_catalog, which is what keeps Phaser out of everything
 * that only wants to know what is being played.
 */
export const GAME_CATALOG: readonly CatalogEntry[] = [
  {
    id: "klondike",
    name: "Klondike",
    create: () => {
      const game = new SolitaireGame();
      game.startNewGame();
      return {
        game,
        ruleOptions: {
          drawCount: {
            options: [1, 3],
            current: () => game.settings.drawCount,
            set: (count) => game.settings.setDrawCount(count === 1 ? 1 : 3),
            subscribe: (listener) => {
              const sub = game.settings.drawCount$.subscribe(listener);
              return () => sub.unsubscribe();
            },
          },
          almostWin: {
            current: () => game.settings.debug.almostWin,
            set: (enabled) => game.settings.debug.setAlmostWin(enabled),
            subscribe: (listener) => {
              const sub = game.settings.debug.almostWin$.subscribe(listener);
              return () => sub.unsubscribe();
            },
          },
        },
      };
    },
  },
  {
    id: "freecell",
    name: "FreeCell",
    create: () => {
      const game = new FreeCellGame();
      game.startNewGame();
      return {
        game,
        // FreeCell offers no rule options at all: no draw mode, no stock.
        ruleOptions: {},
      };
    },
  },
];

/** The catalog entry with the given id, or the first one. */
export function catalogEntry(id: string | null | undefined): CatalogEntry {
  return GAME_CATALOG.find((entry) => entry.id === id) ?? GAME_CATALOG[0];
}

/** The game the application should start on, chosen by URL hash. */
export const SELECTED_GAME = new InjectionToken<CatalogEntry>("SELECTED_GAME", {
  providedIn: "root",
  factory: () =>
    catalogEntry(
      typeof location === "undefined" ? null : location.hash.replace(/^#/, ""),
    ),
});
