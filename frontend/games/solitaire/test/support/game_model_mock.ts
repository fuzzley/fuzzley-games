import { vi } from "vitest";
import { signal } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import type { SolitaireGame } from "@/games/klondike/solitaire_game";
import type { PresentationSettingsService } from "@/ui/app/service/presentation_settings.service";
import type { GameCatalogService } from "@/ui/app/service/game_catalog.service";

export interface MockGameModelOverrides {
  score?: number;
  moves?: number;
  undoDepth?: number;
  drawCount?: 1 | 3;
  almostWin?: boolean;
}

/**
 * Builds a mock SolitaireGame with observable state/settings matching the real
 * API, for overriding the GAME_MODEL token in UI-layer specs.
 */
export function createMockGameModel(overrides: MockGameModelOverrides = {}) {
  return {
    state: {
      score$: new BehaviorSubject<number>(overrides.score ?? 0),
      moves$: new BehaviorSubject<number>(overrides.moves ?? 0),
      undoDepth$: new BehaviorSubject<number>(overrides.undoDepth ?? 0),
      get score() {
        return this.score$.value;
      },
      set score(v: number) {
        this.score$.next(v);
      },
      get moves() {
        return this.moves$.value;
      },
      set moves(v: number) {
        this.moves$.next(v);
      },
      get undoDepth() {
        return this.undoDepth$.value;
      },
      set undoDepth(v: number) {
        this.undoDepth$.next(v);
      },
    },
    settings: {
      drawCount$: new BehaviorSubject<1 | 3>(overrides.drawCount ?? 3),
      debug: {
        almostWin$: new BehaviorSubject<boolean>(overrides.almostWin ?? false),
        get almostWin() {
          return this.almostWin$.value;
        },
        setAlmostWin: vi.fn(),
      },
      get drawCount() {
        return this.drawCount$.value;
      },
      setDrawCount: vi.fn(),
    },
    on: vi.fn(),
    off: vi.fn(),
    startNewGame: vi.fn(),
    restartGame: vi.fn(),
    undo: vi.fn(),
  };
}

export type MockGameModel = ReturnType<typeof createMockGameModel>;

/**
 * A mock of the presentation settings, which are no longer part of any game.
 *
 * Separate from the game mock because the split is the point: a card back and a
 * felt colour outlive whichever game is being played.
 */
export function createMockPresentation(
  overrides: {
    cardBackStyle?: "card-back-blue" | "card-back-red";
    backgroundColor?: string;
  } = {},
) {
  return {
    cardBackStyle$: new BehaviorSubject<"card-back-blue" | "card-back-red">(
      overrides.cardBackStyle ?? "card-back-blue",
    ),
    backgroundColor$: new BehaviorSubject<string | undefined>(
      overrides.backgroundColor,
    ),
    get cardBackStyle() {
      return this.cardBackStyle$.value;
    },
    get backgroundColor() {
      return this.backgroundColor$.value;
    },
    cardBackKey: vi.fn(() => "card-back-blue"),
    onBackgroundColor: vi.fn(() => () => undefined),
    setCardBackStyle: vi.fn(),
    setBackgroundColor: vi.fn(),
  };
}

export type MockPresentation = ReturnType<typeof createMockPresentation>;

/** Casts the mock to the service type the UI injects. */
export function asPresentation(
  mock: MockPresentation,
): PresentationSettingsService {
  return mock as unknown as PresentationSettingsService;
}

/** Casts the mock to the SolitaireGame type expected by the GAME_MODEL token. */
export function asGameModel(mock: MockGameModel): SolitaireGame {
  return mock as unknown as SolitaireGame;
}

/**
 * A mock {@link GameCatalogService} holding one game, for specs that only care
 * that the session service is bridged to *a* game rather than that it can swap.
 *
 * The rule options mirror Klondike's — a draw mode and a debug board — since
 * that is the game whose controls the shell specs exercise. `select` records
 * the request without dealing anything.
 */
export function createMockCatalog(model: MockGameModel) {
  const ruleOptions = {
    drawCount: {
      options: [1, 3] as readonly number[],
      current: () => model.settings.drawCount,
      set: (count: number): void => {
        model.settings.setDrawCount(count);
      },
      subscribe: (listener: (count: number) => void) => {
        const sub = model.settings.drawCount$.subscribe(listener);
        return (): void => {
          sub.unsubscribe();
        };
      },
    },
    almostWin: {
      current: () => model.settings.debug.almostWin,
      set: (enabled: boolean): void => {
        model.settings.debug.setAlmostWin(enabled);
      },
      subscribe: (listener: (enabled: boolean) => void) => {
        const sub = model.settings.debug.almostWin$.subscribe(listener);
        return (): void => {
          sub.unsubscribe();
        };
      },
    },
  };

  const selectedId = signal("klondike");
  const session = signal({ game: model, ruleOptions });

  return {
    games: [
      { id: "klondike", name: "Klondike" },
      { id: "freecell", name: "FreeCell" },
    ],
    selectedId,
    session,
    select: vi.fn((id: string) => {
      selectedId.set(id);
    }),
  };
}

export type MockCatalog = ReturnType<typeof createMockCatalog>;

/** Casts the mock to the service type the UI injects. */
export function asCatalog(mock: MockCatalog): GameCatalogService {
  return mock as unknown as GameCatalogService;
}
