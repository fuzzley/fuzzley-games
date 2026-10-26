import { Injectable, effect, inject, signal, untracked } from "@angular/core";
import {
  readList,
  readNumber,
  readObject,
  readRecord,
  readString,
} from "@/engine/core/common/json_reader";
import {
  type GameOptionValues,
  sameOptionValues,
} from "../provider/game_catalog";
import { GameCatalogService } from "./game_catalog.service";
import { LocalStorageService } from "@fz/ui/storage";

const STORAGE_KEY = "fsolitaire-recent-games";
const STORAGE_VERSION = 1;

/** How many games are remembered. */
const REMEMBERED = 8;

/** Names a game played recently, by the rules it was played by. */
export interface RecentGame {
  readonly gameId: string;
  readonly values: GameOptionValues;
}

/**
 * Remembers the games played most recently, newest first, each by the rules it
 * was played by.
 *
 * A game is remembered once it is dealt, whether or not a card is moved.
 */
@Injectable({ providedIn: "root" })
export class RecentGamesService {
  private readonly storage = inject(LocalStorageService);
  private readonly catalog = inject(GameCatalogService);

  private readonly recent = signal<readonly RecentGame[]>(this.read());

  /** The games played most recently, newest first. */
  readonly games = this.recent.asReadonly();

  constructor() {
    effect(() => {
      const played: RecentGame = {
        gameId: this.catalog.selectedId(),
        values: this.catalog.optionValues(),
      };
      untracked(() => {
        this.remember(played);
      });
    });
  }

  /** Puts a game first, dropping any earlier record of it by the same rules. */
  private remember(played: RecentGame): void {
    const recent = this.recent();
    if (recent[0] && isSame(recent[0], played)) return;

    const others = recent.filter((game) => !isSame(game, played));
    const updated = [played, ...others].slice(0, REMEMBERED);
    this.recent.set(updated);
    this.storage.writeVersioned(STORAGE_KEY, STORAGE_VERSION, {
      games: updated,
    });
  }

  /** Reads the stored games, dropping any the catalog no longer has. */
  private read(): RecentGame[] {
    const stored = this.readStored();
    if (stored === null) return [];
    try {
      return readList(stored, "recent", readRecentGame).filter((game) =>
        this.catalog.games.some((entry) => entry.id === game.gameId),
      );
    } catch (e) {
      console.warn("The recent games are malformed:", e);
      return [];
    }
  }

  /**
   * Returns the stored list, unchecked, or null when there is none of this
   * version or the bare one builds before versions stored.
   */
  private readStored(): unknown {
    const saved = this.storage.readVersioned(STORAGE_KEY, STORAGE_VERSION);
    if (saved) return saved["games"];
    const earlier = this.storage.readObject(STORAGE_KEY);
    return Array.isArray(earlier) ? earlier : null;
  }
}

/** Returns whether two records name the same game by the same rules. */
function isSame(a: RecentGame, b: RecentGame): boolean {
  return a.gameId === b.gameId && sameOptionValues(a.values, b.values);
}

/** Reads one stored record of a recent game. */
function readRecentGame(value: unknown, path: string): RecentGame {
  const game = readObject(value, path);
  return {
    gameId: readString(game["gameId"], `${path}.gameId`),
    values: readRecord(game["values"], `${path}.values`, readNumber),
  };
}
