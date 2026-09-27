import { Injectable, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";
import {
  CatalogEntry,
  CatalogSession,
  GAME_CATALOG,
  GameOptionSpec,
  GameOptionValues,
  catalogEntry,
  optionValue,
} from "../provider/game_catalog";
import { LocalStorageService } from "./local_storage.service";

const STORAGE_KEY = "fsolitaire-game";
const OPTIONS_STORAGE_KEY = "fsolitaire-game-options";

/** Maps each game id to the rule options chosen for it. */
type StoredOptions = Record<string, GameOptionValues>;

/**
 * Owns which game is on the table, and the dealt session of it.
 *
 * The choice is also a route, so a game is linkable and the back button moves
 * between games.
 */
@Injectable({ providedIn: "root" })
export class GameCatalogService {
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);

  /** Every game that can be played, in the order they are offered. */
  readonly games: readonly CatalogEntry[] = GAME_CATALOG;

  /**
   * The game to open on when the URL names none: the last one played, or else
   * the first in the catalog.
   */
  readonly initialGameId = catalogEntry(this.storage.readString(STORAGE_KEY))
    .id;

  private readonly selectedIdSignal = signal<string>(this.initialGameId);

  /** The id of the game currently on the table. */
  readonly selectedId = this.selectedIdSignal.asReadonly();

  /** Every game's chosen rule options, whether or not it is in play. */
  private readonly optionsSignal = signal<StoredOptions>(
    this.storage.readObject<StoredOptions>(OPTIONS_STORAGE_KEY) ?? {},
  );

  private readonly sessionSignal = signal<CatalogSession>(
    catalogEntry(this.initialGameId).create(
      this.optionsSignal()[this.initialGameId] ?? {},
    ),
  );

  /** The dealt game currently on the table. */
  readonly session = this.sessionSignal.asReadonly();

  /** The rules the game on the table lets the player choose. */
  readonly options = computed<readonly GameOptionSpec[]>(
    () => catalogEntry(this.selectedIdSignal()).options,
  );

  /** The rules a player picks, for the settings panel. */
  readonly ruleOptions = computed<readonly GameOptionSpec[]>(() =>
    this.options().filter((option) => !option.debugOnly),
  );

  /** The development-only rules, which the debug panel shows separately. */
  readonly debugOptions = computed<readonly GameOptionSpec[]>(() =>
    this.options().filter((option) => option.debugOnly),
  );

  /** The chosen value of every option of the game on the table. */
  readonly optionValues = computed<GameOptionValues>(() =>
    this.valuesFor(this.selectedIdSignal(), this.optionsSignal()),
  );

  /** Returns the declaration of one rule of the game on the table. */
  optionSpec(optionId: string): GameOptionSpec | undefined {
    return this.options().find((option) => option.id === optionId);
  }

  /** Returns the value chosen for a rule of the game on the table. */
  valueOf(optionId: string): number | null {
    const spec = this.optionSpec(optionId);
    return spec ? optionValue(this.optionValues(), spec) : null;
  }

  /** Plays the current game by a different rule, dealt afresh. */
  setOption(optionId: string, value: number): void {
    const entry = this.selectedEntry;
    const spec = entry.options.find((option) => option.id === optionId);
    if (!spec || !spec.choices.some((choice) => choice.value === value)) {
      return;
    }
    if (optionValue(this.optionValues(), spec) === value) {
      return;
    }

    this.storeOptions(entry, { [optionId]: value });
    this.deal(entry);
  }

  /**
   * Puts the named game on the table by the given rules and routes to it,
   * dealing once however many rules change.
   *
   * Rules it does not name keep their chosen values, and a value the game does
   * not offer falls back to the default. The game already on the table, by the
   * same rules, is left alone.
   */
  load(id: string, values: GameOptionValues): void {
    const entry = catalogEntry(id);
    const switching = entry.id !== this.selectedIdSignal();
    const before = this.valuesFor(entry.id, this.optionsSignal());
    this.storeOptions(entry, values);
    const after = this.valuesFor(entry.id, this.optionsSignal());
    const sameRules = entry.options.every(
      (spec) => before[spec.id] === after[spec.id],
    );
    if (!switching && sameRules) return;

    this.deal(entry);
    if (switching) this.route(entry.id);
  }

  /** Records rule values for a game, keeping those it does not name. */
  private storeOptions(entry: CatalogEntry, values: GameOptionValues): void {
    const stored = this.optionsSignal();
    const merged = {
      ...stored,
      [entry.id]: { ...stored[entry.id], ...values },
    };
    const updated: StoredOptions = {
      ...stored,
      [entry.id]: this.valuesFor(entry.id, merged),
    };
    this.optionsSignal.set(updated);
    this.storage.writeObject(OPTIONS_STORAGE_KEY, updated);
  }

  /** Deals a game onto the table by its chosen rules, and remembers it. */
  private deal(entry: CatalogEntry): void {
    this.selectedIdSignal.set(entry.id);
    this.sessionSignal.set(
      entry.create(this.valuesFor(entry.id, this.optionsSignal())),
    );
    this.storage.writeString(STORAGE_KEY, entry.id);
  }

  /** Returns the stored values for a game, dropping anything unrecognised. */
  private valuesFor(gameId: string, stored: StoredOptions): GameOptionValues {
    const values = stored[gameId] ?? {};
    const cleaned: Record<string, number> = {};
    for (const spec of catalogEntry(gameId).options) {
      cleaned[spec.id] = optionValue(values, spec);
    }
    return cleaned;
  }

  constructor() {
    // Follow the URL, so the back button and pasted links choose the game. A
    // navigation this service started names the game already in play, which
    // `applySelection` ignores, and the route's guard has already confirmed
    // any other that would throw away a game under way.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const id = this.gameIdFromUrl();
        if (id) this.applySelection(id);
      });
  }

  /** Returns the game the current URL names, or null if it names none. */
  private gameIdFromUrl(): string | null {
    const [id] = this.router.url.split(/[/?#]/).filter(Boolean);
    return id !== undefined && GAME_CATALOG.some((entry) => entry.id === id)
      ? id
      : null;
  }

  /** The catalog entry currently selected. */
  get selectedEntry(): CatalogEntry {
    return catalogEntry(this.selectedIdSignal());
  }

  /**
   * Deals a different game onto the table and routes to it, ignoring the game
   * already in play.
   *
   * The board changes at once rather than when the navigation lands, so the
   * player never waits on the router to see the game they picked.
   */
  select(id: string): void {
    const entry = catalogEntry(id);
    if (entry.id === this.selectedIdSignal()) return;

    this.applySelection(entry.id);
    this.route(entry.id);
  }

  /** Records the game on the table in the URL. */
  private route(id: string): void {
    // The board already shows the game, so a failed navigation is only logged.
    this.router.navigate([id]).catch((e: unknown) => {
      console.warn(`Failed to route to "${id}":`, e);
    });
  }

  /**
   * Deals the named game onto the table without touching the URL, for a
   * navigation that has already happened.
   */
  private applySelection(id: string): void {
    const entry = catalogEntry(id);
    if (entry.id === this.selectedIdSignal()) return;

    this.deal(entry);
  }
}
