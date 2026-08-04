import { vi } from "vitest";
import { GameState } from "@/engine/tableau/game_state";
import type { PlayableGame } from "@/engine/tableau/playable_game";

/** The starting readings of a mock game. */
export interface MockGameModelOverrides {
  score?: number;
  moves?: number;
  undoDepth?: number;
}

/**
 * A stand-in for a dealt game, exposing the live state the UI follows.
 *
 * Holds a real {@link GameState} rather than stubbed streams, so a spec sets a
 * score or a move count the way the game itself does — `state.score = 350` —
 * and the publishing behaviour under test is the real one.
 */
export function createMockGameModel(overrides: MockGameModelOverrides = {}) {
  /** Listeners registered by whoever is following this game. */
  const listeners = new Map<string, Set<() => void>>();

  const state = new GameState();
  state.score = overrides.score ?? 0;
  state.moves = overrides.moves ?? 0;
  state.undoDepth = overrides.undoDepth ?? 0;

  return {
    state,

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
