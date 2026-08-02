import { vi } from "vitest";
import { BehaviorSubject } from "rxjs";
import type { PlayableGame } from "@/engine/tableau/playable_game";

/** The starting readings of a mock game. */
export interface MockGameModelOverrides {
  score?: number;
  moves?: number;
  undoDepth?: number;
}

/**
 * A stand-in for a dealt game, exposing the observable state the UI follows.
 *
 * Holds real BehaviorSubjects rather than stubs so a spec can push a score or
 * a move count and watch it arrive, which is how the UI actually receives
 * them.
 */
export function createMockGameModel(overrides: MockGameModelOverrides = {}) {
  /** Listeners registered by whoever is following this game. */
  const listeners = new Map<string, Set<() => void>>();

  return {
    state: {
      score$: new BehaviorSubject<number>(overrides.score ?? 0),
      moves$: new BehaviorSubject<number>(overrides.moves ?? 0),
      undoDepth$: new BehaviorSubject<number>(overrides.undoDepth ?? 0),
      get score() {
        return this.score$.value;
      },
      get moves() {
        return this.moves$.value;
      },
      get undoDepth() {
        return this.undoDepth$.value;
      },
    },

    on(event: string, callback: () => void) {
      const set = listeners.get(event) ?? new Set<() => void>();
      set.add(callback);
      listeners.set(event, set);
    },

    off(event: string, callback: () => void) {
      listeners.get(event)?.delete(callback);
    },

    /**
     * Raises an event as the real game would.
     *
     * Lets a spec win a game by the route the application uses, rather than by
     * reaching past it and setting a flag.
     */
    emit(event: string) {
      listeners.get(event)?.forEach((callback) => callback());
    },

    startNewGame: vi.fn(),
    restartGame: vi.fn(),
    undo: vi.fn(),
  };
}

export type MockGameModel = ReturnType<typeof createMockGameModel>;

/**
 * The mock as the game type the catalog session holds.
 *
 * No cast: the mock implements {@link PlayableGame} structurally, and this
 * signature is what checks that it still does. If the interface grows a member
 * the mock lacks, this fails to compile rather than the mock quietly diverging
 * from the thing it stands in for.
 */
export function asGameModel(mock: MockGameModel): PlayableGame {
  return mock;
}
