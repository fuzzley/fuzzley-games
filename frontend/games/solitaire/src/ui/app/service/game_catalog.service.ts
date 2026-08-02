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

/** The chosen rule options for every game, by game id. */
type StoredOptions = Record<string, GameOptionValues>;

/**
 * Owns which game is on the table, and the dealt session of it.
 *
 * A signal rather than a one-shot injection token because the choice can change
 * while the application is running: picking a different game deals a new one
 * and everything downstream — the header's score, the board on the canvas —
 * follows the signal to it.
 *
 * The choice is a route, so a game is linkable and the back button moves
 * between games rather than out of the application. This used to be done by
 * hand — a constructor assigning `location.hash` and a `hashchange` listener
 * reading it back — which meant every spec that touched the catalog had to
 * reset the fragment first.
 */
@Injectable({ providedIn: "root" })
export class GameCatalogService {
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);

  /** Every game that can be played, in the order they are offered. */
  readonly games: readonly CatalogEntry[] = GAME_CATALOG;

  /**
   * The game to open on when the URL names none.
   *
   * The last game played, and otherwise the first in the catalog. Read by the
   * empty-path redirect in the route table, which is where "the URL names
   * none" is decided.
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

  /**
   * The declaration of one rule of the game on the table.
   *
   * @param optionId The id of the option to look up.
   */
  optionSpec(optionId: string): GameOptionSpec | undefined {
    return this.options().find((option) => option.id === optionId);
  }

  /**
   * The chosen value of one option of the game on the table, or its default.
   *
   * @param optionId The id of the option to read.
   */
  valueOf(optionId: string): number | null {
    const spec = this.optionSpec(optionId);
    return spec ? optionValue(this.optionValues(), spec) : null;
  }

  /**
   * Plays the current game by a different rule, dealt afresh.
   *
   * Changing a rule always deals a new game rather than trying to adapt the
   * one in progress. Some of them could not be adapted anyway — changing
   * Spider's suit count changes which 104 cards exist — and a board halfway
   * through under different rules is not a position anyone asked for.
   *
   * @param optionId The id of the option to set.
   * @param value The value to set it to.
   */
  setOption(optionId: string, value: number): void {
    const entry = this.selectedEntry;
    const spec = entry.options.find((option) => option.id === optionId);
    if (!spec || !spec.choices.some((choice) => choice.value === value)) {
      return;
    }
    if (optionValue(this.optionValues(), spec) === value) {
      return;
    }

    const updated: StoredOptions = {
      ...this.optionsSignal(),
      [entry.id]: {
        ...this.valuesFor(entry.id, this.optionsSignal()),
        [optionId]: value,
      },
    };
    this.optionsSignal.set(updated);
    this.storage.writeObject(OPTIONS_STORAGE_KEY, updated);
    this.sessionSignal.set(entry.create(updated[entry.id]));
  }

  /** The stored values for a game, with anything unrecognised dropped. */
  private valuesFor(gameId: string, stored: StoredOptions): GameOptionValues {
    const values = stored[gameId] ?? {};
    const cleaned: Record<string, number> = {};
    for (const spec of catalogEntry(gameId).options) {
      cleaned[spec.id] = optionValue(values, spec);
    }
    return cleaned;
  }

  constructor() {
    // Follow the URL. This is what makes the back button move between games,
    // and what puts a pasted link on the right board.
    //
    // A navigation this service started itself arrives here naming the game
    // already in play and falls straight out of `applySelection`, so there is
    // no loop to break.
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

  /** The game the current URL names, or null when it names nothing known. */
  private gameIdFromUrl(): string | null {
    const id = this.router.url.split(/[/?#]/).filter(Boolean)[0];
    return GAME_CATALOG.some((entry) => entry.id === id) ? id : null;
  }

  /** The catalog entry currently selected. */
  get selectedEntry(): CatalogEntry {
    return catalogEntry(this.selectedIdSignal());
  }

  /**
   * Puts a different game on the table, dealt and ready, and routes to it.
   *
   * Selecting the game already in play is ignored rather than dealing a fresh
   * one: choosing "Klondike" from the menu while playing Klondike should not
   * throw the game away. "New Game" is what does that.
   *
   * The board changes here rather than waiting for the navigation to land.
   * Routing is how the choice is *recorded* — linkable, and on the back stack
   * — but a player who has just clicked "Spider" should not be looking at
   * Klondike until a promise resolves.
   *
   * @param id The id of the game to play.
   */
  select(id: string): void {
    const entry = catalogEntry(id);
    if (entry.id === this.selectedIdSignal()) return;

    this.applySelection(entry.id);

    // The board is already showing the new game, so a URL that fails to
    // follow it is a broken link rather than a broken game. Reported and
    // survived, instead of surfacing as an unhandled rejection.
    this.router.navigate([entry.id]).catch((e: unknown) => {
      console.warn(`Failed to route to "${entry.id}":`, e);
    });
  }

  /**
   * Deals the named game and makes it the one on the table.
   *
   * The half of {@link select} that does not touch the URL, so a navigation
   * arriving from the back button or a pasted link does not bounce back out
   * to the router.
   */
  private applySelection(id: string): void {
    const entry = catalogEntry(id);
    if (entry.id === this.selectedIdSignal()) return;

    this.selectedIdSignal.set(entry.id);
    this.sessionSignal.set(
      entry.create(this.valuesFor(entry.id, this.optionsSignal())),
    );
    this.storage.writeString(STORAGE_KEY, entry.id);
  }
}
